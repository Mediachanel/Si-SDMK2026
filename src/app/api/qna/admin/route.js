import { z } from "zod";
import { ROLES } from "@/lib/constants/roles";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/helpers/response";
import { getQnaOverview, getQnaPool } from "@/lib/qna";

const categorySchema = z.object({
  type: z.literal("category"),
  name: z.string().trim().min(2),
  description: z.string().trim().optional().default(""),
  sort_order: z.coerce.number().int().optional().default(0),
  is_active: z.coerce.boolean().optional().default(true)
});

const itemSchema = z.object({
  type: z.literal("item"),
  category_id: z.coerce.number().int().positive(),
  question: z.string().trim().min(5),
  answer: z.string().trim().min(5),
  status: z.enum(["published", "draft"]).default("published")
});

export async function GET() {
  const { error } = await requireAuth([ROLES.SUPER_ADMIN]);
  if (error) return error;

  try {
    const data = await getQnaOverview();
    return ok(data);
  } catch (err) {
    console.error("QnA admin error:", err);
    return fail("Data QnA belum siap digunakan.", 503);
  }
}

export async function POST(request) {
  const { error } = await requireAuth([ROLES.SUPER_ADMIN], request);
  if (error) return error;

  const body = await request.json();
  const parsed = body?.type === "category" ? categorySchema.safeParse(body) : itemSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validasi data QnA gagal.", 422, parsed.error.flatten());
  }

  const pool = await getQnaPool();

  if (parsed.data.type === "category") {
    const { name, description, sort_order, is_active } = parsed.data;
    const [result] = await pool.query(
      `INSERT INTO \`qna_category\` (\`name\`, \`description\`, \`sort_order\`, \`is_active\`)
       VALUES (?, ?, ?, ?)`,
      [name, description || null, sort_order, is_active ? 1 : 0]
    );
    return ok({ id: result.insertId }, "Kategori QnA berhasil ditambahkan");
  }

  const { category_id, question, answer, status } = parsed.data;
  const [result] = await pool.query(
    `INSERT INTO \`qna_item\` (\`category_id\`, \`question\`, \`answer\`, \`status\`)
     VALUES (?, ?, ?, ?)`,
    [category_id, question, answer, status]
  );
  return ok({ id: result.insertId }, "Item QnA berhasil ditambahkan");
}
