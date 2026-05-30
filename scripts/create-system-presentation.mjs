import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const outPath = path.resolve("Paparan_Sistem_Informasi_SDMK.pptx");

const EMU = 914400;
const SLIDE_W = 13.333 * EMU;
const SLIDE_H = 7.5 * EMU;

const colors = {
  navy: "153E75",
  blue: "2563EB",
  cyan: "0891B2",
  green: "16A34A",
  amber: "D97706",
  red: "DC2626",
  slate: "334155",
  gray: "64748B",
  light: "F8FAFC",
  line: "CBD5E1",
  white: "FFFFFF"
};

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emu(inch) {
  return Math.round(inch * EMU);
}

function shape(id, name, x, y, w, h, fill = colors.white, line = colors.line, radius = false) {
  return `
    <p:sp>
      <p:nvSpPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm>
        <a:prstGeom prst="${radius ? "roundRect" : "rect"}"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>
        <a:ln w="9525"><a:solidFill><a:srgbClr val="${line}"/></a:solidFill></a:ln>
      </p:spPr>
    </p:sp>`;
}

function textRun(text, size = 2200, color = colors.slate, bold = false) {
  return `<a:r><a:rPr lang="id-ID" sz="${size}" ${bold ? 'b="1"' : ""}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${esc(text)}</a:t></a:r>`;
}

function para(text, opts = {}) {
  const {
    size = 2200,
    color = colors.slate,
    bold = false,
    bullet = false,
    level = 0,
    align = "l",
    spaceAfter = 500
  } = opts;
  const bulletXml = bullet ? `<a:buChar char="•"/>` : "<a:buNone/>";
  const marL = bullet ? 285750 + level * 228600 : 0;
  const indent = bullet ? -171450 : 0;
  return `<a:p><a:pPr algn="${align}" marL="${marL}" indent="${indent}">${bulletXml}<a:spcAft><a:spcPts val="${spaceAfter}"/></a:spcAft></a:pPr>${textRun(text, size, color, bold)}<a:endParaRPr lang="id-ID" sz="${size}"/></a:p>`;
}

function textbox(id, x, y, w, h, paragraphs, fill = "transparent", line = "transparent", radius = false) {
  const fillXml = fill === "transparent" ? "<a:noFill/>" : `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>`;
  const lineXml = line === "transparent" ? "<a:ln><a:noFill/></a:ln>" : `<a:ln w="9525"><a:solidFill><a:srgbClr val="${line}"/></a:solidFill></a:ln>`;
  return `
    <p:sp>
      <p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm>
        <a:prstGeom prst="${radius ? "roundRect" : "rect"}"><a:avLst/></a:prstGeom>
        ${fillXml}
        ${lineXml}
      </p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square" anchor="t"><a:spAutoFit/></a:bodyPr>
        <a:lstStyle/>
        ${paragraphs.join("")}
      </p:txBody>
    </p:sp>`;
}

function titleBlock(title, subtitle) {
  return [
    shape(2, "Header Band", 0, 0, 13.333, 0.58, colors.navy, colors.navy),
    textbox(3, 0.48, 0.12, 8.9, 0.35, [para("Sistem Informasi SDM Kesehatan DKI Jakarta", { size: 1200, color: colors.white, bold: true })]),
    textbox(4, 0.62, 0.92, 8.8, 0.62, [para(title, { size: 2800, color: colors.navy, bold: true, spaceAfter: 0 })]),
    subtitle ? textbox(5, 0.62, 1.46, 10.8, 0.36, [para(subtitle, { size: 1300, color: colors.gray, spaceAfter: 0 })]) : ""
  ].join("");
}

function slideXml(slideNo, bodyXml, background = colors.light) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="${background}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(SLIDE_W)}" cy="${Math.round(SLIDE_H)}"/><a:chOff x="0" y="0"/><a:chExt cx="${Math.round(SLIDE_W)}" cy="${Math.round(SLIDE_H)}"/></a:xfrm></p:grpSpPr>
      ${bodyXml}
      ${textbox(900 + slideNo, 11.75, 7.02, 0.9, 0.24, [para(String(slideNo), { size: 900, color: colors.gray, align: "r", spaceAfter: 0 })])}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function coverSlide() {
  return slideXml(1, [
    shape(2, "Cover Background", 0, 0, 13.333, 7.5, colors.navy, colors.navy),
    shape(3, "Accent", 0, 6.78, 13.333, 0.72, colors.cyan, colors.cyan),
    textbox(4, 0.82, 1.26, 10.7, 1.55, [
      para("Paparan Sistem Informasi", { size: 3600, color: colors.white, bold: true, spaceAfter: 0 }),
      para("SDM Kesehatan DKI Jakarta", { size: 3600, color: colors.white, bold: true, spaceAfter: 0 })
    ]),
    textbox(5, 0.88, 3.18, 8.8, 1.0, [
      para("HRIS internal untuk pengelolaan data pegawai, UKPD, riwayat kepegawaian, usulan administrasi, audit log, dan integrasi AI/n8n.", { size: 1700, color: "DBEAFE", spaceAfter: 0 })
    ]),
    textbox(6, 0.9, 6.92, 8.8, 0.34, [
      para("Disusun dari struktur aplikasi dan database proyek", { size: 1050, color: colors.white, spaceAfter: 0 })
    ])
  ].join(""), colors.navy);
}

