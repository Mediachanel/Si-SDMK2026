import { ROLES } from "@/lib/constants/roles";

export function isN8nAiEnabled() {
  return String(process.env.AI_ENABLE_N8N || "").toLowerCase() === "true";
}

export function checkN8nSecret(request) {
  const configuredSecret = process.env.N8N_API_SECRET;
  const providedSecret = request.headers.get("x-ai-secret");
  return Boolean(configuredSecret && providedSecret && providedSecret === configuredSecret);
}

export function maskIdentifier(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.length <= 6) return "***";
  return `${raw.slice(0, 3)}****${raw.slice(-3)}`;
}

export function normalizeUserForWorkflow(user = {}) {
  return {
    id: user.id ? String(user.id) : null,
    name: user.name || user.username || user.nama_ukpd || null,
    email: user.email || null,
    role: user.role || null,
    wilayah: user.wilayah || user.wilayah_id || null,
    wilayah_id: user.wilayah_id || user.wilayah || null,
    ukpd: user.ukpd || user.nama_ukpd || user.ukpd_id || null,
    ukpd_id: user.ukpd_id || user.nama_ukpd || null,
    nama_ukpd: user.nama_ukpd || user.ukpd_id || null,
    pegawai_id: user.pegawai_id || user.id_pegawai || null,
    username: user.username || null
  };
}

export function addPegawaiScope(where, params, user = {}, { pegawaiAlias = "p", ukpdAlias = "u" } = {}) {
  if (user?.role === ROLES.ADMIN_UKPD) {
    const ukpdName = user.nama_ukpd || user.ukpd_id;
    if (ukpdName) {
      where.push(`LOWER(COALESCE(${pegawaiAlias}.\`nama_ukpd\`, '')) = LOWER(?)`);
      params.push(ukpdName);
    }
  }

  if (user?.role === ROLES.ADMIN_WILAYAH) {
    const wilayah = user.wilayah || user.wilayah_id;
    if (wilayah) {
      where.push(`LOWER(COALESCE(NULLIF(${pegawaiAlias}.\`wilayah\`, ''), ${ukpdAlias}.\`wilayah\`, '')) = LOWER(?)`);
      params.push(wilayah);
    }
  }
}

export function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
