import { ROLES } from "./constants/roles.js";

export const AI_PEGAWAI_TABLE = "pegawai";

export const AI_PEGAWAI_ALLOWED_COLUMNS = Object.freeze([
  "id",
  "nama",
  "nip",
  "nrk",
  "nama_jabatan",
  "ukpd",
  "wilayah",
  "status_pegawai",
  "jenis_kelamin",
  "pendidikan",
  "rumpun",
  "created_at",
  "updated_at"
]);

export const AI_PEGAWAI_N8N_ALLOWED_COLUMNS = Object.freeze([
  "id",
  "nama",
  "nip",
  "nrk",
  "nama_jabatan",
  "ukpd",
  "wilayah",
  "status_pegawai",
  "jenis_kelamin",
  "pendidikan",
  "rumpun"
]);

export const AI_PEGAWAI_INTENTS = Object.freeze([
  "search_person",
  "search_by_position",
  "search_by_ukpd",
  "count_employee",
  "employee_summary"
]);

export const AI_PEGAWAI_SYSTEM_PROMPT = [
  "Anda adalah AI Assistant SI-SDMK.",
  "Anda hanya boleh membaca data dasar dari tabel pegawai.",
  "Anda hanya boleh menggunakan kolom yang diizinkan.",
  "Anda dilarang mengakses data sensitif.",
  "Anda hanya boleh membuat query SELECT.",
  "Anda wajib mematuhi role_scope.",
  "Jika user meminta data di luar kewenangannya: \"Maaf, data tersebut berada di luar kewenangan akses Anda.\""
].join("\n");

const DEFAULT_MAX_ROWS = 50;
const DEFAULT_QUERY_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_KEYWORD_LENGTH = 80;
const FORBIDDEN_SQL_KEYWORDS = Object.freeze([
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "EXEC",
  "UNION",
  "INFORMATION_SCHEMA",
  "PG_CATALOG"
]);

const SELECT_COLUMN_SQL = Object.freeze({
  id: 'p."id_pegawai" AS "id"',
  nama: 'p."nama" AS "nama"',
  nip: 'CAST(p."nip" AS TEXT) AS "nip"',
  nrk: 'CAST(p."nrk" AS TEXT) AS "nrk"',
  nama_jabatan: 'COALESCE(NULLIF(p."nama_jabatan_menpan", \'\'), p."nama_jabatan_orb", \'\') AS "nama_jabatan"',
  ukpd: 'p."nama_ukpd" AS "ukpd"',
  wilayah: 'p."wilayah" AS "wilayah"',
  status_pegawai: 'p."jenis_pegawai" AS "status_pegawai"',
  jenis_kelamin: 'p."jenis_kelamin" AS "jenis_kelamin"',
  pendidikan: 'p."jenjang_pendidikan" AS "pendidikan"',
  rumpun: 'p."status_rumpun" AS "rumpun"',
  created_at: 'p."created_at" AS "created_at"',
  updated_at: 'p."created_at" AS "updated_at"'
});

const FILTER_COLUMN_SQL = Object.freeze({
  id: 'CAST(p."id_pegawai" AS TEXT)',
  nama: 'p."nama"',
  nip: 'CAST(p."nip" AS TEXT)',
  nrk: 'CAST(p."nrk" AS TEXT)',
  nama_jabatan: 'COALESCE(NULLIF(p."nama_jabatan_menpan", \'\'), p."nama_jabatan_orb", \'\')',
  ukpd: 'p."nama_ukpd"',
  wilayah: 'p."wilayah"',
  status_pegawai: 'p."jenis_pegawai"',
  jenis_kelamin: 'p."jenis_kelamin"',
  pendidikan: 'p."jenjang_pendidikan"',
  rumpun: 'p."status_rumpun"'
});

const COUNT_GROUP_SQL = Object.freeze({
  status_pegawai: 'COALESCE(NULLIF(p."jenis_pegawai", \'\'), \'Tidak tercatat\')',
  ukpd: 'COALESCE(NULLIF(p."nama_ukpd", \'\'), \'Tidak tercatat\')',
  wilayah: 'COALESCE(NULLIF(p."wilayah", \'\'), \'Tidak tercatat\')',
  nama_jabatan: 'COALESCE(NULLIF(COALESCE(NULLIF(p."nama_jabatan_menpan", \'\'), p."nama_jabatan_orb", \'\'), \'\'), \'Tidak tercatat\')',
  jenis_kelamin: 'COALESCE(NULLIF(p."jenis_kelamin", \'\'), \'Tidak tercatat\')',
  pendidikan: 'COALESCE(NULLIF(p."jenjang_pendidikan", \'\'), \'Tidak tercatat\')',
  rumpun: 'COALESCE(NULLIF(p."status_rumpun", \'\'), \'Tidak tercatat\')'
});

