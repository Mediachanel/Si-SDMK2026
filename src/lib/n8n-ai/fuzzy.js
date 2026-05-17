export async function ensurePgTrgm(pool) {
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
    return { available: true };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

export function rankDecision(candidates = []) {
  const top = candidates[0] || null;
  const score = Number(top?.score || 0);
  if (score >= 0.45) {
    return { action: "selected", selected: top, score };
  }
  if (score >= 0.25) {
    return { action: "clarification_required", selected: null, score };
  }
  return { action: "not_found", selected: null, score };
}

export async function fuzzyDistinct(pool, sourceSql, input) {
  const value = String(input || "").trim();
  if (!value) return { candidates: [], decision: rankDecision([]) };

  await ensurePgTrgm(pool);
  const [rows] = await pool.query(
    `SELECT value, similarity(value, ?) AS score
     FROM (${sourceSql}) AS source
     WHERE value IS NOT NULL
       AND value <> ''
       AND (value % ? OR LOWER(value) LIKE LOWER(?))
     ORDER BY score DESC, value ASC
     LIMIT 5`,
    [value, value, `%${value}%`]
  );

  const candidates = rows.map((row) => ({
    value: row.value,
    score: Number(row.score || 0)
  }));

  return {
    candidates,
    decision: rankDecision(candidates)
  };
}
