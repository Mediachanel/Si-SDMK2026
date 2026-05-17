import { requireAuth } from "@/lib/auth/requireAuth";
import { ok } from "@/lib/helpers/response";
import { getPegawaiFormOptions } from "@/lib/pegawaiFormOptions";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  return ok(await getPegawaiFormOptions());
}
