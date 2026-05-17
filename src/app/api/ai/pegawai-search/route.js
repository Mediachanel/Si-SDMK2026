import { requireAuth } from "@/lib/auth/requireAuth";
import { ROLES } from "@/lib/constants/roles";
import { getConnectedAiReadonlyPool } from "@/lib/db/postgres";
import { fail, ok } from "@/lib/helpers/response";
import {
  AI_PEGAWAI_N8N_ALLOWED_COLUMNS,
  AI_PEGAWAI_TABLE,
  buildPegawaiCountQuery,
  buildPegawaiSearchQuery,
  buildRoleScope,
  detectPegawaiIntent,
  extractPegawaiFilters,
  getAiMaxRows,
  getAiQueryTimeoutMs,
  sanitizeSearchKeyword
} from "@/lib/aiSafePegawaiQuery";
import { writeAiQueryLog } from "@/lib/aiQueryLogger";
import { enforceRateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

const ALLOWED_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD, ROLES.USER];
const OUT_OF_SCOPE_MESSAGE = "Maaf, data tersebut berada di luar kewenangan akses Anda.";

function numberEnv(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isDifferentScope(requested, owned) {
  const asked = normalizeText(requested);
  const scoped = normalizeText(owned);
  if (!asked || !scoped) return false;
  return asked !== scoped && !scoped.includes(asked) && !asked.includes(scoped);
}

function isOutsideRoleScope(filters, roleScope) {
  if (roleScope.role === ROLES.ADMIN_WILAYAH && filters.wilayah) {
    return isDifferentScope(filters.wilayah, roleScope.wilayah);
  }

  if (roleScope.role === ROLES.ADMIN_UKPD && filters.ukpd) {
    return isDifferentScope(filters.ukpd, roleScope.ukpd);
  }

  return false;
}

function detectCountGroupBy(question, explicitGroupBy) {
  if (explicitGroupBy) return explicitGroupBy;
  const lower = normalizeText(question);
  if (/\b(per|berdasarkan)\s+(status|jenis pegawai|kategori)\b/.test(lower)) return "status_pegawai";
  if (/\b(per|berdasarkan)\s+ukpd\b/.test(lower)) return "ukpd";
  if (/\b(per|berdasarkan)\s+wilayah\b/.test(lower)) return "wilayah";
  if (/\b(per|berdasarkan)\s+jabatan\b/.test(lower)) return "nama_jabatan";
  if (/\b(per|berdasarkan)\s+(pendidikan|jenjang pendidikan)\b/.test(lower)) return "pendidikan";
  if (/\b(per|berdasarkan)\s+rumpun\b/.test(lower)) return "rumpun";
  return "";
}

async function runWithTimeout(promise, timeoutMs) {
  let timeout = null;
  const guard = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error("AI query timeout.")), timeoutMs);
  });

  try {
    return await Promise.race([promise, guard]);
  } finally {
    clearTimeout(timeout);
  }
}

function formatPegawaiRow(row) {
  return [
    row.nama || "-",
    row.nama_jabatan || "-",
    row.ukpd || "-",
    row.wilayah || "-"
  ].join(" | ");
}

function buildSearchAnswer(rows) {
  if (!rows.length) return "Data pegawai tidak ditemukan dalam scope akses Anda.";
  const preview = rows.slice(0, 5).map((row, index) => `${index + 1}. ${formatPegawaiRow(row)}`).join("\n");
  const suffix = rows.length > 5 ? `\nDan ${rows.length - 5} pegawai lain dalam hasil terbatas.` : "";
  return `Ditemukan ${rows.length} pegawai:\n${preview}${suffix}`;
}

function buildCountAnswer(rows, groupBy) {
  if (!groupBy) {
    const total = Number(rows[0]?.total || 0);
    return `Jumlah pegawai: ${total}.`;
  }

  if (!rows.length) return "Tidak ada data pegawai yang sesuai dalam scope akses Anda.";
  const lines = rows.slice(0, 10).map((row) => `${row.kategori || "Tidak tercatat"}: ${Number(row.total || 0)}`).join("\n");
  return `Ringkasan jumlah pegawai berdasarkan ${groupBy}:\n${lines}`;
}

async function logQuery({ user, question, generatedQuery, status }) {
  return writeAiQueryLog({
    user_id: user?.id || null,
    role: user?.role || null,
    question,
    generated_query: generatedQuery,
    query_status: status
  });
}

export async function POST(request) {
  const { user, error } = await requireAuth(ALLOWED_ROLES, request);
  if (error) return error;

  const rateLimitError = enforceRateLimit(request, {
    namespace: "ai-pegawai-search",
    limit: numberEnv("AI_RATE_LIMIT_MAX", 30, { min: 1, max: 300 }),
    windowMs: numberEnv("AI_RATE_LIMIT_WINDOW_MS", 60_000, { min: 1000, max: 3_600_000 }),
    key: user.id || user.username || user.nama_ukpd || user.role
  });
  if (rateLimitError) return rateLimitError;

  let question = "";
  let generatedQuery = "";

  try {
    const body = await request.json().catch(() => ({}));
    question = sanitizeSearchKeyword(body.question || body.message || body.prompt || "", { maxLength: 300 });
    if (!question) return fail("Pertanyaan tidak boleh kosong.", 400);

    const roleScope = buildRoleScope(user);
    const intent = detectPegawaiIntent(question, body.intent);
    const filters = extractPegawaiFilters(question, body.filters || {});

    if (isOutsideRoleScope(filters, roleScope)) {
      await logQuery({ user, question, generatedQuery: null, status: "blocked" });
      return ok({
        answer: OUT_OF_SCOPE_MESSAGE,
        intent,
        filters,
        role_scope: roleScope,
        data: [],
        allowed_table: AI_PEGAWAI_TABLE,
        allowed_columns: [...AI_PEGAWAI_N8N_ALLOWED_COLUMNS]
      }, "Akses data dibatasi sesuai role.");
    }

    const isCount = intent === "count_employee";
    const query = isCount
      ? buildPegawaiCountQuery({
        currentUser: user,
        filters,
        groupBy: detectCountGroupBy(question, body.group_by),
        limit: body.limit || getAiMaxRows()
      })
      : buildPegawaiSearchQuery({
        currentUser: user,
        filters,
        keyword: question,
        limit: body.limit || getAiMaxRows()
      });

    generatedQuery = query.sql;
    const pool = await getConnectedAiReadonlyPool();
    const [rows] = await runWithTimeout(
      pool.query(query.sql, query.params),
      getAiQueryTimeoutMs()
    );

    await logQuery({ user, question, generatedQuery, status: "success" });

    return ok({
      answer: isCount ? buildCountAnswer(rows, query.group_by) : buildSearchAnswer(rows),
      intent,
      filters,
      role_scope: query.role_scope,
      allowed_table: AI_PEGAWAI_TABLE,
      allowed_columns: [...AI_PEGAWAI_N8N_ALLOWED_COLUMNS],
      generated_query: query.sql,
      query_params_count: query.params.length,
      limit: query.limit,
      data: rows
    }, "AI Pegawai selesai memproses pertanyaan.");
  } catch (err) {
    const message = err?.message || "AI Pegawai gagal memproses pertanyaan.";
    const status = /^Security violation:/i.test(message) ? "blocked" : "failed";
    await logQuery({ user, question, generatedQuery, status });
    const httpStatus = status === "blocked" ? 403 : message === "AI query timeout." ? 504 : 500;
    return fail(status === "blocked" ? message : "AI Pegawai gagal memproses pertanyaan.", httpStatus);
  }
}
