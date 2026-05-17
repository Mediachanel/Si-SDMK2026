function compact(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const STATUS_SYNONYMS = new Map([
  ["pns", "PNS"],
  ["pnss", "PNS"],
  ["cpns", "CPNS"],
  ["asn", "PNS"],
  ["pppk", "PPPK"],
  ["p3k", "PPPK"],
  ["nonpns", "NON PNS"],
  ["nonasn", "NON PNS"],
  ["pjlp", "PJLP"]
]);

const WILAYAH_SYNONYMS = new Map([
  ["jaktim", "Jakarta Timur"],
  ["jakartatimur", "Jakarta Timur"],
  ["jaktimr", "Jakarta Timur"],
  ["jaksel", "Jakarta Selatan"],
  ["jakartaselatan", "Jakarta Selatan"],
  ["jakbar", "Jakarta Barat"],
  ["jakartabarat", "Jakarta Barat"],
  ["jakpus", "Jakarta Pusat"],
  ["jakartapusat", "Jakarta Pusat"],
  ["jakut", "Jakarta Utara"],
  ["jakartautara", "Jakarta Utara"],
  ["kepseribu", "Kepulauan Seribu"],
  ["kepulauanseribu", "Kepulauan Seribu"]
]);

const DOCUMENT_SYNONYMS = new Map([
  ["sip", "SIP"],
  ["dokumnsip", "SIP"],
  ["dokumensip", "SIP"],
  ["str", "STR"],
  ["sk", "SK"],
  ["skp", "SKP"]
]);

export function normalizeStatus(value) {
  const key = compact(value);
  if (!key) return "";
  return STATUS_SYNONYMS.get(key) || String(value).trim().toUpperCase();
}

export function normalizeWilayah(value) {
  const key = compact(value);
  if (!key) return "";
  return WILAYAH_SYNONYMS.get(key) || String(value).trim();
}

export function normalizeJenisDokumen(value) {
  const key = compact(value);
  if (!key) return "";
  return DOCUMENT_SYNONYMS.get(key) || String(value).trim().toUpperCase();
}

export function normalizeHrisEntity(field, value) {
  if (field === "status_pegawai") return normalizeStatus(value);
  if (field === "wilayah") return normalizeWilayah(value);
  if (field === "jenis_dokumen") return normalizeJenisDokumen(value);
  return String(value || "").trim();
}
