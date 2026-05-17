function unwrapWorkflowData(result = {}) {
  if (Array.isArray(result)) {
    const first = result[0] || {};
    return first.json || first.data || first;
  }

  if (result?.json) return result.json;
  if (result?.data?.json) return result.data.json;
  return result?.data || result || {};
}

export function normalizeWorkflowResponse(result = {}, originalMessage = "") {
  const data = unwrapWorkflowData(result);
  const answer = data.answer || data.message || "Maaf, data tidak ditemukan atau belum dapat diverifikasi.";
  const debug = data.debug || {
    original_message: originalMessage,
    parsed_intent: data.intent || "-",
    extracted_entities: data.entities || {},
    fuzzy_candidates: data.fuzzy_candidates || data.candidates || [],
    selected_candidate: data.selected_candidate || null,
    confidence_score: data.confidence ?? data.score ?? null,
    tool_result: data.tool_result || data.data || null,
    final_answer: answer
  };

  return {
    answer,
    source: data.source || "n8n",
    intent: data.intent || "unknown",
    entities: data.entities || {},
    tool: data.tool || "-",
    verification: data.verification || "unverified",
    confidence: data.confidence ?? data.score ?? null,
    candidates: data.candidates || data.fuzzy_candidates || [],
    selected_candidate: data.selected_candidate || null,
    tool_result: data.tool_result || data.data || null,
    suggestions: data.suggestions || data.suggestedQuestions || [],
    debug
  };
}
