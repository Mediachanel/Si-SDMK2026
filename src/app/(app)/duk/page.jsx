"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Eye, Search, SlidersHorizontal } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import { normalizePangkatGolonganOption } from "@/lib/pegawaiReferenceOptions";
import { escapeCsv } from "@/lib/security/csv";

const PANGKAT_RANK = [
  ["IV/e", "iv/e", "pembina utama"],
  ["IV/d", "iv/d", "pembina utama madya"],
  ["IV/c", "iv/c", "pembina utama muda"],
  ["IV/b", "iv/b", "pembina tk.i", "pembina tingkat i"],
  ["IV/a", "iv/a", "pembina"],
  ["III/d", "iii/d", "penata tk.i", "penata tingkat i"],
  ["III/c", "iii/c", "penata"],
  ["III/b", "iii/b", "penata muda tk.i", "penata muda tingkat i"],
  ["III/a", "iii/a", "penata muda"],
  ["II/d", "ii/d", "pengatur tk.i", "pengatur tingkat i"],
  ["II/c", "ii/c", "pengatur"],
  ["II/b", "ii/b", "pengatur muda tk.i", "pengatur muda tingkat i"],
  ["II/a", "ii/a", "pengatur muda"],
  ["I/d", "i/d", "juru tk.i", "juru tingkat i"],
  ["I/c", "i/c", "juru"],
  ["I/b", "i/b", "juru muda tk.i", "juru muda tingkat i"],
  ["I/a", "i/a", "juru muda"]
];

const EDUCATION_RANK = {
  S3: 12,
  SPESIALIS: 11,
  S2: 10,
  PROFESI: 9,
  S1: 8,
  D4: 7,
  D3: 6,
  D2: 5,
  D1: 4,
  "SMA/SMK": 3,
  SMA: 3,
  SMK: 3,
  SMP: 2,
  SD: 1
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function normalizePangkatText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\btingkat\b/g, "tk")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*\.\s*/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function hasGolonganCode(text, code) {
  const [group, level] = code.toLowerCase().split("/");
  const pattern = new RegExp(`(^|[^a-z0-9])${group}\\s*[/.]?\\s*${level}([^a-z0-9]|$)`);
  return pattern.test(text);
}

function pangkatRank(value) {
  const text = normalizePangkatText(value);
  const byCode = PANGKAT_RANK.findIndex(([code]) => hasGolonganCode(text, code));
  if (byCode !== -1) return byCode;

  const byName = PANGKAT_RANK.findIndex(([, , ...aliases]) => aliases.some((alias) => normalizePangkatText(alias) === text));
  return byName === -1 ? 999 : byName;
}

function educationRank(value) {
  const text = String(value || "").toUpperCase();
  const key = Object.keys(EDUCATION_RANK).find((item) => text.includes(item));
  return key ? EDUCATION_RANK[key] : 0;
}

function parseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T00:00:00`);
  const slash = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slash) return new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]));
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function timeValue(value) {
  const parsed = parseDate(value);
  return parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return value || "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
}

function valueOrDash(value) {
  return value || "-";
}

function formatPangkatGolongan(value) {
  const normalized = normalizePangkatGolonganOption(value);
  return valueOrDash(normalized || value);
}

function rankBadgeClass(number) {
  if (number <= 3) return "bg-govgold-100 text-govgold-700 ring-govgold-300";
  if (number <= 10) return "bg-dinkes-50 text-dinkes-700 ring-dinkes-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function pangkatBadgeClass(value) {
  const rank = pangkatRank(value);
  if (rank <= 4) return "bg-violet-50 text-violet-700 ring-violet-200";
  if (rank <= 9) return "bg-dinkes-50 text-dinkes-700 ring-dinkes-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function pendidikanLabel(item) {
  const jenjang = String(item?.jenjang_pendidikan || "").trim();
  const programStudi = String(item?.program_studi || "").trim();
  if (jenjang && programStudi) return `${jenjang} - ${programStudi}`;
  return jenjang || programStudi || "-";
}

function RankBadge({ number }) {
  return (
    <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-extrabold ring-1 ${rankBadgeClass(number)}`}>
      {number}
    </span>
  );
}

