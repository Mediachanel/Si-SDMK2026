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

function profileQuestion(body = {}) {
  return sanitizeSearchKeyword(
    body.question ||
    body.message ||
    body.query ||
    body.nama ||
    body.id_pegawai ||
    body.id ||
    "",
    { maxLength: 300 }
  );
}

function mapBasicProfile(row = {}) {
  return {
    id: row.id,
    id_pegawai: row.id,
    nama: row.nama,
    nip: row.nip,
    nrk: row.nrk,
    nama_jabatan: row.nama_jabatan,
    jabatan: row.nama_jabatan,
    ukpd: row.ukpd,
    nama_ukpd: row.ukpd,
    wilayah: row.wilayah,
    status_pegawai: row.status_pegawai,
    jenis_pegawai: row.status_pegawai,
    jenis_kelamin: row.jenis_kelamin,
    pendidikan: row.pendidikan,
    rumpun: row.rumpun,
    created_at: row.created_at,
    updated_at: row.updated_at
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
  const question = profileQuestion(body);
  if (!question) {
    return toolResponse({
      source: "database",
      tool: "employee-profile",
      message: "Masukkan id_pegawai atau nama pegawai.",
      data: null,
      available_sections: ["pegawai"]
    }, 422);
  }

  let generatedQuery = "";
  try {
    const filters = extractPegawaiFilters(question, {
      id: body.id_pegawai || body.id || "",
      nama: body.nama || ""
    });
    const query = buildPegawaiSearchQuery({
      currentUser: body.user || {},
      filters,
      keyword: question,
      limit: 5
    });
    generatedQuery = query.sql;

    const pool = await getConnectedAiReadonlyPool();
    const [rows] = await pool.query(query.sql, query.params);
    const profiles = rows.map(mapBasicProfile);
    await logToolQuery(body, question, generatedQuery, "success");

    if (!profiles.length) {
      return toolResponse({
        source: "database",
        tool: "employee-profile",
        data: null,
        candidates: [],
        not_found: true,
        confidence_score: 0,
        message: "Pegawai tidak ditemukan atau berada di luar scope role user.",
        available_sections: ["pegawai"]
      });
    }

    return toolResponse({
      source: "database",
      tool: "employee-profile",
      verification: "verified",
      employee: profiles[0],
      sections_requested: ["pegawai"],
      fields_returned: { pegawai: Object.keys(profiles[0]) },
      limit_per_section: 1,
      data: { pegawai: profiles[0] },
      candidates: profiles,
      confidence_score: 1,
      privacy: "AI Pegawai hanya mengembalikan data dasar dari tabel pegawai dan tidak membuka NIK, alamat lengkap, nomor HP, data keluarga, password/token, atau dokumen pribadi.",
      available_sections: ["pegawai"],
      generated_query: query.sql
    });
  } catch (error) {
    const status = /^Security violation:/i.test(error.message || "") ? 403 : 500;
    await logToolQuery(body, question, generatedQuery, status === 403 ? "blocked" : "failed");
    return toolResponse({ error: error.message || "Gagal mengambil profil dasar pegawai." }, status);
  }
}
