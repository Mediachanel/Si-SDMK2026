import { getConnectedAiReadonlyPool } from "@/lib/db/postgres";
import {
  buildPegawaiSearchQuery,
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
    body.query ||
    [body.nama, body.jabatan, body.ukpd, body.wilayah, body.status_pegawai].filter(Boolean).join(" "),
    { maxLength: 300 }
  );
}

function filtersFromBody(body = {}) {
  return {
    ...extractPegawaiFilters(compactQuestion(body), {
      nama: body.nama || "",
      nama_jabatan: body.nama_jabatan || body.jabatan || "",
      ukpd: body.ukpd || "",
      wilayah: body.wilayah || "",
      status_pegawai: body.status_pegawai || "",
      jenis_kelamin: body.jenis_kelamin || "",
      pendidikan: body.pendidikan || "",
      rumpun: body.rumpun || ""
    })
  };
}

function mapEmployee(row) {
  return {
    id: row.id,
    id_pegawai: row.id,
    nama: row.nama,
    nip: row.nip,
    nrk: row.nrk,
    status_pegawai: row.status_pegawai,
    jenis_pegawai: row.status_pegawai,
    jabatan: row.nama_jabatan,
    nama_jabatan: row.nama_jabatan,
    nama_ukpd: row.ukpd,
    ukpd: row.ukpd,
    wilayah: row.wilayah,
    jenis_kelamin: row.jenis_kelamin,
    pendidikan: row.pendidikan,
    rumpun: row.rumpun,
    created_at: row.created_at,
    updated_at: row.updated_at,
    score: 1
  };
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
  const question = compactQuestion(body);

  if (!question) {
    return toolResponse({
      source: "database",
      tool: "search-employee",
      data: [],
      candidates: [],
      fuzzy_candidates: [],
      selected_candidate: null,
      confidence_score: 0
    });
  }

  let generatedQuery = "";
  try {
    const query = buildPegawaiSearchQuery({
      currentUser: body.user || {},
      filters: filtersFromBody(body),
      keyword: question,
      limit: body.limit
    });
    generatedQuery = query.sql;

    const pool = await getConnectedAiReadonlyPool();
    const [rows] = await pool.query(query.sql, query.params);
    const employees = rows.map(mapEmployee);
    await logToolQuery(body, question, generatedQuery, "success");

    return toolResponse({
      source: "database",
      tool: "search-employee",
      data: employees,
      candidates: employees,
      fuzzy_candidates: {
        nama: employees.map((item) => ({ value: item.nama, id: item.id_pegawai, score: item.score }))
      },
      selected_candidate: employees[0] || null,
      selected_filters: filtersFromBody(body),
      confidence_score: employees.length ? 1 : 0,
      requires_clarification: false,
      not_found: employees.length === 0,
      generated_query: query.sql
    });
  } catch (error) {
    const status = /^Security violation:/i.test(error.message || "") ? 403 : 500;
    await logToolQuery(body, question, generatedQuery, status === 403 ? "blocked" : "failed");
    return toolResponse({ error: error.message || "Gagal mencari pegawai." }, status);
  }
}
