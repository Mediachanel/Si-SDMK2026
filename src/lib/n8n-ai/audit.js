import { getConnectedPool } from "@/lib/db/postgres";

async function ensureAuditTable(pool) {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ai_workflow_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT,
      role TEXT,
      source TEXT,
      message TEXT NOT NULL,
      intent TEXT,
      entities JSONB,
      tool TEXT,
      verification TEXT,
      response TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  );
}

function toJson(value) {
  try {
    return JSON.stringify(value || {});
  } catch {
    return "{}";
  }
}

export async function writeAiWorkflowLog(entry = {}) {
  try {
    const pool = await getConnectedPool();
    await ensureAuditTable(pool);
    await pool.query(
      `INSERT INTO ai_workflow_logs
        (user_id, role, source, message, intent, entities, tool, verification, response)
       VALUES (?, ?, ?, ?, ?, CAST(? AS JSONB), ?, ?, ?)`,
      [
        entry.user_id ? String(entry.user_id) : null,
        entry.role || null,
        entry.source || null,
        String(entry.message || ""),
        entry.intent || null,
        toJson(entry.entities),
        entry.tool || null,
        entry.verification || null,
        String(entry.response || "")
      ]
    );
  } catch (error) {
    console.warn("AI workflow audit log skipped:", error.message);
  }
}

export function extractWorkflowLogPayload({ result = {}, message = "", source = "", user = null } = {}) {
  const data = result?.data || result || {};
  return {
    user_id: user?.id || null,
    role: user?.role || null,
    source: data.source || source,
    message,
    intent: data.intent || data.parsed_intent || null,
    entities: data.entities || data.extracted_entities || data.debug?.extracted_entities || {},
    tool: data.tool || data.debug?.tool || null,
    verification: data.verification || null,
    response: data.answer || data.message || ""
  };
}
