import { getConnectedAiReadonlyPool } from "@/lib/db/postgres";
import {
  buildPegawaiCountQuery,
  buildRoleScope,
  extractPegawaiFilters,
  sanitizeSearchKeyword
} from "@/lib/aiSafePegawaiQuery";
import { writeAiQueryLog } from "@/lib/aiQueryLogger";
import { checkN8nSecret } from "@/lib/n8n-ai/security";

export const runtime = "nodejs";

function toolResponse(payload, status = 200) {
  return Response.json(payload, { status });
}

function compactQuestion(body = {}) {
  return sanitizeSearchKeyword(
    body.question ||
    body.message ||
    [body.status_pegawai, body.ukpd, body.wilayah, body.group_by].filter(Boolean).join(" "),
    { maxLength: 300 }
  );
}

function detectGroupBy(body = {}) {
  if (body.group_by) return body.group_by;
  const question = compactQuestion(body).toLowerCase();
  if (/\b(per|berdasarkan)\s+(status|jenis pegawai|kategori)\b/.test(question)) return "status_pegawai";
  if (/\b(per|berdasarkan)\s+ukpd\b/.test(question)) return "ukpd";
  if (/\b(per|berdasarkan)\s+wilayah\b/.test(question)) return "wilayah";
  if (/\b(per|berdasarkan)\s+jabatan\b/.test(question)) return "nama_jabatan";
  if (/\b(per|berdasarkan)\s+pendidikan\b/.test(question)) return "pendidikan";
  if (/\b(per|berdasarkan)\s+rumpun\b/.test(question)) return "rumpun";
  return "";
}

async function logToolQuery(body, question, generatedQuery, status) {
  await writeAiQueryLog({
    user_id: body.user?.id || null,
    role: body.user?.role || null,
    question,
    generated_query: generatedQuery,
    query_status: status
  });
}

export async function POST(request) {
  if (!checkN8nSecret(request)) {
    return toolResponse({ error: "Forbidden" }, 403);
  }

  const body = await request.json().catch(() => ({}));
  const question = compactQuestion(body) || "hitung pegawai";
  const filters = extractPegawaiFilters(question, {
    status_pegawai: body.status_pegawai || "",
    ukpd: body.ukpd || "",
    wilayah: body.wilayah || "",
    nama_jabatan: body.jabatan || body.nama_jabatan || "",
    jenis_kelamin: body.jenis_kelamin || "",
    pendidikan: body.pendidikan || "",
    rumpun: body.rumpun || ""
  });

  let generatedQuery = "";
  try {
    const query = buildPegawaiCountQuery({
      currentUser: body.user || {},
      filters,
      groupBy: detectGroupBy(body),
      limit: body.limit
    });
    generatedQuery = query.sql;

    const pool = await getConnectedAiReadonlyPool();
    const [rows] = await pool.query(query.sql, query.params);
    await logToolQuery(body, question, generatedQuery, "success");

    const total = query.group_by
      ? rows.reduce((sum, row) => sum + Number(row.total || 0), 0)
      : Number(rows[0]?.total || 0);

    return toolResponse({
      source: "database",
      tool: "employee-count",
      total,
      data: rows,
      filter: {
        ...filters,
        ...buildRoleScope(body.user || {})
      },
      fuzzy_candidates: {},
      selected_candidate: filters,
      confidence_score: 1,
      group_by: query.group_by,
      generated_query: query.sql
    });
  } catch (error) {
    const status = /^Security violation:/i.test(error.message || "") ? 403 : 500;
    await logToolQuery(body, question, generatedQuery, status === 403 ? "blocked" : "failed");
    return toolResponse({ error: error.message || "Gagal menghitung pegawai." }, status);
  }
}
