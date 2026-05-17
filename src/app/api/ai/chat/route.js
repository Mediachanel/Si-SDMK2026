import { requireAuth } from "@/lib/auth/requireAuth";
import { validateSameOrigin } from "@/lib/auth/requestGuards";
import { ROLES } from "@/lib/constants/roles";
import { getConnectedAiReadonlyPool } from "@/lib/db/postgres";
import { fail, ok } from "@/lib/helpers/response";
import {
  AI_PEGAWAI_TABLE,
  buildN8nPegawaiPayload,
  buildPegawaiCountQuery,
  buildPegawaiSearchQuery,
  detectPegawaiIntent,
  extractPegawaiFilters,
  getAiMaxRows,
  getAiQueryTimeoutMs
} from "@/lib/aiSafePegawaiQuery";
import { writeAiQueryLog } from "@/lib/aiQueryLogger";
import { extractWorkflowLogPayload, writeAiWorkflowLog } from "@/lib/n8n-ai/audit";
import { isN8nAiEnabled, normalizeUserForWorkflow } from "@/lib/n8n-ai/security";
import { normalizeWorkflowResponse } from "@/lib/n8n-ai/response";
import { callN8nWebhook, N8nWebhookError } from "@/lib/n8n-ai/webhookClient";

export const runtime = "nodejs";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function detectCountGroupBy(question) {
  const lower = normalizeText(question);
  if (/\b(per|berdasarkan)\s+(status|jenis pegawai|kategori)\b/.test(lower)) return "status_pegawai";
  if (/\b(per|berdasarkan)\s+ukpd\b/.test(lower)) return "ukpd";
  if (/\b(per|berdasarkan)\s+wilayah\b/.test(lower)) return "wilayah";
  if (/\b(per|berdasarkan)\s+jabatan\b/.test(lower)) return "nama_jabatan";
  if (/\b(per|berdasarkan)\s+(pendidikan|jenjang pendidikan)\b/.test(lower)) return "pendidikan";
  if (/\b(per|berdasarkan)\s+rumpun\b/.test(lower)) return "rumpun";
  return "";
}

function getN8nReachableAppBaseUrl() {
  return process.env.SISDMK_APP_BASE_URL || process.env.APP_INTERNAL_URL || process.env.APP_URL || null;
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
  if (!groupBy) return `Jumlah pegawai: ${Number(rows[0]?.total || 0)}.`;
  if (!rows.length) return "Tidak ada data pegawai yang sesuai dalam scope akses Anda.";
  const lines = rows.slice(0, 10).map((row) => `${row.kategori || "Tidak tercatat"}: ${Number(row.total || 0)}`).join("\n");
  return `Ringkasan jumlah pegawai berdasarkan ${groupBy}:\n${lines}`;
}

async function internalPegawaiFallback({ user, message, reason }) {
  const intent = detectPegawaiIntent(message);
  const filters = extractPegawaiFilters(message);
  const isCount = intent === "count_employee";
  const query = isCount
    ? buildPegawaiCountQuery({
      currentUser: user,
      filters,
      groupBy: detectCountGroupBy(message),
      limit: getAiMaxRows()
    })
    : buildPegawaiSearchQuery({
      currentUser: user,
      filters,
      keyword: message,
      limit: getAiMaxRows()
    });

  const pool = await getConnectedAiReadonlyPool();
  const [rows] = await runWithTimeout(pool.query(query.sql, query.params), getAiQueryTimeoutMs());
  await writeAiQueryLog({
    user_id: user?.id || null,
    role: user?.role || null,
    question: message,
    generated_query: query.sql,
    query_status: "success"
  });

  const normalized = {
    answer: isCount ? buildCountAnswer(rows, query.group_by) : buildSearchAnswer(rows),
    source: "database",
    intent,
    entities: filters,
    tool: "ai-pegawai-safe-query-fallback",
    verification: "verified_role_scoped_database",
    confidence: rows.length ? 1 : 0,
    candidates: rows,
    selected_candidate: rows[0] || null,
    tool_result: {
      allowed_table: AI_PEGAWAI_TABLE,
      rows,
      generated_query: query.sql,
      query_params_count: query.params.length,
      fallback_reason: reason
    },
    suggestions: []
  };

  await writeAiWorkflowLog(extractWorkflowLogPayload({
    result: normalized,
    message,
    source: "internal_chat_fallback",
    user
  }));

  return normalized;
}

async function fallbackResponse({ user, message, reason }) {
  try {
    const fallback = await internalPegawaiFallback({ user, message, reason });
    return ok(fallback, "AI memakai fallback database aman.");
  } catch (error) {
    console.error("AI internal fallback error:", error);
    await writeAiWorkflowLog({
      source: "internal_chat_fallback",
      message: message || "fallback failed",
      verification: "fallback_error",
      response: error.message || "Fallback database aman gagal."
    });
    return fail("AI internal belum dapat memproses pesan. Coba lagi beberapa saat.", 500);
  }
}

export async function POST(request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const { user, error } = await requireAuth([ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD], request);
  if (error) return error;

  let message = "";

  try {
    const body = await request.json();
    message = String(body.message || "").trim();

    if (!message) {
      return fail("Pesan tidak boleh kosong", 400);
    }

    if (!isN8nAiEnabled()) {
      return fallbackResponse({ user, message, reason: "n8n_disabled" });
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const secret = process.env.N8N_API_SECRET;

    if (!webhookUrl || !secret) {
      return fallbackResponse({ user, message, reason: "n8n_not_configured" });
    }

    const workflowUser = normalizeUserForWorkflow(user);
    const pegawaiPolicyPayload = buildN8nPegawaiPayload({ question: message, currentUser: user });
    const { result, requestId, attempt } = await callN8nWebhook({
      webhookUrl,
      secret,
      source: "internal_chat",
      payload: {
        ...pegawaiPolicyPayload,
        message,
        source: "internal_chat",
        app_base_url: getN8nReachableAppBaseUrl(),
        conversation_id: body.conversation_id || body.session_id || null,
        user: workflowUser,
        client: {
          user_agent: request.headers.get("user-agent") || null
        }
      }
    });

    const normalized = normalizeWorkflowResponse(result, message);
    normalized.request_id = requestId;
    normalized.webhook_attempt = attempt;
    await writeAiWorkflowLog(extractWorkflowLogPayload({
      result: normalized,
      message,
      source: "internal_chat",
      user: workflowUser
    }));

    return ok(normalized, "AI n8n selesai memproses pesan.");
  } catch (err) {
    if (err instanceof N8nWebhookError) {
      await writeAiWorkflowLog({
        source: "internal_chat",
        message: "n8n webhook failed",
        verification: "n8n_error",
        response: err.message
      });
      return fallbackResponse({ user, message, reason: err.message });
    }

    console.error("AI n8n chat error:", err);
    return fail("Terjadi kesalahan AI workflow", 500);
  }
}