function agendaSlide() {
  const items = ["Gambaran umum sistem", "Tujuan dan manfaat", "Modul utama aplikasi", "Struktur database", "Alur kerja pengguna", "Keamanan dan audit", "Integrasi AI dan n8n", "Kesimpulan dan pengembangan"];
  return slideXml(2, titleBlock("Agenda Paparan", "Urutan pembahasan sistem dari sisi fungsi, data, keamanan, dan AI.") +
    items.map((item, i) => textbox(20 + i, 0.95 + (i % 2) * 6.1, 2.05 + Math.floor(i / 2) * 0.9, 5.3, 0.5, [
      para(`${i + 1}. ${item}`, { size: 1500, color: colors.slate, bold: true, spaceAfter: 0 })
    ], colors.white, colors.line, true)).join(""));
}

function bulletsSlide(no, title, subtitle, bullets, accent = colors.blue) {
  return slideXml(no, titleBlock(title, subtitle) +
    shape(20, "Accent Bar", 0.62, 2.02, 0.12, 4.72, accent, accent, true) +
    textbox(21, 0.95, 2.05, 11.45, 4.85, bullets.map((b) => para(b, { bullet: true, size: 1450, color: colors.slate, spaceAfter: 650 })), colors.white, colors.line, true));
}

function moduleSlide() {
  const modules = [
    ["Data Pegawai", "Master pegawai, identitas, jabatan, pendidikan, pangkat, kontak, dan status."],
    ["UKPD & Wilayah", "Master unit kerja serta pembatasan akses berdasarkan UKPD/wilayah."],
    ["DRH Pegawai", "Alamat, keluarga, jabatan, pangkat, pendidikan, SKP, penghargaan, disiplin."],
    ["Usulan", "Mutasi dan pemutusan jabatan fungsional lengkap dengan status dan dokumen."],
    ["PLT/PLH", "Monitoring pejabat sementara, jabatan tujuan, dan periode penugasan."],
    ["AI & QnA", "Chat internal, QnA publik, knowledge base, audit AI, dan workflow n8n."]
  ];
  return slideXml(5, titleBlock("Modul Utama Aplikasi", "Fitur disusun untuk mendukung operasional kepegawaian end-to-end.") +
    modules.map((m, i) => textbox(30 + i, 0.72 + (i % 3) * 4.18, 2.0 + Math.floor(i / 3) * 1.92, 3.7, 1.35, [
      para(m[0], { size: 1450, color: colors.navy, bold: true, spaceAfter: 250 }),
      para(m[1], { size: 1050, color: colors.slate, spaceAfter: 0 })
    ], colors.white, colors.line, true)).join(""));
}

function dbSlide() {
  const groups = [
    ["Core HRIS", "ukpd, pegawai, alamat, keluarga, riwayat_jabatan, riwayat_pangkat, riwayat_pendidikan"],
    ["Administrasi", "usulan_mutasi, usulan_pjf_stop, pejabat_plt_plh"],
    ["Keamanan", "roles, app_users, audit_logs, ukpd_passkeys"],
    ["AI & Chat", "ai_documents, ai_extraction_results, chat_sessions, internal_chat_sessions, ai_agent_tasks"],
    ["Knowledge Base", "knowledge_documents, knowledge_chunks, knowledge_embeddings, qna_category, qna_item"],
    ["Workflow", "ai_workflows, ai_workflow_runs, ai_workflow_node_runs, ai_workflow_logs"]
  ];
  return slideXml(7, titleBlock("Struktur Database", "Database PostgreSQL berpusat pada tabel pegawai dan UKPD.") +
    groups.map((g, i) => textbox(50 + i, 0.72 + (i % 2) * 6.1, 1.92 + Math.floor(i / 2) * 1.48, 5.25, 1.05, [
      para(g[0], { size: 1250, color: colors.navy, bold: true, spaceAfter: 180 }),
      para(g[1], { size: 830, color: colors.slate, spaceAfter: 0 })
    ], colors.white, colors.line, true)).join(""));
}

