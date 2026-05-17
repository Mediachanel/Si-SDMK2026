import { z } from "zod";
import { ROLES } from "@/lib/constants/roles";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/helpers/response";
import { getQnaPool } from "@/lib/qna";

const schema = z.object({
  category_id: z.coerce.number().int().positive(),
  question: z.string().trim().min(5),
  answer: z.string().trim().min(5),
  status: z.enum(["published", "draft"]).default("published")
});

function parseId(params) {
  const id = Number(params?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(request, { params }) {
  const { error } = await requireAuth([ROLES.SUPER_ADMIN], request);
  if (error) return error;

  const id = parseId(await params);
  if (!id) return fail("ID item tidak valid.", 422);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail("Validasi item QnA gagal.", 422, parsed.error.flatten());

  const pool = await getQnaPool();
  const { category_id, question, answer, status } = parsed.data;
  await pool.query(
    `UPDATE \`qna_item\`
     SET \`category_id\` = ?, \`question\` = ?, \`answer\` = ?, \`status\` = ?, \`updated_at\` = NOW()
     WHERE \`id\` = ?`,
    [category_id, question, answer, status, id]
  );

  return ok({ id }, "Item QnA berhasil diperbarui");
}

export async function DELETE(request, { params }) {
  const { error } = await requireAuth([ROLES.SUPER_ADMIN], request);
  if (error) return error;

  const id = parseId(await params);
  if (!id) return fail("ID item tidak valid.", 422);

  const pool = await getQnaPool();
  await pool.query("DELETE FROM `qna_item` WHERE `id` = ?", [id]);
  return ok({ id }, "Item QnA berhasil dihapus");
}
