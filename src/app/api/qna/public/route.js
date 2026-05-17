import { fail, ok } from "@/lib/helpers/response";
import { getQnaOverview } from "@/lib/qna";
import { enforceRateLimit } from "@/lib/security/rateLimit";

export async function GET(request) {
  const rateLimitError = enforceRateLimit(request, {
    namespace: "qna-public",
    limit: 120,
    windowMs: 60 * 1000
  });
  if (rateLimitError) return rateLimitError;

  try {
    const data = await getQnaOverview({ publishedOnly: true });
    return ok(data);
  } catch (error) {
    console.error("QnA public error:", error.message);
    return fail("Data QnA belum siap digunakan.", 503);
  }
}