function relationSlide() {
  return slideXml(8, titleBlock("Relasi Data Utama", "Pegawai menjadi pusat data, lalu terhubung ke unit kerja, riwayat, usulan, dan AI.") +
    textbox(20, 0.9, 2.0, 2.4, 0.75, [para("UKPD", { size: 1700, color: colors.white, bold: true, align: "c", spaceAfter: 0 })], colors.navy, colors.navy, true) +
    textbox(21, 5.35, 2.0, 2.7, 0.75, [para("PEGAWAI", { size: 1700, color: colors.white, bold: true, align: "c", spaceAfter: 0 })], colors.blue, colors.blue, true) +
    textbox(22, 9.85, 1.35, 2.45, 0.72, [para("DRH / Riwayat", { size: 1250, color: colors.white, bold: true, align: "c", spaceAfter: 0 })], colors.cyan, colors.cyan, true) +
    textbox(23, 9.85, 2.45, 2.45, 0.72, [para("Usulan", { size: 1250, color: colors.white, bold: true, align: "c", spaceAfter: 0 })], colors.green, colors.green, true) +
    textbox(24, 9.85, 3.55, 2.45, 0.72, [para("Audit & AI", { size: 1250, color: colors.white, bold: true, align: "c", spaceAfter: 0 })], colors.amber, colors.amber, true) +
    textbox(25, 0.92, 4.7, 11.3, 1.25, [
      para("Makna relasi:", { size: 1250, color: colors.navy, bold: true, spaceAfter: 250 }),
      para("Satu UKPD memiliki banyak pegawai. Setiap pegawai dapat memiliki banyak riwayat dan dokumen pendukung. Proses administrasi seperti mutasi, pemutusan JF, dan PLT/PLH memakai data pegawai sebagai referensi.", { size: 1120, color: colors.slate, spaceAfter: 0 })
    ], colors.white, colors.line, true));
}

function workflowSlide() {
  const steps = [
    ["Login", "User masuk dan sistem membaca role."],
    ["Scope Data", "Data difilter sesuai Super Admin, Wilayah, atau UKPD."],
    ["Kelola Data", "User membuka dashboard, pegawai, DRH, usulan, PLT/PLH."],
    ["Audit", "Perubahan penting dicatat ke audit log."],
    ["AI/n8n", "Pertanyaan dikirim ke n8n dan dijawab dari tool resmi."]
  ];
  return slideXml(9, titleBlock("Alur Kerja Sistem", "Sistem mengutamakan validasi role, pembatasan data, dan pencatatan aktivitas.") +
    steps.map((s, i) => textbox(30 + i, 0.55 + i * 2.5, 2.25, 2.05, 1.45, [
      para(String(i + 1), { size: 1200, color: colors.white, bold: true, align: "c", spaceAfter: 100 }),
      para(s[0], { size: 1150, color: colors.white, bold: true, align: "c", spaceAfter: 120 }),
      para(s[1], { size: 780, color: "E0F2FE", align: "c", spaceAfter: 0 })
    ], i % 2 ? colors.cyan : colors.blue, i % 2 ? colors.cyan : colors.blue, true)).join("") +
    textbox(50, 0.85, 5.08, 11.5, 0.9, [
      para("Alur ini menjaga agar data yang tampil dan diproses selalu sesuai kewenangan pengguna.", { size: 1350, color: colors.slate, bold: true, align: "c", spaceAfter: 0 })
    ], colors.white, colors.line, true));
}

function aiSlide() {
  return slideXml(12, titleBlock("Integrasi AI dan n8n", "AI bekerja melalui workflow resmi, bukan langsung menulis ke database.") +
    textbox(20, 0.75, 2.0, 3.15, 3.7, [
      para("Input", { size: 1350, color: colors.navy, bold: true }),
      para("Chat internal", { bullet: true, size: 1050 }),
      para("Public QnA", { bullet: true, size: 1050 }),
      para("Dokumen pegawai", { bullet: true, size: 1050 })
    ], colors.white, colors.line, true) +
    textbox(21, 5.05, 2.0, 3.15, 3.7, [
      para("n8n Orchestrator", { size: 1350, color: colors.navy, bold: true }),
      para("Klasifikasi intent", { bullet: true, size: 1050 }),
      para("Ekstraksi entity", { bullet: true, size: 1050 }),
      para("Panggil tool internal", { bullet: true, size: 1050 }),
      para("Verifikasi hasil", { bullet: true, size: 1050 })
    ], colors.white, colors.line, true) +
    textbox(22, 9.35, 2.0, 3.15, 3.7, [
      para("Output", { size: 1350, color: colors.navy, bold: true }),
      para("Jawaban berbasis data", { bullet: true, size: 1050 }),
      para("Confidence score", { bullet: true, size: 1050 }),
      para("Audit log", { bullet: true, size: 1050 }),
      para("Draft approval bila ada perubahan", { bullet: true, size: 1050 })
    ], colors.white, colors.line, true));
}

