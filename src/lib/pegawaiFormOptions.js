import { getPegawaiData, getUkpdData } from "@/lib/data/pegawaiStore";
import { JABATAN_STANDAR_OPTIONS, normalizeJabatanStandarOption } from "@/lib/jabatanStandar";
import {
  AGAMA_OPTIONS,
  JENIS_KONTRAK_OPTIONS,
  PANGKAT_GOLONGAN_OPTIONS,
  normalizeAgamaOption,
  normalizeJenisKontrakOption,
  normalizePangkatGolonganOption
} from "@/lib/pegawaiReferenceOptions";

const PENDIDIKAN_OPTIONS = ["SD", "SMP", "SMA", "D3", "D4", "S1", "S2", "S3", "PROFESI"];
const JABATAN_ORB_FALLBACK_OPTIONS = ["Wakil Kepala Dinas"];

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUpper(value) {
  return normalizeText(value).toUpperCase();
}

function uniqueSorted(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
}

function addError(errors, field, message) {
  if (!errors[field]) {
    errors[field] = [];
  }
  errors[field].push(message);
}

function validateValue(errors, field, value, allowed, message, normalize = normalizeText) {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return;
  if (!allowed.includes(normalizedValue)) {
    addError(errors, field, message);
  }
}

export async function getPegawaiFormOptions() {
  const [pegawaiRows, ukpdRows] = await Promise.all([getPegawaiData(), getUkpdData()]);

  const statusRumpunOptions = uniqueSorted(pegawaiRows.map((item) => item.status_rumpun));
  const jabatanOrbOptions = uniqueSorted([...JABATAN_ORB_FALLBACK_OPTIONS, ...pegawaiRows.map((item) => item.nama_jabatan_orb)]);
  const ukpdOptions = uniqueSorted(ukpdRows.map((item) => item.nama_ukpd));
  const pendidikanOptions = uniqueSorted([...PENDIDIKAN_OPTIONS, ...pegawaiRows.map((item) => normalizeUpper(item.jenjang_pendidikan))]);

  return {
    agamaOptions: AGAMA_OPTIONS,
    jenisKontrakOptions: JENIS_KONTRAK_OPTIONS,
    pendidikanOptions,
    statusRumpunOptions,
    jabatanMenpanOptions: JABATAN_STANDAR_OPTIONS,
    jabatanStandarOptions: JABATAN_STANDAR_OPTIONS,
    jabatanOrbOptions,
    pangkatGolonganOptions: PANGKAT_GOLONGAN_OPTIONS,
    ukpdOptions
  };
}

export async function validatePegawaiReferenceFields(payload) {
  const options = await getPegawaiFormOptions();
  const errors = {};

  const checks = [
    ["agama", options.agamaOptions, normalizeAgamaOption, "Agama harus dipilih dari daftar yang tersedia."],
    ["jenis_kontrak", options.jenisKontrakOptions, normalizeJenisKontrakOption, "Jenis kontrak harus dipilih dari daftar yang tersedia."],
    ["status_rumpun", options.statusRumpunOptions],
    ["nama_jabatan_menpan", options.jabatanMenpanOptions, normalizeJabatanStandarOption, "Jabatan Kepgub 11 harus dipilih dari daftar jabatan_standar."],
    ["nama_jabatan_orb", options.jabatanOrbOptions],
    ["pangkat_golongan", options.pangkatGolonganOptions, normalizePangkatGolonganOption],
    ["nama_ukpd", options.ukpdOptions]
  ];

  for (const [field, allowed, normalize = normalizeText, message] of checks) {
    validateValue(errors, field, payload?.[field], allowed, message || `${field} harus dipilih dari daftar yang tersedia.`, normalize);
  }

  validateValue(
    errors,
    "jenjang_pendidikan",
    payload?.jenjang_pendidikan,
    options.pendidikanOptions,
    "Jenjang pendidikan harus dipilih dari daftar yang tersedia.",
    normalizeUpper
  );

  for (const [index, row] of Array.isArray(payload?.riwayat_pendidikan) ? payload.riwayat_pendidikan.entries() : []) {
    validateValue(
      errors,
      `riwayat_pendidikan.${index}.jenjang_pendidikan`,
      row?.jenjang_pendidikan,
      options.pendidikanOptions,
      "Jenjang pendidikan riwayat harus dipilih dari daftar yang tersedia.",
      normalizeUpper
    );
  }

  for (const [index, row] of Array.isArray(payload?.riwayat_prestasi_pendidikan) ? payload.riwayat_prestasi_pendidikan.entries() : []) {
    validateValue(
      errors,
      `riwayat_prestasi_pendidikan.${index}.jenjang_pendidikan`,
      row?.jenjang_pendidikan,
      options.pendidikanOptions,
      "Jenjang pendidikan prestasi harus dipilih dari daftar yang tersedia.",
      normalizeUpper
    );
  }

  for (const [index, row] of Array.isArray(payload?.riwayat_jabatan) ? payload.riwayat_jabatan.entries() : []) {
    validateValue(errors, `riwayat_jabatan.${index}.nama_ukpd`, row?.nama_ukpd, options.ukpdOptions, "UKPD riwayat jabatan harus dipilih dari daftar yang tersedia.");
    validateValue(errors, `riwayat_jabatan.${index}.status_rumpun`, row?.status_rumpun, options.statusRumpunOptions, "Rumpun riwayat jabatan harus dipilih dari daftar yang tersedia.");
    validateValue(errors, `riwayat_jabatan.${index}.nama_jabatan_menpan`, row?.nama_jabatan_menpan, options.jabatanMenpanOptions, "Jabatan Kepgub 11 riwayat harus dipilih dari daftar jabatan_standar.", normalizeJabatanStandarOption);
    validateValue(errors, `riwayat_jabatan.${index}.nama_jabatan_orb`, row?.nama_jabatan_orb, options.jabatanOrbOptions, "Jabatan ORB riwayat harus dipilih dari daftar yang tersedia.");
    validateValue(errors, `riwayat_jabatan.${index}.pangkat_golongan`, row?.pangkat_golongan, options.pangkatGolonganOptions, "Pangkat/golongan riwayat jabatan harus dipilih dari daftar yang tersedia.", normalizePangkatGolonganOption);
  }

  for (const [index, row] of Array.isArray(payload?.riwayat_pangkat) ? payload.riwayat_pangkat.entries() : []) {
    validateValue(errors, `riwayat_pangkat.${index}.pangkat_golongan`, row?.pangkat_golongan, options.pangkatGolonganOptions, "Pangkat/golongan riwayat pangkat harus dipilih dari daftar yang tersedia.", normalizePangkatGolonganOption);
  }

  for (const [index, row] of Array.isArray(payload?.riwayat_gaji_pokok) ? payload.riwayat_gaji_pokok.entries() : []) {
    validateValue(errors, `riwayat_gaji_pokok.${index}.pangkat_golongan`, row?.pangkat_golongan, options.pangkatGolonganOptions, "Pangkat/golongan riwayat gaji harus dipilih dari daftar yang tersedia.", normalizePangkatGolonganOption);
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    options
  };
}
