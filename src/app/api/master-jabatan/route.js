import { requireAuth } from "@/lib/auth/requireAuth";
import { ROLES } from "@/lib/constants/roles";
import {
  createMasterJabatan,
  deleteMasterJabatan,
  listMasterJabatan,
  updateMasterJabatan
} from "@/lib/masterJabatan";
import { fail, ok } from "@/lib/helpers/response";

function readPaging(searchParams) {
  return {
    page: searchParams.get("page") || "1",
    pageSize: searchParams.get("pageSize") || "20"
  };
}

export async function GET(request) {
  const { error } = await requireAuth([ROLES.SUPER_ADMIN], request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  try {
    const data = await listMasterJabatan({
      jenis: searchParams.get("jenis"),
      q: searchParams.get("q") || "",
      ...readPaging(searchParams)
    });
    return ok(data);
  } catch (errorMessage) {
    return fail(errorMessage.message || "Master jabatan gagal dimuat.", 422);
  }
}

export async function POST(request) {
  const { error } = await requireAuth([ROLES.SUPER_ADMIN], request);
  if (error) return error;

  try {
    const data = await createMasterJabatan(await request.json());
    return ok(data, "Master jabatan berhasil ditambahkan.");
  } catch (errorMessage) {
    return fail(errorMessage.message || "Master jabatan gagal ditambahkan.", 422);
  }
}

export async function PUT(request) {
  const { error } = await requireAuth([ROLES.SUPER_ADMIN], request);
  if (error) return error;

  try {
    const data = await updateMasterJabatan(await request.json());
    return ok(data, "Master jabatan berhasil diperbarui.");
  } catch (errorMessage) {
    return fail(errorMessage.message || "Master jabatan gagal diperbarui.", 422);
  }
}

export async function DELETE(request) {
  const { error } = await requireAuth([ROLES.SUPER_ADMIN], request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  try {
    const deleted = await deleteMasterJabatan({
      id: searchParams.get("id"),
      jenis: searchParams.get("jenis")
    });
    if (!deleted) return fail("Master jabatan tidak ditemukan.", 404);
    return ok({ deleted: true }, "Master jabatan berhasil dihapus.");
  } catch (errorMessage) {
    return fail(errorMessage.message || "Master jabatan gagal dihapus.", 422);
  }
}