function PangkatBadge({ value }) {
  const text = formatPangkatGolongan(value);

  return (
    <span className={`inline-flex w-full max-w-[220px] items-center justify-center rounded-md px-3 py-1.5 text-center text-xs font-bold leading-5 ring-1 ${pangkatBadgeClass(value)}`} title={text}>
      <span className="truncate">{text}</span>
    </span>
  );
}

function DukSummary({ total, filtered, topPangkat }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total PNS</p>
        <p className="mt-1 text-2xl font-extrabold text-slate-950">{formatNumber(total)}</p>
      </article>
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Hasil Tampil</p>
        <p className="mt-1 text-2xl font-extrabold text-slate-950">{formatNumber(filtered)}</p>
      </article>
      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pangkat Tertinggi</p>
        <p className="mt-1 truncate text-base font-extrabold text-slate-950">{topPangkat || "-"}</p>
      </article>
    </div>
  );
}

function DukFilters({ search, setSearch, pangkat, setPangkat, jabatan, setJabatan, ukpd, setUkpd, pangkatOptions, jabatanOptions, ukpdOptions, hasActiveFilters, onReset }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-700">
        <SlidersHorizontal className="h-4 w-4" />
        Filter DUK
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_200px_minmax(220px,360px)_minmax(220px,360px)_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input
            className="input pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, NIP, jabatan, atau UKPD"
          />
        </label>
        <select className="input" value={pangkat} onChange={(event) => setPangkat(event.target.value)}>
          <option value="">Semua pangkat</option>
          {pangkatOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className="input" value={jabatan} onChange={(event) => setJabatan(event.target.value)}>
          <option value="">Semua jabatan</option>
          {jabatanOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className="input" value={ukpd} onChange={(event) => setUkpd(event.target.value)}>
          <option value="">Semua UKPD</option>
          {ukpdOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        {hasActiveFilters ? (
          <button className="btn-secondary" type="button" onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>
    </section>
  );
}

function DukTable({ rows, startNumber }) {
  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-col gap-1 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Ranking DUK Pegawai</h2>
          <p className="text-xs font-medium text-slate-500">Urutan tampil mengikuti aturan pangkat, TMT, pendidikan, lalu nama.</p>
        </div>
        <p className="hidden text-xs font-semibold text-slate-500 md:block">Geser horizontal untuk melihat semua kolom.</p>
      </div>
      <div className="grid gap-3 p-3 md:hidden">
        {rows.map((item, index) => {
          const number = startNumber + index;
          return (
            <article key={item.id_pegawai} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <RankBadge number={number} />
                <div className="min-w-0 flex-1">
                  <Link className="block truncate text-sm font-extrabold text-slate-950 hover:text-dinkes-700" href={`/pegawai/${item.id_pegawai}`}>
                    {valueOrDash(item.nama)}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">NIP {valueOrDash(item.nip)}</p>
                </div>
                <Link className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-dinkes-300 hover:text-dinkes-700" href={`/pegawai/${item.id_pegawai}`}>
                  Profil
                </Link>
              </div>
              <div className="mt-3 grid gap-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-500">Pangkat</span>
                  <span className="flex w-[180px] max-w-[58vw] justify-end">
                    <PangkatBadge value={item.pangkat_golongan} />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-500">TMT Pangkat</span>
                  <span className="font-semibold text-slate-800">{formatDate(item.tmt_pangkat_terakhir)}</span>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <p className="font-semibold text-slate-500">Jabatan</p>
                  <p className="mt-1 leading-5 text-slate-800">{valueOrDash(item.nama_jabatan_menpan)}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <p className="font-semibold text-slate-500">Pendidikan</p>
                  <p className="mt-1 leading-5 text-slate-800">{pendidikanLabel(item)}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <p className="font-semibold text-slate-500">Unit Kerja</p>
                  <p className="mt-1 leading-5 text-slate-800">{valueOrDash(item.nama_ukpd)}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="table-scroll hidden md:block">
        <table className="w-full min-w-[1570px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[280px]" />
            <col className="w-[200px]" />
            <col className="w-[140px]" />
            <col className="w-[280px]" />
            <col className="w-[220px]" />
            <col className="w-[260px]" />
            <col className="w-[116px]" />
          </colgroup>
          <thead>
            <tr>
              <th className="table-th sticky left-0 z-30 bg-[#f3f4f6] text-center uppercase" scope="col">No</th>
              <th className="table-th sticky left-[72px] z-30 bg-[#f3f4f6] uppercase" scope="col">Pegawai</th>
              <th className="table-th uppercase" scope="col">Pangkat/Gol</th>
              <th className="table-th uppercase" scope="col">TMT Pangkat</th>
              <th className="table-th uppercase" scope="col">Jabatan</th>
              <th className="table-th uppercase" scope="col">Pendidikan</th>
              <th className="table-th uppercase" scope="col">Unit Kerja</th>
              <th className="table-th sticky right-0 z-30 bg-[#f3f4f6] text-center uppercase" scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((item, index) => {
              const number = startNumber + index;
              return (
                <tr key={item.id_pegawai} className="group align-top hover:bg-dinkes-50/40">
                  <td className="table-td sticky left-0 z-20 bg-white text-center group-hover:bg-dinkes-50/40">
                    <RankBadge number={number} />
                  </td>
                  <td className="table-td sticky left-[72px] z-20 bg-white group-hover:bg-dinkes-50/40">
                    <Link className="block truncate text-sm font-extrabold leading-5 text-slate-950 hover:text-dinkes-700" href={`/pegawai/${item.id_pegawai}`}>
                      {valueOrDash(item.nama)}
                    </Link>
                    <p className="mt-1 truncate text-xs leading-5 text-slate-500">NIP {valueOrDash(item.nip)}</p>
                  </td>
                  <td className="table-td text-center">
                    <PangkatBadge value={item.pangkat_golongan} />
                  </td>
                  <td className="table-td font-semibold text-slate-700">{formatDate(item.tmt_pangkat_terakhir)}</td>
                  <td className="table-td whitespace-normal leading-5 text-slate-700">
                    <p className="line-clamp-3">{valueOrDash(item.nama_jabatan_menpan)}</p>
                  </td>
                  <td className="table-td whitespace-normal">
                    <p className="text-sm font-bold text-slate-950">{valueOrDash(item.jenjang_pendidikan)}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{valueOrDash(item.program_studi)}</p>
                  </td>
                  <td className="table-td whitespace-normal leading-5 text-slate-700">
                    <p className="line-clamp-3">{valueOrDash(item.nama_ukpd)}</p>
                  </td>
                  <td className="table-td sticky right-0 z-20 bg-white text-center group-hover:bg-dinkes-50/40">
                  <Link
                    href={`/pegawai/${item.id_pegawai}`}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-dinkes-300 hover:text-dinkes-700"
                  >
                    <Eye className="h-4 w-4" />
                    Profil
                  </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!rows.length ? (
        <div className="px-4 py-10 text-center text-sm font-medium text-slate-500">
          Tidak ada pegawai yang sesuai dengan filter.
        </div>
      ) : null}
    </section>
  );
}

function Pagination({ page, setPage, pageSize, setPageSize, total }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        Menampilkan <span className="font-bold text-slate-900">{formatNumber(start)}-{formatNumber(end)}</span> dari <span className="font-bold text-slate-900">{formatNumber(total)}</span> pegawai.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-24 py-2" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
          {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        <button className="btn-secondary px-3 py-2" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-24 text-center font-bold text-slate-800">Hal {page} / {totalPages}</span>
        <button className="btn-secondary px-3 py-2" type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

export default function DukPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [pangkat, setPangkat] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [ukpd, setUkpd] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage("");
    fetch("/api/duk")
      .then((res) => res.json())
      .then((payload) => {
        if (!payload?.success) throw new Error(payload?.message || "Data DUK gagal dimuat.");
        if (active) setRows(payload.data || []);
      })
      .catch((error) => {
        if (active) {
          setRows([]);
          setErrorMessage(error.message || "Data DUK gagal dimuat.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [jabatan, pangkat, search, ukpd]);

  const pangkatOptions = useMemo(() => [...new Set(rows.map((item) => formatPangkatGolongan(item.pangkat_golongan)).filter((item) => item !== "-"))].sort((a, b) => pangkatRank(a) - pangkatRank(b) || a.localeCompare(b, "id")), [rows]);
  const jabatanOptions = useMemo(() => [...new Set(rows.map((item) => item.nama_jabatan_menpan).filter(Boolean))], [rows]);
  const ukpdOptions = useMemo(() => [...new Set(rows.map((item) => item.nama_ukpd).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id")), [rows]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return rows.filter((item) => {
      const matchSearch = [item.nama, item.nip, item.nama_ukpd, item.nama_jabatan_menpan, item.program_studi].join(" ").toLowerCase().includes(query);
      return matchSearch
        && (!pangkat || formatPangkatGolongan(item.pangkat_golongan) === pangkat)
        && (!jabatan || item.nama_jabatan_menpan === jabatan)
        && (!ukpd || item.nama_ukpd === ukpd);
    }).sort((a, b) => (
      pangkatRank(a.pangkat_golongan) - pangkatRank(b.pangkat_golongan)
      || timeValue(a.tmt_pangkat_terakhir) - timeValue(b.tmt_pangkat_terakhir)
      || educationRank(b.jenjang_pendidikan) - educationRank(a.jenjang_pendidikan)
      || String(a.nama || "").localeCompare(String(b.nama || ""))
    ));
  }, [jabatan, pangkat, rows, search, ukpd]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const topPangkat = formatPangkatGolongan(filtered.find((item) => item.pangkat_golongan)?.pangkat_golongan);
  const hasActiveFilters = Boolean(search || pangkat || jabatan || ukpd);

  function exportDuk() {
    const headers = ["No", "Nama", "NIP", "Pangkat/Gol", "TMT Pangkat", "Jabatan", "Pendidikan", "Unit Kerja"];
    const lines = [
      headers.map(escapeCsv).join(","),
      ...filtered.map((item, index) => [
        index + 1,
        item.nama,
        item.nip,
        formatPangkatGolongan(item.pangkat_golongan),
        item.tmt_pangkat_terakhir,
        item.nama_jabatan_menpan,
        pendidikanLabel(item),
        item.nama_ukpd
      ].map(escapeCsv).join(","))
    ];
    const blob = new Blob(["\uFEFF", lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "daftar-urut-kepangkatan.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Daftar Urut Kepangkatan"
        description="Urutan berdasarkan pangkat tertinggi, TMT pangkat terlama, lalu pendidikan tertinggi."
        breadcrumbs={[{ label: "DUK" }]}
        action={<button className="btn-secondary" type="button" onClick={exportDuk}><Download className="h-4 w-4" /> Export CSV</button>}
      />

      <DukSummary total={rows.length} filtered={filtered.length} topPangkat={topPangkat} />
      <DukFilters
        search={search}
        setSearch={setSearch}
        pangkat={pangkat}
        setPangkat={setPangkat}
        jabatan={jabatan}
        setJabatan={setJabatan}
        ukpd={ukpd}
        setUkpd={setUkpd}
        pangkatOptions={pangkatOptions}
        jabatanOptions={jabatanOptions}
        ukpdOptions={ukpdOptions}
        hasActiveFilters={hasActiveFilters}
        onReset={() => {
          setSearch("");
          setPangkat("");
          setJabatan("");
          setUkpd("");
          setPage(1);
        }}
      />

      {loading ? (
        <div className="h-80 animate-pulse rounded-lg bg-white" />
      ) : errorMessage ? (
        <ErrorState description={errorMessage} onRetry={() => setRefreshKey((value) => value + 1)} />
      ) : (
        <>
          <DukTable rows={paginatedRows} startNumber={(safePage - 1) * pageSize + 1} />
          <Pagination page={safePage} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} />
        </>
      )}
    </div>
  );
}
