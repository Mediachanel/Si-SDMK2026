import bcrypt from "bcryptjs";
import { getConnectedPool } from "@/lib/db/postgres";
import { verifyStoredPassword } from "@/lib/auth/passwordVerifier";
import { validatePasswordPolicy } from "@/lib/auth/passwordPolicy";

function isMissingAppUsersTable(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42P01"
    || message.includes('relation "app_users" does not exist')
    || message.includes("relation 'app_users' does not exist");
}

function normalizeText(value) {
  return String(value || "").trim();
}

async function findAppUserRecord(pool, user) {
  try {
    const [rows] = await pool.query(
      `SELECT \`id\`, \`username\`, \`password_hash\`, \`role_code\`, \`nama_ukpd\`
       FROM \`app_users\`
       WHERE (\`id\` = ? OR LOWER(\`username\`) = LOWER(?))
         AND \`is_active\` = TRUE
       LIMIT 1`,
      [Number(user?.id) || 0, normalizeText(user?.username)]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      table: "app_users",
      id: Number(row.id),
      username: row.username,
      namaUkpd: row.nama_ukpd,
      role: row.role_code,
      passwordHash: row.password_hash
    };
  } catch (error) {
    if (isMissingAppUsersTable(error) || String(error?.message || "").includes("app_users")) return null;
    throw error;
  }
}

async function findUkpdRecord(pool, user) {
  const username = normalizeText(user?.username);
  const namaUkpd = normalizeText(user?.nama_ukpd);
  const [rows] = await pool.query(
    `SELECT \`id_ukpd\`, \`ukpd_id\`, \`nama_ukpd\`, \`password\`, \`role\`
     FROM \`ukpd\`
     WHERE \`id_ukpd\` = ?
        OR CAST(\`ukpd_id\` AS CHAR) = ?
        OR LOWER(\`nama_ukpd\`) = LOWER(?)
        OR LOWER(\`nama_ukpd\`) = LOWER(?)
     LIMIT 1`,
    [Number(user?.id) || 0, username, username, namaUkpd]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    table: "ukpd",
    id: Number(row.id_ukpd),
    username: String(row.ukpd_id || row.id_ukpd),
    namaUkpd: row.nama_ukpd,
    role: row.role,
    passwordHash: row.password
  };
}

async function findCurrentPasswordRecord(pool, user) {
  return await findAppUserRecord(pool, user) || await findUkpdRecord(pool, user);
}

async function updatePasswordHash(pool, record, passwordHash) {
  if (record.table === "app_users") {
    await pool.query(
      `UPDATE \`app_users\`
       SET \`password_hash\` = ?, \`updated_at\` = CURRENT_TIMESTAMP
       WHERE \`id\` = ?`,
      [passwordHash, record.id]
    );
    return;
  }

  await pool.query(
    `UPDATE \`ukpd\`
     SET \`password\` = ?
     WHERE \`id_ukpd\` = ?`,
    [passwordHash, record.id]
  );
}

export async function changeCurrentUserPassword({ user, currentPassword, newPassword }) {
  const pool = await getConnectedPool();
  const record = await findCurrentPasswordRecord(pool, user);
  if (!record) {
    return { ok: false, status: 404, message: "Akun tidak ditemukan." };
  }

  const currentValid = await verifyStoredPassword(currentPassword, record.passwordHash);
  if (!currentValid) {
    return { ok: false, status: 401, message: "Password lama tidak sesuai." };
  }

  if (await verifyStoredPassword(newPassword, record.passwordHash)) {
    return { ok: false, status: 422, message: "Password baru tidak boleh sama dengan password lama." };
  }

  const policy = validatePasswordPolicy(newPassword, {
    username: record.username || user?.username,
    namaUkpd: record.namaUkpd || user?.nama_ukpd
  });
  if (!policy.valid) {
    return { ok: false, status: 422, message: "Password baru belum memenuhi aturan.", errors: policy.errors };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await updatePasswordHash(pool, record, passwordHash);
  return { ok: true, record: { table: record.table, id: record.id, username: record.username, namaUkpd: record.namaUkpd } };
}

export async function listUkpdPasswordTargets() {
  const pool = await getConnectedPool();
  const [rows] = await pool.query(
    `SELECT \`id_ukpd\`, \`ukpd_id\`, \`nama_ukpd\`, \`wilayah\`, \`role\`
     FROM \`ukpd\`
     ORDER BY \`nama_ukpd\` ASC`
  );
  return rows.map((row) => ({
    id_ukpd: Number(row.id_ukpd),
    ukpd_id: row.ukpd_id,
    nama_ukpd: row.nama_ukpd,
    wilayah: row.wilayah,
    role: row.role
  }));
}

export async function resetUkpdPasswordToDefault(ukpdId) {
  const defaultPassword = process.env.UKPD_DEFAULT_PASSWORD || "";
  const pool = await getConnectedPool();
  const [rows] = await pool.query(
    `SELECT \`id_ukpd\`, \`ukpd_id\`, \`nama_ukpd\`
     FROM \`ukpd\`
     WHERE \`id_ukpd\` = ?
     LIMIT 1`,
    [Number(ukpdId)]
  );
  const target = rows[0];
  if (!target) {
    return { ok: false, status: 404, message: "UKPD tidak ditemukan." };
  }

  const policy = validatePasswordPolicy(defaultPassword, {
    username: String(target.ukpd_id || target.id_ukpd),
    namaUkpd: target.nama_ukpd
  });
  if (!policy.valid) {
    return {
      ok: false,
      status: 422,
      message: "UKPD_DEFAULT_PASSWORD belum memenuhi aturan password.",
      errors: policy.errors
    };
  }

  const passwordHash = await bcrypt.hash(defaultPassword, 12);
  await pool.query(
    `UPDATE \`ukpd\`
     SET \`password\` = ?
     WHERE \`id_ukpd\` = ?`,
    [passwordHash, Number(ukpdId)]
  );

  return {
    ok: true,
    target: {
      id_ukpd: Number(target.id_ukpd),
      ukpd_id: target.ukpd_id,
      nama_ukpd: target.nama_ukpd
    }
  };
}