const STATUS_ALIASES = Object.freeze({
  pns: "PNS",
  cpns: "CPNS",
  asn: "PNS",
  pppk: "PPPK",
  p3k: "PPPK",
  "non pns": "NON PNS",
  nonpns: "NON PNS",
  "non asn": "NON PNS",
  nonasn: "NON PNS",
  pjlp: "PJLP"
});

const WILAYAH_ALIASES = Object.freeze({
  jaktim: "Jakarta Timur",
  "jakarta timur": "Jakarta Timur",
  jaksel: "Jakarta Selatan",
  "jakarta selatan": "Jakarta Selatan",
  jakbar: "Jakarta Barat",
  "jakarta barat": "Jakarta Barat",
  jakpus: "Jakarta Pusat",
  "jakarta pusat": "Jakarta Pusat",
  jakut: "Jakarta Utara",
  "jakarta utara": "Jakarta Utara",
  "kepulauan seribu": "Kepulauan Seribu",
  "kep seribu": "Kepulauan Seribu"
});

function numberEnv(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function getAiMaxRows() {
  return Math.min(DEFAULT_MAX_ROWS, numberEnv("AI_MAX_QUERY_ROWS", DEFAULT_MAX_ROWS, { min: 1, max: DEFAULT_MAX_ROWS }));
}

export function getAiQueryTimeoutMs() {
  return numberEnv("AI_QUERY_TIMEOUT", DEFAULT_QUERY_TIMEOUT_MS, { min: 500, max: 60_000 });
}

export function getAiMaxKeywordLength() {
  return numberEnv("AI_MAX_KEYWORD_LENGTH", DEFAULT_MAX_KEYWORD_LENGTH, { min: 5, max: 300 });
}

export function getAiAllowedTables() {
  const raw = String(process.env.AI_ALLOWED_TABLES || AI_PEGAWAI_TABLE)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return raw.length ? raw : [AI_PEGAWAI_TABLE];
}

function normalizeSpace(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value) {
  return normalizeSpace(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function addParam(params, value) {
  params.push(value);
  return `$${params.length}`;
}

function likeParam(value) {
  return `%${String(value).replace(/[\\%_]/g, "\\$&")}%`;
}

function addLike(where, params, expression, value) {
  const keyword = sanitizeSearchKeyword(value);
  if (!keyword) return;
  where.push(`${expression} ILIKE ${addParam(params, likeParam(keyword))} ESCAPE '\\'`);
}

function addExactText(where, params, expression, value) {
  const keyword = sanitizeSearchKeyword(value);
  if (!keyword) return;
  where.push(`LOWER(COALESCE(${expression}, '')) = LOWER(${addParam(params, keyword)})`);
}

function normalizeStatus(value) {
  const normalized = normalizeSpace(value).toLowerCase();
  return STATUS_ALIASES[normalized] || STATUS_ALIASES[compact(value)] || normalizeSpace(value).toUpperCase();
}

function normalizeWilayah(value) {
  const normalized = normalizeSpace(value).toLowerCase();
  return WILAYAH_ALIASES[normalized] || normalizeSpace(value);
}

export function validateAllowedColumns(columns = AI_PEGAWAI_ALLOWED_COLUMNS) {
  const allowed = new Set(AI_PEGAWAI_ALLOWED_COLUMNS);
  const requested = Array.isArray(columns) ? columns : [columns];
  const invalid = requested.map((column) => String(column || "").trim()).filter((column) => !allowed.has(column));

  if (invalid.length) {
    throw new Error(`Security violation: forbidden column access (${invalid.join(", ")}).`);
  }

  return requested;
}

export function sanitizeSearchKeyword(value, { maxLength = getAiMaxKeywordLength() } = {}) {
  const keyword = normalizeSpace(value);
  if (!keyword) return "";
  if (keyword.length > maxLength) {
    throw new Error(`Security violation: keyword length exceeds ${maxLength} characters.`);
  }
  return keyword;
}

export function buildRoleScope(currentUser = {}) {
  return {
    role: currentUser.role || null,
    ukpd: currentUser.ukpd || currentUser.nama_ukpd || currentUser.ukpd_id || null,
    wilayah: currentUser.wilayah || currentUser.wilayah_id || null,
    pegawai_id: currentUser.pegawai_id || currentUser.id_pegawai || currentUser.id || null
  };
}

export function enforceRoleFilter(currentUser = {}, params = [], { pegawaiAlias = "p" } = {}) {
  const scope = buildRoleScope(currentUser);
  const role = scope.role;

  if (role === ROLES.SUPER_ADMIN) {
    return { sql: "", params, roleScope: scope };
  }

  if (role === ROLES.ADMIN_WILAYAH) {
    if (!scope.wilayah) throw new Error("Security violation: ADMIN_WILAYAH requires wilayah scope.");
    return {
      sql: `LOWER(COALESCE(${pegawaiAlias}."wilayah", '')) = LOWER(${addParam(params, scope.wilayah)})`,
      params,
      roleScope: scope
    };
  }

  if (role === ROLES.ADMIN_UKPD) {
    if (!scope.ukpd) throw new Error("Security violation: ADMIN_UKPD requires ukpd scope.");
    return {
      sql: `LOWER(COALESCE(${pegawaiAlias}."nama_ukpd", '')) = LOWER(${addParam(params, scope.ukpd)})`,
      params,
      roleScope: scope
    };
  }

  if (role === ROLES.USER || role === "USER") {
    const id = Number(scope.pegawai_id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Security violation: USER requires pegawai_id scope.");
    return {
      sql: `${pegawaiAlias}."id_pegawai" = ${addParam(params, id)}`,
      params,
      roleScope: scope
    };
  }

  throw new Error("Security violation: role is not allowed for AI Pegawai.");
}

function applyRoleAndFilters(where, params, currentUser, filters = {}) {
  const roleFilter = enforceRoleFilter(currentUser, params);
  if (roleFilter.sql) where.push(roleFilter.sql);

  if (filters.nama) addLike(where, params, FILTER_COLUMN_SQL.nama, filters.nama);
  if (filters.id || filters.id_pegawai) {
    const id = Number(filters.id || filters.id_pegawai);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Security violation: invalid pegawai id filter.");
    where.push(`p."id_pegawai" = ${addParam(params, id)}`);
  }
  if (filters.nama_jabatan || filters.jabatan || filters.position) {
    addLike(where, params, FILTER_COLUMN_SQL.nama_jabatan, filters.nama_jabatan || filters.jabatan || filters.position);
  }
  if (filters.ukpd) addLike(where, params, FILTER_COLUMN_SQL.ukpd, filters.ukpd);
  if (filters.wilayah) addExactText(where, params, FILTER_COLUMN_SQL.wilayah, normalizeWilayah(filters.wilayah));
  if (filters.status_pegawai) addExactText(where, params, FILTER_COLUMN_SQL.status_pegawai, normalizeStatus(filters.status_pegawai));
  if (filters.jenis_kelamin) addExactText(where, params, FILTER_COLUMN_SQL.jenis_kelamin, filters.jenis_kelamin);
  if (filters.pendidikan) addLike(where, params, FILTER_COLUMN_SQL.pendidikan, filters.pendidikan);
  if (filters.rumpun) addLike(where, params, FILTER_COLUMN_SQL.rumpun, filters.rumpun);

  const roleScope = roleFilter.roleScope;
  return { where, params, roleScope };
}

function applyGenericKeyword(where, params, keyword) {
  const safeKeyword = sanitizeSearchKeyword(keyword);
  if (!safeKeyword) return;
  const searchParam = addParam(params, likeParam(safeKeyword));
  where.push(`(
    ${FILTER_COLUMN_SQL.nama} ILIKE ${searchParam} ESCAPE '\\'
    OR ${FILTER_COLUMN_SQL.nama_jabatan} ILIKE ${searchParam} ESCAPE '\\'
    OR ${FILTER_COLUMN_SQL.ukpd} ILIKE ${searchParam} ESCAPE '\\'
    OR ${FILTER_COLUMN_SQL.wilayah} ILIKE ${searchParam} ESCAPE '\\'
    OR ${FILTER_COLUMN_SQL.status_pegawai} ILIKE ${searchParam} ESCAPE '\\'
    OR ${FILTER_COLUMN_SQL.pendidikan} ILIKE ${searchParam} ESCAPE '\\'
    OR ${FILTER_COLUMN_SQL.rumpun} ILIKE ${searchParam} ESCAPE '\\'
  )`);
}

function selectColumns(columns) {
  const allowedColumns = validateAllowedColumns(columns);
  return allowedColumns.map((column) => SELECT_COLUMN_SQL[column]).join(",\n  ");
}

function ensureLimit(limit) {
  const number = Number(limit);
  if (!Number.isFinite(number) || number <= 0) return getAiMaxRows();
  return Math.min(getAiMaxRows(), Math.max(1, Math.floor(number)));
}

function hasStructuredFilters(filters = {}) {
  return Boolean(
    filters.nama ||
    filters.id ||
    filters.id_pegawai ||
    filters.nama_jabatan ||
    filters.jabatan ||
    filters.position ||
    filters.ukpd ||
    filters.wilayah ||
    filters.status_pegawai ||
    filters.jenis_kelamin ||
    filters.pendidikan ||
    filters.rumpun
  );
}

export function buildPegawaiSearchQuery({
  currentUser = {},
  filters = {},
  keyword = "",
  columns = AI_PEGAWAI_ALLOWED_COLUMNS,
  limit = getAiMaxRows()
} = {}) {
  const params = [];
  const where = [];
  const role = applyRoleAndFilters(where, params, currentUser, filters);

  if (!hasStructuredFilters(filters) && keyword) {
    applyGenericKeyword(where, params, keyword);
  }

  const safeLimit = ensureLimit(limit);
  const sql = `SELECT
  ${selectColumns(columns)}
FROM "${AI_PEGAWAI_TABLE}" p
WHERE ${where.length ? where.join("\n  AND ") : "1=1"}
ORDER BY p."nama" ASC, p."id_pegawai" ASC
LIMIT ${safeLimit}`;

  preventDangerousSQL(sql);

  return {
    sql,
    params,
    limit: safeLimit,
    role_scope: role.roleScope,
    allowed_columns: validateAllowedColumns(columns)
  };
}

export function buildPegawaiCountQuery({
  currentUser = {},
  filters = {},
  groupBy = "",
  limit = getAiMaxRows()
} = {}) {
  const params = [];
  const where = [];
  const role = applyRoleAndFilters(where, params, currentUser, filters);
  const safeLimit = ensureLimit(limit);
  const groupColumn = normalizeSpace(groupBy);
  let sql;

  if (groupColumn) {
    validateAllowedColumns(groupColumn);
    const expression = COUNT_GROUP_SQL[groupColumn];
    if (!expression) throw new Error(`Security violation: unsupported count category (${groupColumn}).`);
    sql = `SELECT
  ${expression} AS "kategori",
  COUNT(p."id_pegawai")::int AS "total"
FROM "${AI_PEGAWAI_TABLE}" p
WHERE ${where.length ? where.join("\n  AND ") : "1=1"}
GROUP BY ${expression}
ORDER BY "total" DESC, "kategori" ASC
LIMIT ${safeLimit}`;
  } else {
    sql = `SELECT
  COUNT(p."id_pegawai")::int AS "total"
FROM "${AI_PEGAWAI_TABLE}" p
WHERE ${where.length ? where.join("\n  AND ") : "1=1"}
LIMIT ${safeLimit}`;
  }

  preventDangerousSQL(sql);

  return {
    sql,
    params,
    limit: safeLimit,
    role_scope: role.roleScope,
    group_by: groupColumn || null
  };
}

export function preventDangerousSQL(sql) {
  const raw = String(sql || "");
  const normalized = raw.toUpperCase();
  const withoutTrailingSemicolon = raw.trim().replace(/;\s*$/, "");

  if (!/^\s*SELECT\b/i.test(raw)) {
    throw new Error("Security violation: only SELECT queries are allowed.");
  }

  if (withoutTrailingSemicolon.includes(";")) {
    throw new Error("Security violation: multiple SQL statements are not allowed.");
  }

  if (/\bSELECT\s+\*/i.test(raw) || /\b[A-Z_][A-Z0-9_]*\.\*/i.test(normalized)) {
    throw new Error("Security violation: SELECT * is not allowed.");
  }

  for (const keyword of FORBIDDEN_SQL_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`, "i");
    if (pattern.test(raw)) {
      throw new Error(`Security violation: forbidden SQL keyword (${keyword}).`);
    }
  }

  const tablePattern = /\b(?:FROM|JOIN)\s+"?([a-zA-Z0-9_]+)"?/gi;
  const allowedTables = new Set(getAiAllowedTables());
  for (const match of raw.matchAll(tablePattern)) {
    const tableName = String(match[1] || "").toLowerCase();
    if (!allowedTables.has(tableName)) {
      throw new Error(`Security violation: table ${tableName} is not allowed.`);
    }
  }

  return true;
}

function findWilayah(question) {
  const lower = normalizeSpace(question).toLowerCase();
  for (const [alias, value] of Object.entries(WILAYAH_ALIASES)) {
    if (lower.includes(alias)) return value;
  }
  return "";
}

function findStatus(question) {
  const lower = normalizeSpace(question).toLowerCase();
  const aliases = Object.entries(STATUS_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, value] of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");
    if (pattern.test(lower)) return value;
  }
  return "";
}

function findUkpd(question, wilayah) {
  const text = sanitizeSearchKeyword(question, { maxLength: 300 });
  const lower = text.toLowerCase();
  const direct = text.match(/\b(?:ukpd|unit kerja)\s+(.+)$/i);
  const facility = text.match(/\b((?:puskesmas|rsud|rs|dinas kesehatan|suku dinas|sudin)\s+[^,.?]+)/i);
  const location = text.match(/\bdi\s+([^,.?]+)$/i);
  const value = direct?.[1] || facility?.[1] || location?.[1] || "";
  const cleaned = normalizeSpace(value).replace(/\b(saya|sendiri)\b/gi, "").trim();

  if (!cleaned || lower.includes("ukpd saya")) return "";
  if (wilayah && cleaned.toLowerCase().includes(wilayah.toLowerCase())) return "";
  if (/^jakarta\b/i.test(cleaned) || /^kepulauan seribu$/i.test(cleaned)) return "";
  return cleaned;
}

function findPosition(question) {
  const text = sanitizeSearchKeyword(question, { maxLength: 300 });
  const jabatanMatch = text.match(/\b(?:jabatan|sebagai)\s+([^,.?]+?)(?:\s+\b(?:di|ukpd)\b|$)/i);
  if (jabatanMatch?.[1]) return normalizeSpace(jabatanMatch[1]);

  const lower = text.toLowerCase();
  const knownPositions = [
    "admin kepegawaian",
    "kepala puskesmas",
    "kepala",
    "perawat",
    "dokter",
    "bidan",
    "apoteker",
    "tenaga kesehatan",
    "analis kesehatan",
    "sanitarian",
    "nutrisionis"
  ];
  return knownPositions.find((position) => lower.includes(position)) || "";
}

function findName(question) {
  const text = sanitizeSearchKeyword(question, { maxLength: 300 });
  const match = text.match(/\b(?:nama|bernama)\s+([^,.?]+)$/i)
    || text.match(/\bpegawai\s+(?:bernama\s+)?([^,.?]+)$/i);
  return normalizeSpace(match?.[1] || "");
}

export function detectPegawaiIntent(question = "", explicitIntent = "") {
  const requested = normalizeSpace(explicitIntent);
  if (AI_PEGAWAI_INTENTS.includes(requested)) return requested;

  const lower = normalizeSpace(question).toLowerCase();
  if (/\b(berapa|jumlah|total|hitung)\b/.test(lower)) return "count_employee";
  if (/\b(ringkasan|summary|profil|data dasar)\b/.test(lower)) return "employee_summary";
  if (/\b(jabatan|kepala|perawat|dokter|bidan|apoteker|admin kepegawaian)\b/.test(lower)) return "search_by_position";
  if (/\b(ukpd|puskesmas|rsud|dinas kesehatan|sudin|wilayah|jakarta)\b/.test(lower)) return "search_by_ukpd";
  return "search_person";
}

export function extractPegawaiFilters(question = "", explicitFilters = {}) {
  const wilayah = explicitFilters.wilayah || findWilayah(question);
  const filters = {
    nama: explicitFilters.nama || findName(question),
    nama_jabatan: explicitFilters.nama_jabatan || explicitFilters.jabatan || explicitFilters.position || findPosition(question),
    ukpd: explicitFilters.ukpd || findUkpd(question, wilayah),
    wilayah,
    status_pegawai: explicitFilters.status_pegawai || findStatus(question),
    jenis_kelamin: explicitFilters.jenis_kelamin || "",
    pendidikan: explicitFilters.pendidikan || "",
    rumpun: explicitFilters.rumpun || ""
  };

  return Object.fromEntries(Object.entries(filters).filter(([, value]) => normalizeSpace(value)));
}

export function buildN8nPegawaiPayload({ question = "", currentUser = {} } = {}) {
  const filters = extractPegawaiFilters(question);

  return {
    event: "ai.pegawai.search",
    question: normalizeSpace(question).slice(0, 300),
    ...filters,
    filters,
    role_scope: buildRoleScope(currentUser),
    allowed_table: AI_PEGAWAI_TABLE,
    allowed_columns: [...AI_PEGAWAI_N8N_ALLOWED_COLUMNS],
    system_prompt: AI_PEGAWAI_SYSTEM_PROMPT
  };
}
