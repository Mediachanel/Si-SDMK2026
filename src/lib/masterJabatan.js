import { getConnectedPool } from "@/lib/db/postgres";

export const MASTER_JABATAN_TYPES = {
  menpan: {
    label: "Jabatan Berdasarkan Menpan",
    pegawaiColumn: "nama_jabatan_menpan"
  },
  orb: {
    label: "Jabatan Berdasarkan ORB",
    pegawaiColumn: "nama_jabatan_orb"
  }
};

function normalizeType(value) {
  const type = String(value || "").trim().toLowerCase();
  return MASTER_JABATAN_TYPES[type] ? type : "";
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function numberValue(value, fallback, min, max) {
  const number = Number.parseInt(value || "", 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

let schemaReady = false;

export async function ensureMasterJabatanSchema() {
  if (schemaReady) return;
  const pool = await getConnectedPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS master_jabatan (
      id SERIAL PRIMARY KEY,
      jenis VARCHAR(20) NOT NULL,
      nama VARCHAR(500) NOT NULL,
      aktif BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT master_jabatan_jenis_nama_unique UNIQUE (jenis, nama)
    )
  `);
  schemaReady = true;
}

export async function seedMasterJabatanFromPegawai() {
  await ensureMasterJabatanSchema();
  const pool = await getConnectedPool();

  for (const [jenis, config] of Object.entries(MASTER_JABATAN_TYPES)) {
    await pool.query(
      `INSERT INTO master_jabatan (jenis, nama)
       SELECT ?, TRIM(${config.pegawaiColumn}) AS nama
       FROM pegawai
       WHERE ${config.pegawaiColumn} IS NOT NULL
       AND TRIM(${config.pegawaiColumn}) <> ''
       GROUP BY TRIM(${config.pegawaiColumn})
       ON CONFLICT (jenis, nama) DO NOTHING`,
      [jenis]
    );
  }
}

export async function listMasterJabatan({ jenis, q = "", page = 1, pageSize = 20, activeOnly = false } = {}) {
  const type = normalizeType(jenis);
  if (!type) throw new Error("Jenis master jabatan tidak valid.");
  await seedMasterJabatanFromPegawai();

  const pool = await getConnectedPool();
  const where = ["jenis = ?"];
  const params = [type];
  const search = normalizeText(q);
  if (search) {
    where.push("nama LIKE ?");
    params.push(`%${search}%`);
  }
  if (activeOnly) {
    where.push("aktif = TRUE");
  }

  const pageNumber = numberValue(page, 1, 1, 100000);
  const limit = numberValue(pageSize, 20, 5, 100);
  const offset = (pageNumber - 1) * limit;
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM master_jabatan ${whereSql}`, params);
  const [rows] = await pool.query(
    `SELECT id, jenis, nama, aktif, created_at, updated_at
     FROM master_jabatan
     ${whereSql}
     ORDER BY nama ASC, id ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    rows,
    total: Number(countRows[0]?.total || 0),
    page: pageNumber,
    pageSize: limit,
    jenis: type,
    label: MASTER_JABATAN_TYPES[type].label
  };
}

export async function getMasterJabatanOptions() {
  await seedMasterJabatanFromPegawai();
  const pool = await getConnectedPool();
  const [rows] = await pool.query(
    `SELECT jenis, nama
     FROM master_jabatan
     WHERE aktif = TRUE
     ORDER BY jenis ASC, nama ASC`
  );

  return {
    jabatanMenpanOptions: rows.filter((row) => row.jenis === "menpan").map((row) => row.nama).filter(Boolean),
    jabatanOrbOptions: rows.filter((row) => row.jenis === "orb").map((row) => row.nama).filter(Boolean)
  };
}

export async function createMasterJabatan({ jenis, nama }) {
  const type = normalizeType(jenis);
  const name = normalizeText(nama);
  if (!type || !name) throw new Error("Jenis dan nama jabatan wajib diisi.");
  await ensureMasterJabatanSchema();
  const pool = await getConnectedPool();
  await pool.query(
    `INSERT INTO master_jabatan (jenis, nama, aktif)
     VALUES (?, ?, TRUE)
     ON CONFLICT (jenis, nama) DO UPDATE SET aktif = TRUE, updated_at = CURRENT_TIMESTAMP
    `,
    [type, name]
  );
  const [rows] = await pool.query(
    "SELECT id, jenis, nama, aktif, created_at, updated_at FROM master_jabatan WHERE jenis = ? AND nama = ? LIMIT 1",
    [type, name]
  );
  return rows[0];
}

export async function updateMasterJabatan({ id, jenis, nama, aktif = true }) {
  const type = normalizeType(jenis);
  const name = normalizeText(nama);
  const jabatanId = Number(id);
  if (!Number.isInteger(jabatanId) || jabatanId <= 0 || !type || !name) {
    throw new Error("Parameter master jabatan tidak valid.");
  }
  await ensureMasterJabatanSchema();
  const pool = await getConnectedPool();
  const [result] = await pool.query(
    `UPDATE master_jabatan
     SET nama = ?, aktif = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND jenis = ?`,
    [name, Boolean(aktif), jabatanId, type]
  );
  if (result.affectedRows < 1) throw new Error("Master jabatan tidak ditemukan.");
  const [rows] = await pool.query(
    "SELECT id, jenis, nama, aktif, created_at, updated_at FROM master_jabatan WHERE id = ? AND jenis = ? LIMIT 1",
    [jabatanId, type]
  );
  if (!rows[0]) throw new Error("Master jabatan tidak ditemukan.");
  return rows[0];
}

export async function deleteMasterJabatan({ id, jenis }) {
  const type = normalizeType(jenis);
  const jabatanId = Number(id);
  if (!Number.isInteger(jabatanId) || jabatanId <= 0 || !type) {
    throw new Error("Parameter master jabatan tidak valid.");
  }
  await ensureMasterJabatanSchema();
  const pool = await getConnectedPool();
  const [result] = await pool.query("DELETE FROM master_jabatan WHERE id = ? AND jenis = ?", [jabatanId, type]);
  return result.affectedRows > 0;
}
