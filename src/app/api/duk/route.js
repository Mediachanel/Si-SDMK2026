import { requireAuth } from "@/lib/auth/requireAuth";
import { ROLES } from "@/lib/constants/roles";
import { getConnectedPool } from "@/lib/db/postgres";
import { ensureDrhSchema } from "@/lib/db/ensureDrhSchema";
import { ok } from "@/lib/helpers/response";

function mapFirstRowByPegawai(rows) {
  const result = new Map();
  for (const row of rows) {
    const idPegawai = Number(row.id_pegawai);
    if (!result.has(idPegawai)) {
      result.set(idPegawai, row);
    }
  }
  return result;
}

function cleanNip(value) {
  return String(value || "").trim().replace(/^`+/, "");
}

function buildRoleScope(user) {
  if (user.role === ROLES.SUPER_ADMIN) return { sql: "", params: [] };
  if (user.role === ROLES.ADMIN_UKPD) return { sql: "AND p.`nama_ukpd` = ?", params: [user.nama_ukpd] };
  if (user.role === ROLES.ADMIN_WILAYAH) {
    return {
      sql: "AND COALESCE(NULLIF(p.`wilayah`, ''), u.`wilayah`) = ?",
      params: [user.wilayah]
    };
  }
  return { sql: "AND 1 = 0", params: [] };
}

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  const pool = await getConnectedPool();
  const connection = await pool.getConnection();

  let latestPangkatByPegawai = new Map();
  let latestFormalEducationByPegawai = new Map();
  let pegawaiRows = [];

  try {
    await ensureDrhSchema(connection);

    const roleScope = buildRoleScope(user);
    const [rows] = await connection.query(
      `
        SELECT
          p.\`id_pegawai\`,
          p.\`nama\`,
          p.\`nip\`,
          p.\`nama_ukpd\`,
          COALESCE(NULLIF(p.\`wilayah\`, ''), u.\`wilayah\`) AS \`wilayah\`,
          p.\`jenis_pegawai\`,
          p.\`pangkat_golongan\`,
          p.\`tmt_pangkat_terakhir\`,
          p.\`nama_jabatan_menpan\`,
          p.\`nama_jabatan_orb\`,
          p.\`jenjang_pendidikan\`,
          p.\`program_studi\`
        FROM \`pegawai\` p
        LEFT JOIN \`ukpd\` u
          ON u.\`nama_ukpd\` = p.\`nama_ukpd\`
        WHERE p.\`jenis_pegawai\` = 'PNS'
        ${roleScope.sql}
        ORDER BY p.\`id_pegawai\` DESC
      `,
      roleScope.params
    );
    pegawaiRows = rows;

    const ids = pegawaiRows.map((row) => Number(row.id_pegawai)).filter(Boolean);
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(", ");
      const [latestPangkatRows] = await connection.query(
        `
          SELECT rp1.*
          FROM \`riwayat_pangkat\` rp1
          INNER JOIN (
            SELECT \`id_pegawai\`, MAX(COALESCE(\`tmt_pangkat\`, \`tanggal_sk\`, '')) AS latest_sort
            FROM \`riwayat_pangkat\`
            WHERE \`id_pegawai\` IN (${placeholders})
            GROUP BY \`id_pegawai\`
          ) latest
            ON latest.\`id_pegawai\` = rp1.\`id_pegawai\`
           AND COALESCE(rp1.\`tmt_pangkat\`, rp1.\`tanggal_sk\`, '') = latest.latest_sort
          WHERE rp1.\`id_pegawai\` IN (${placeholders})
          ORDER BY rp1.\`id_pegawai\` ASC, rp1.\`id\` DESC
        `,
        [...ids, ...ids]
      );
      latestPangkatByPegawai = mapFirstRowByPegawai(latestPangkatRows);

      const [latestFormalEducationRows] = await connection.query(
        `
          SELECT rp1.*
          FROM \`riwayat_pendidikan\` rp1
          INNER JOIN (
            SELECT \`id_pegawai\`, MAX(COALESCE(\`tanggal_ijazah\`, \`tahun_lulus\`, '')) AS latest_sort
            FROM \`riwayat_pendidikan\`
            WHERE \`id_pegawai\` IN (${placeholders})
              AND LOWER(REPLACE(COALESCE(\`jenis_riwayat\`, ''), '-', '_')) = 'formal'
            GROUP BY \`id_pegawai\`
          ) latest
            ON latest.\`id_pegawai\` = rp1.\`id_pegawai\`
           AND COALESCE(rp1.\`tanggal_ijazah\`, rp1.\`tahun_lulus\`, '') = latest.latest_sort
          WHERE rp1.\`id_pegawai\` IN (${placeholders})
            AND LOWER(REPLACE(COALESCE(rp1.\`jenis_riwayat\`, ''), '-', '_')) = 'formal'
          ORDER BY rp1.\`id_pegawai\` ASC, rp1.\`id\` DESC
        `,
        [...ids, ...ids]
      );
      latestFormalEducationByPegawai = mapFirstRowByPegawai(latestFormalEducationRows);
    }
  } finally {
    connection.release();
  }

  const pns = pegawaiRows
    .map((item) => {
      const latestPangkat = latestPangkatByPegawai.get(Number(item.id_pegawai));
      const latestFormalEducation = latestFormalEducationByPegawai.get(Number(item.id_pegawai));

      return {
        ...item,
        nip: cleanNip(item.nip),
        tmt_pangkat_terakhir: latestPangkat?.tmt_pangkat || item.tmt_pangkat_terakhir || null,
        pangkat_golongan: latestPangkat?.pangkat_golongan || item.pangkat_golongan || null,
        jenjang_pendidikan: latestFormalEducation?.jenjang_pendidikan || item.jenjang_pendidikan || null,
        program_studi: latestFormalEducation?.program_studi || item.program_studi || null
      };
    })
    .sort((a, b) => String(b.pangkat_golongan).localeCompare(String(a.pangkat_golongan)));
  return ok(pns);
}
