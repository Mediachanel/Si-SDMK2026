import { getQnaPool } from "@/lib/qna";
import { ensurePgTrgm, rankDecision } from "@/lib/n8n-ai/fuzzy";
import { checkN8nSecret } from "@/lib/n8n-ai/security";

export const runtime = "nodejs";

function toolResponse(payload, status = 200) {
  return Response.json(payload, { status });
}

export async function POST(request) {
  if (!checkN8nSecret(request)) {
    return toolResponse({ error: "Forbidden" }, 403);
  }

  const body = await request.json().catch(() => ({}));
  const message = String(body.message || body.query || "").trim();
  if (!message) {
    return toolResponse({ source: "database", tool: "public-qna", qna: [] });
  }

  const pool = await getQnaPool();
  await ensurePgTrgm(pool);

  const [rows] = await pool.query(
    `SELECT
       i.` + "`id`" + `,
       i.` + "`question`" + `,
       i.` + "`answer`" + `,
       c.` + "`name`" + ` AS category_name,
       GREATEST(
         similarity(COALESCE(i.` + "`question`" + `, ''), ?),
         similarity(COALESCE(i.` + "`answer`" + `, ''), ?)
       ) AS score
     FROM ` + "`qna_item`" + ` i
     INNER JOIN ` + "`qna_category`" + ` c ON c.` + "`id`" + ` = i.` + "`category_id`" + `
     WHERE i.` + "`status`" + ` = 'published'
       AND c.` + "`is_active`" + ` = 1
       AND (
         COALESCE(i.` + "`question`" + `, '') % ?
         OR COALESCE(i.` + "`answer`" + `, '') % ?
         OR LOWER(COALESCE(i.` + "`question`" + `, '')) LIKE LOWER(?)
         OR LOWER(COALESCE(i.` + "`answer`" + `, '')) LIKE LOWER(?)
       )
     ORDER BY score DESC, i.` + "`updated_at`" + ` DESC
     LIMIT 5`,
    [message, message, message, message, `%${message}%`, `%${message}%`]
  );

  const candidates = rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    category_name: row.category_name,
    score: Number(row.score || 0)
  }));
  const decision = rankDecision(candidates);
  const qna = decision.action === "not_found" ? [] : candidates;

  return toolResponse({
    source: "database",
    tool: "public-qna",
    qna,
    candidates,
    confidence_score: decision.score,
    not_found: decision.action === "not_found"
  });
}
