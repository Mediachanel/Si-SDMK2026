import { getCurrentUser } from "@/lib/auth/session";
import { fail, ok } from "@/lib/helpers/response";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Belum login.", 401);
  return ok(user);
}