const slides = [
  coverSlide(),
  agendaSlide(),
  bulletsSlide(3, "Gambaran Umum", "Aplikasi HRIS internal untuk pengelolaan SDM Kesehatan DKI Jakarta.", [
    "Aplikasi berbasis web dengan Next.js dan PostgreSQL.",
    "Mengelola data pegawai, UKPD, riwayat kepegawaian, usulan, monitoring PLT/PLH, QnA, dan AI Assistant.",
    "Dirancang untuk data terpusat, pencarian cepat, pembatasan akses, dan audit perubahan.",
    "Mendukung integrasi AI melalui n8n agar jawaban tetap berasal dari tool dan data yang terverifikasi."
  ], colors.blue),
  bulletsSlide(4, "Tujuan dan Manfaat", "Sistem membantu pekerjaan administrasi kepegawaian agar lebih rapi dan terukur.", [
    "Menyediakan satu sumber data pegawai yang lengkap dan konsisten.",
    "Mempercepat pencarian data berdasarkan nama, NIP, NRK, UKPD, wilayah, jabatan, pangkat, atau pendidikan.",
    "Mendukung proses usulan mutasi, pemutusan jabatan fungsional, dan monitoring PLT/PLH.",
    "Meningkatkan keamanan melalui role-based access control dan audit log.",
    "Menyiapkan fondasi AI Assistant untuk ringkasan, pencarian, dan validasi data."
  ], colors.green),
  moduleSlide(),
  bulletsSlide(6, "Data Utama Pegawai", "Tabel pegawai menyimpan profil utama SDM kesehatan.", [
    "Identitas: nama, NIK, NIP, NRK, jenis kelamin, tempat dan tanggal lahir, agama.",
    "Organisasi: nama UKPD, jenis UKPD, wilayah, jenis pegawai, status rumpun, jenis kontrak.",
    "Jabatan dan karier: jabatan ORB, jabatan Menpan, struktur atasan, pangkat/golongan, TMT pangkat.",
    "Pendidikan dan kontak: jenjang pendidikan, program studi, universitas, nomor HP, email, BPJS.",
    "Status: kondisi pegawai, status perkawinan, gelar depan/belakang, TMT kerja UKPD."
  ], colors.cyan),
  dbSlide(),
  relationSlide(),
  workflowSlide(),
  bulletsSlide(10, "Hak Akses Pengguna", "Setiap pengguna hanya boleh melihat data sesuai kewenangannya.", [
    "Super Admin dapat melihat dan mengelola seluruh data lintas UKPD dan wilayah.",
    "Admin Wilayah dibatasi pada data pegawai di wilayah yang menjadi tanggung jawabnya.",
    "Admin UKPD dibatasi pada pegawai di UKPD masing-masing.",
    "Public user hanya dapat mengakses QnA publik dan tidak boleh membaca data pegawai.",
    "Scope akses ikut dikirim ke tool AI agar AI tetap patuh terhadap batas kewenangan."
  ], colors.navy),
  bulletsSlide(11, "Keamanan dan Audit", "Sistem dirancang agar perubahan data dapat ditelusuri.", [
    "Autentikasi menggunakan akun aplikasi dan token/cookie aman.",
    "Role-based access control diterapkan pada halaman dan API.",
    "Aktivitas penting dicatat di audit_logs dan ai audit log.",
    "Data sensitif seperti NIK, NIP, NRK, dan nomor kontak dapat dimasking saat dipakai AI.",
    "AI tidak boleh langsung mengubah tabel pegawai; perubahan harus melalui draft dan approval."
  ], colors.red),
  aiSlide(),
  bulletsSlide(13, "Dokumen AI dan Knowledge Base", "Sistem mendukung ekstraksi dokumen dan pengetahuan berbasis RAG.", [
    "Dokumen dapat disimpan di ai_documents lengkap dengan metadata file, hash, status, dan klasifikasi.",
    "Hasil ekstraksi AI disimpan di ai_extraction_results dan masuk ke ai_validation_queue untuk review admin.",
    "Knowledge base disimpan sebagai dokumen, chunk, dan embedding.",
    "pg_trgm membantu fuzzy search ketika nama atau kata kunci salah ketik.",
    "pgvector disiapkan untuk pencarian berbasis embedding."
  ], colors.amber),
  bulletsSlide(14, "Keunggulan Sistem", "Nilai utama sistem untuk operasional SDM kesehatan.", [
    "Data SDM kesehatan lebih terstruktur dan terpusat.",
    "Mendukung pengambilan keputusan dari dashboard dan ringkasan data.",
    "Proses administrasi kepegawaian lebih mudah dipantau.",
    "Akses data lebih aman karena mengikuti role dan scope organisasi.",
    "Siap dikembangkan menjadi HRIS berbasis AI dengan workflow n8n."
  ], colors.green),
  bulletsSlide(15, "Rencana Pengembangan", "Beberapa arah pengembangan yang sudah disiapkan oleh arsitektur sistem.", [
    "Penyempurnaan approval executor untuk perubahan data yang diusulkan AI.",
    "Penguatan dashboard analitik berdasarkan UKPD, wilayah, jabatan, pendidikan, dan status pegawai.",
    "Integrasi dokumen kepegawaian dengan validasi AI yang tetap direview manusia.",
    "Perluasan knowledge base internal untuk kebijakan dan SOP kepegawaian.",
    "Optimasi pencarian pegawai dengan fuzzy search dan vector search."
  ], colors.cyan),
  bulletsSlide(16, "Kesimpulan", "Sistem ini adalah fondasi HRIS modern untuk SDM Kesehatan DKI Jakarta.", [
    "Aplikasi menggabungkan manajemen data pegawai, DRH, usulan, monitoring jabatan, keamanan, audit, dan AI.",
    "Database berpusat pada tabel pegawai dan UKPD, lalu diperluas ke riwayat, administrasi, chat, knowledge base, dan workflow.",
    "Model keamanan memastikan data hanya tampil sesuai kewenangan.",
    "Integrasi AI/n8n membantu pencarian dan ringkasan data tanpa mengorbankan kontrol perubahan.",
    "Sistem siap menjadi platform kerja administrasi SDM yang lebih cepat, akurat, dan akuntabel."
  ], colors.navy)
];

