import { z } from "zod";
import { ROLES } from "@/lib/constants/roles";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/helpers/response";
import { getQnaPool } from "@/lib/qna";

const schema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional().default(""),
  sort_order: z.coerce.number().int().optional().default(0),
  is_active: z.coerce.boolean().optional().default(true)
});

function parseId(params) {
  const id = Number(params?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(request, { params }) {
  const { error } = await requireAuth([ROLES.SUPER_ADMIN], request);
  if (error) return error;

  const id = parseId(await params);
  if (!id) return fail("ID kategori tidak valid.", 422);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail("Validasi kategori gagal.", 422, parsed.error.flatten());

  const pool = await getQnaPool();
  const { name, description, sort_order, is_active } = parsed.data;
  await pool.query(
    `UPDATE \`qna_category\`
     SET \`name\` = ?, \`description\` = ?, \`sort_order\` = ?, \`is_active\` = ?, \`updated_at\` = NOW()
     WHERE \`id\` = ?`,
    [name, description || null, sort_order, is_active ? 1 : 0, id]
  );

  return ok({ id }, "Kategori QnA berhasil diperbarui");
}

export async function DELETE(request, { params }) {
  const { error } = await requireAuth([ROLES.SUPER_ADMIN], request);
  if (error) return error;

  const id = parseId(await params);
  if (!id) return fail("ID kategori tidak valid.", 422);

  const pool = await getQnaPool();
  await pool.query("DELETE FROM `qna_category` WHERE `id` = ?", [id]);
  return ok({ id }, "Kategori QnA berhasil dihapus");
}
