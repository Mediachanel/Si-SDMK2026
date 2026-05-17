import { getConnectedAiReadonlyPool } from "@/lib/db/postgres";
import { buildPegawaiCountQuery, buildRoleScope } from "@/lib/aiSafePegawaiQuery";
import { writeAiQueryLog } from "@/lib/aiQueryLogger";
import { checkN8nSecret } from "@/lib/n8n-ai/security";

export const runtime = "nodejs";

function toolResponse(payload, status = 200) {
  return Response.json(payload, { status });
}

async function runCount(pool, user, groupBy = "") {
  const query = buildPegawaiCountQuery({ currentUser: user || {}, groupBy });
  const [rows] = await pool.query(query.sql, query.params);
  await writeAiQueryLog({
    user_id: user?.id || null,
    role: user?.role || null,
    question: groupBy ? `dashboard-summary per ${groupBy}` : "dashboard-summary total",
    generated_query: query.sql,
    query_status: "success"
  });
  return rows;
}

export async function POST(request) {
  if (!checkN8nSecret(request)) {
    return toolResponse({ error: "Forbidden" }, 403);
  }

  const body = await request.json().catch(() => ({}));

  try {
    const pool = await getConnectedAiReadonlyPool();
    const totalRows = await runCount(pool, body.user, "");
    const byStatus = await runCount(pool, body.user, "status_pegawai");
    const byWilayah = await runCount(pool, body.user, "wilayah");
    const byUkpd = await runCount(pool, body.user, "ukpd");

    return toolResponse({
      source: "database",
      tool: "dashboard-summary",
      total: Number(totalRows[0]?.total || 0),
      by_status: byStatus.map((row) => ({ status_pegawai: row.kategori, total: Number(row.total || 0) })),
      by_wilayah: byWilayah.map((row) => ({ wilayah: row.kategori, total: Number(row.total || 0) })),
      by_ukpd: byUkpd.map((row) => ({ ukpd: row.kategori, total: Number(row.total || 0) })),
      filter: buildRoleScope(body.user || {})
    });
  } catch (error) {
    await writeAiQueryLog({
      user_id: body.user?.id || null,
      role: body.user?.role || null,
      question: "dashboard-summary",
      generated_query: "",
      query_status: /^Security violation:/i.test(error.message || "") ? "blocked" : "failed"
    });
    return toolResponse({ error: error.message || "Gagal mengambil ringkasan dashboard." }, 500);
  }
}