const zip = new JSZip();

zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("\n  ")}
</Types>`);

zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);

zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Paparan Sistem Informasi SDM Kesehatan</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`);

zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex PPTX Generator</Application>
  <PresentationFormat>On-screen Show (16:9)</PresentationFormat>
  <Slides>${slides.length}</Slides>
  <Company>Dinas Kesehatan Provinsi DKI Jakarta</Company>
</Properties>`);

zip.file("ppt/presentation.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("\n    ")}
  </p:sldIdLst>
  <p:sldSz cx="${Math.round(SLIDE_W)}" cy="${Math.round(SLIDE_H)}" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
  <p:defaultTextStyle/>
</p:presentation>`);

zip.file("ppt/_rels/presentation.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slides.map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("\n  ")}
</Relationships>`);

zip.file("ppt/slideMasters/slideMaster1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(SLIDE_W)}" cy="${Math.round(SLIDE_H)}"/><a:chOff x="0" y="0"/><a:chExt cx="${Math.round(SLIDE_W)}" cy="${Math.round(SLIDE_H)}"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`);

zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`);

zip.file("ppt/slideLayouts/slideLayout1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(SLIDE_W)}" cy="${Math.round(SLIDE_H)}"/><a:chOff x="0" y="0"/><a:chExt cx="${Math.round(SLIDE_W)}" cy="${Math.round(SLIDE_H)}"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`);

zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`);

zip.file("ppt/theme/theme1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="SI SDMK Theme">
  <a:themeElements>
    <a:clrScheme name="SI SDMK"><a:dk1><a:srgbClr val="0F172A"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="153E75"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="2563EB"/></a:accent1><a:accent2><a:srgbClr val="0891B2"/></a:accent2><a:accent3><a:srgbClr val="16A34A"/></a:accent3><a:accent4><a:srgbClr val="D97706"/></a:accent4><a:accent5><a:srgbClr val="DC2626"/></a:accent5><a:accent6><a:srgbClr val="64748B"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme>
    <a:fontScheme name="Aptos"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="Default"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>`);

slides.forEach((slide, i) => {
  zip.file(`ppt/slides/slide${i + 1}.xml`, slide);
  zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`);
});

const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
fs.writeFileSync(outPath, buffer);
console.log(outPath);
