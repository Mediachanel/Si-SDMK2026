import { validateSameOrigin } from "@/lib/auth/requestGuards";
import { fail, ok } from "@/lib/helpers/response";
import { extractWorkflowLogPayload, writeAiWorkflowLog } from "@/lib/n8n-ai/audit";
import { isN8nAiEnabled } from "@/lib/n8n-ai/security";
import { normalizeWorkflowResponse } from "@/lib/n8n-ai/response";
import { callN8nWebhook, N8nWebhookError } from "@/lib/n8n-ai/webhookClient";
import { handlePublicChat } from "@/lib/public-chat/service";

export const runtime = "nodejs";

function getN8nReachableAppBaseUrl() {
  return process.env.SISDMK_APP_BASE_URL || process.env.APP_INTERNAL_URL || process.env.APP_URL || null;
}

async function localPublicChatFallback({ request, message, body, reason }) {
  const fallback = await handlePublicChat({
    request,
    visitorId: body.conversation_id || body.session_id || "",
    text: message
  });

  const normalized = {
    answer: fallback.answer,
    source: fallback.source || "QnA Publik",
    intent: fallback.intent || "public_qna",
    entities: {},
    tool: "public-qna-local-fallback",
    verification: "verified_public_qna_fallback",
    confidence: fallback.confidence ?? null,
    candidates: [],
    selected_candidate: fallback.message?.matched_qna_id || null,
    tool_result: fallback.output || null,
    suggestions: [],
    fallback_reason: reason
  };

  await writeAiWorkflowLog(extractWorkflowLogPayload({
    result: normalized,
    message,
    source: "public_chat_fallback"
  }));

  return ok(normalized, "Public AI memakai fallback QnA lokal.");
}

export async function POST(request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  let body = {};
  let message = "";

  try {
    body = await request.json();
    message = String(body.message || "").trim();

    if (!message) {
      return fail("Pesan tidak boleh kosong", 400);
    }

    if (!isN8nAiEnabled()) {
      return localPublicChatFallback({ request, message, body, reason: "n8n_disabled" });
    }

    const webhookUrl = process.env.N8N_PUBLIC_WEBHOOK_URL;
    const secret = process.env.N8N_API_SECRET;

    if (!webhookUrl || !secret) {
      return localPublicChatFallback({ request, message, body, reason: "n8n_not_configured" });
    }

    const { result, requestId, attempt } = await callN8nWebhook({
      webhookUrl,
      secret,
      source: "public_chat",
      payload: {
        message,
        source: "public_chat",
        app_base_url: getN8nReachableAppBaseUrl(),
        conversation_id: body.conversation_id || body.session_id || null,
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
      source: "public_chat"
    }));

    return ok(normalized, "Public AI n8n selesai memproses pesan.");
  } catch (error) {
    if (error instanceof N8nWebhookError) {
      await writeAiWorkflowLog({
        source: "public_chat",
        message: "n8n webhook failed",
        verification: "n8n_error",
        response: error.message
      });
      return localPublicChatFallback({ request, message, body, reason: error.message });
    }

    console.error("AI n8n public chat error:", error);
    return fail("Public chat gagal diproses", 500);
  }
}
