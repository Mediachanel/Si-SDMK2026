"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BarChart3, BriefcaseMedical, Building2, ChevronDown, ChevronRight, Download, GraduationCap, Home, MapPinned, Network, PieChart, Search, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import KpiCard from "@/components/cards/KpiCard";
import DataTable from "@/components/tables/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import ErrorState from "@/components/ui/ErrorState";
import { escapeCsv } from "@/lib/security/csv";

const DashboardChartCard = dynamic(() => import("@/components/charts/DashboardChartCard"), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-lg border border-slate-200 bg-white" />
});

const analyticsTabs = [
  { id: "ukpd", label: "Daftar UKPD" },
  { id: "rumpun", label: "Rumpun Jabatan" },
  { id: "jabatan", label: "Jabatan" },
  { id: "pendidikan", label: "Pendidikan-Jurusan" },
  { id: "masa-kerja", label: "Masa Kerja" }
];

const dashboardMenuOrder = ["dashboard", "wilayah", "ukpd", "pangkat", "rumpunJabatan", "masaKerja", "umur", "pendidikan", "pensiun"];
const dashboardMenuIcons = {
  dashboard: Home,
  wilayah: MapPinned,
  ukpd: Building2,
  pangkat: BarChart3,
  rumpunJabatan: Network,
  masaKerja: BriefcaseMedical,
  umur: PieChart,
  pendidikan: GraduationCap,
  pensiun: UserRoundCheck
};

const pivotHeadCell = "bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600";
const pivotLabelHeadCell = `${pivotHeadCell} sticky left-0 z-20 text-left`;
const pivotNumberHeadCell = `${pivotHeadCell} text-right`;
const pivotLabelCell = "sticky left-0 z-10 border-r border-slate-100 px-3 py-2";
const pivotNumberCell = "px-3 py-2 text-right text-sm tabular-nums";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

function formatPercent(value, total) {
  const denominator = Number(total || 0);
  if (!denominator) return "0%";
  return `${((Number(value || 0) / denominator) * 100).toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })}%`;
}

function downloadCsv(filename, headers, rows) {
  const content = [
    headers.map((header) => escapeCsv(header)).join(","),
    ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(","))
  ].join("\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildPivotAggregates(rows, labelKey) {
  const map = new Map();
  for (const row of rows) {
    const label = row[labelKey] || "Tidak Diketahui";
    if (!map.has(label)) {
      map.set(label, {
        label,
        total: 0,
        pnsCpns: 0,
        pppk: 0,
        pppkParuhWaktu: 0,
        nonPns: 0,
        pjlp: 0
      });
    }
    const item = map.get(label);
    const jumlah = Number(row.jumlah || 0);
    item.total += jumlah;
    if (row.jenis_pegawai === "PNS" || row.jenis_pegawai === "CPNS") item.pnsCpns += jumlah;
    if (row.jenis_pegawai === "PPPK") item.pppk += jumlah;
    if (row.jenis_pegawai === "PPPK Paruh Waktu") item.pppkParuhWaktu += jumlah;
    if (row.jenis_pegawai === "NON PNS") item.nonPns += jumlah;
    if (row.jenis_pegawai === "PJLP") item.pjlp += jumlah;
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function CountPill({ value }) {
  return (
    <span className="rounded-full bg-dinkes-50 px-2.5 py-1 text-xs font-bold tabular-nums text-dinkes-700">
      {formatNumber(value)}
    </span>
  );
}

function employeeStatusCount(employee, key) {
  const status = employee?.jenis_pegawai || "";
  if (key === "total") return 1;
  if (key === "pnsCpns") return status === "PNS" || status === "CPNS" ? 1 : 0;
  if (key === "pppk") return status === "PPPK" ? 1 : 0;
  if (key === "pppkParuhWaktu") return status === "PPPK Paruh Waktu" ? 1 : 0;
  if (key === "nonPns") return status === "NON PNS" ? 1 : 0;
  if (key === "pjlp") return status === "PJLP" ? 1 : 0;
  return 0;
}

function EmployeePivotCountCells({ employee }) {
  return (
    <>
      <td className={`${pivotNumberCell} font-medium text-slate-900`}>{employeeStatusCount(employee, "total")}</td>
      <td className={`${pivotNumberCell} text-slate-700`}>{employeeStatusCount(employee, "pnsCpns")}</td>
      <td className={`${pivotNumberCell} text-slate-700`}>{employeeStatusCount(employee, "pppk")}</td>
      <td className={`${pivotNumberCell} text-slate-700`}>{employeeStatusCount(employee, "pppkParuhWaktu")}</td>
      <td className={`${pivotNumberCell} text-slate-700`}>{employeeStatusCount(employee, "nonPns")}</td>
      <td className={`${pivotNumberCell} text-slate-700`}>{employeeStatusCount(employee, "pjlp")}</td>
    </>
  );
}

function PivotDrillPanel({ mode, query }) {
  const [loadingTree, setLoadingTree] = useState(false);
  const [treeError, setTreeError] = useState("");
  const [tree, setTree] = useState([]);
  const [open1, setOpen1] = useState({});
  const [open2, setOpen2] = useState({});
  const [employeesByNode, setEmployeesByNode] = useState({});
  const [loadingNode, setLoadingNode] = useState("");
  const [pageByNode, setPageByNode] = useState({});
  const pageSize = 20;
  const title = mode === "jabatan"
    ? "Jabatan -> UKPD -> Pegawai"
    : mode === "pendidikan"
      ? "Jenjang Pendidikan -> Jurusan -> Pegawai"
      : mode === "masa-kerja"
        ? "Masa Kerja -> Jabatan -> Pegawai"
      : "Rumpun -> Jabatan -> Pegawai";
  const getCount = (counts, key) => formatNumber(counts?.[key] || 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ mode });
      if (query) params.set("q", query);
      setLoadingTree(true);
      setTreeError("");
      fetch(`/api/dashboard/pivot-tree?${params.toString()}`)
        .then((res) => res.json())
        .then((payload) => {
          if (!payload?.success) throw new Error(payload?.message || "Struktur pivot gagal dimuat.");
          const nextTree = payload?.data?.tree || [];
          setTree(nextTree);
          setOpen1({});
          setOpen2({});
          setEmployeesByNode({});
          setPageByNode({});
        })
        .catch((error) => {
          setTree([]);
          setTreeError(error.message || "Struktur pivot gagal dimuat.");
        })
        .finally(() => setLoadingTree(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [mode, query]);

  function toggleLevel1(label) {
    setOpen1((current) => ({ ...current, [label]: !current[label] }));
  }

  async function loadEmployees(group1, group2, page = 1) {
    const nodeKey = `${group1}::${group2}`;
    setLoadingNode(nodeKey);
    const params = new URLSearchParams({ mode, group1, group2, page: String(page), pageSize: String(pageSize) });
    if (query) params.set("q", query);
    try {
      const response = await fetch(`/api/dashboard/pivot-tree?${params.toString()}`);
      const payload = await response.json();
      if (!payload?.success) throw new Error(payload?.message || "Data pegawai gagal dimuat.");
      setEmployeesByNode((current) => ({
        ...current,
        [nodeKey]: {
          items: payload?.data?.employees || [],
          total: payload?.data?.total || 0,
          page: payload?.data?.page || page
        }
      }));
      setPageByNode((current) => ({ ...current, [nodeKey]: page }));
    } catch (error) {
      setTreeError(error.message || "Data pegawai gagal dimuat.");
    } finally {
      setLoadingNode("");
    }
  }

  async function toggleLevel2(group1, group2) {
    const nodeKey = `${group1}::${group2}`;
    const willOpen = !open2[nodeKey];
    setOpen2((current) => ({ ...current, [nodeKey]: willOpen }));
    if (willOpen) {
      const page = pageByNode[nodeKey] || 1;
      await loadEmployees(group1, group2, page);
    }
  }

  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <h3 className="font-display text-sm font-bold text-dinkes-900">Rincian Pivot: {title}</h3>
      {loadingTree ? <p className="mt-3 text-sm text-slate-500">Memuat struktur...</p> : null}
      {treeError ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{treeError}</p> : null}
      <div className="mt-3 space-y-2 md:hidden">
        {tree.map((group1) => {
          const isOpen1 = Boolean(open1[group1.label]);
          return (
            <article key={group1.label} className="rounded-lg border border-slate-200 bg-white p-3">
              <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => toggleLevel1(group1.label)} type="button">
                <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900">
                  {isOpen1 ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{group1.label}</span>
                </span>
                <CountPill value={group1.total} />
              </button>
              {isOpen1 ? (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {group1.children.map((group2) => {
                    const nodeKey = `${group1.label}::${group2.label}`;
                    const isOpen2 = Boolean(open2[nodeKey]);
                    const employeeData = employeesByNode[nodeKey];
                    return (
                      <div key={nodeKey} className="rounded-xl bg-slate-50 p-2.5">
                        <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => toggleLevel2(group1.label, group2.label)} type="button">
                          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
                            {isOpen2 ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                            <span className="truncate">{group2.label}</span>
                          </span>
                          <CountPill value={group2.total} />
                        </button>
                        {isOpen2 ? (
                          <div className="mt-2 space-y-2">
                            {(employeeData?.items || []).map((employee) => (
                              <Link key={employee.id_pegawai} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm" href={`/pegawai/${employee.id_pegawai}`}>
                                <span className="min-w-0 truncate text-slate-700">{employee.nama}</span>
                                <span className="shrink-0 text-xs font-bold text-dinkes-700">Profil</span>
                              </Link>
                            ))}
                            {loadingNode === nodeKey ? <p className="px-3 py-2 text-xs text-slate-500">Memuat pegawai...</p> : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </article>
          );
        })}
        {!loadingTree && !tree.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">Data drilldown tidak ditemukan.</p> : null}
      </div>
      <p className="mt-2 hidden text-xs text-slate-500 md:block">Geser horizontal untuk melihat kolom jumlah per jenis pegawai.</p>
      <div className="table-scroll mt-3 hidden max-w-[1100px] rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[860px] table-fixed">
          <colgroup>
            <col className="w-[300px]" />
            <col className="w-[96px]" />
            <col className="w-[112px]" />
            <col className="w-[96px]" />
            <col className="w-[150px]" />
            <col className="w-[112px]" />
            <col className="w-[96px]" />
          </colgroup>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className={pivotLabelHeadCell}>Label Baris</th>
              <th className={pivotNumberHeadCell}>Total</th>
              <th className={pivotNumberHeadCell}>PNS/CPNS</th>
              <th className={pivotNumberHeadCell}>PPPK</th>
              <th className={pivotNumberHeadCell}>PPPK Paruh Waktu</th>
              <th className={pivotNumberHeadCell}>NON PNS</th>
              <th className={pivotNumberHeadCell}>PJLP</th>
            </tr>
          </thead>
          <tbody>
            {tree.map((group1) => {
              const isOpen1 = Boolean(open1[group1.label]);
              return (
                <Fragment key={group1.label}>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <td className={`${pivotLabelCell} bg-slate-50/95`}>
                      <button className="flex w-full min-w-0 items-center gap-1 text-left text-sm font-semibold text-slate-900" onClick={() => toggleLevel1(group1.label)}>
                        {isOpen1 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="truncate">{group1.label}</span>
                      </button>
                    </td>
                    <td className={`${pivotNumberCell} font-semibold text-slate-900`}>{formatNumber(group1.total)}</td>
                    <td className={`${pivotNumberCell} text-slate-700`}>{getCount(group1.counts, "pnsCpns")}</td>
                    <td className={`${pivotNumberCell} text-slate-700`}>{getCount(group1.counts, "pppk")}</td>
                    <td className={`${pivotNumberCell} text-slate-700`}>{getCount(group1.counts, "pppkParuhWaktu")}</td>
                    <td className={`${pivotNumberCell} text-slate-700`}>{getCount(group1.counts, "nonPns")}</td>
                    <td className={`${pivotNumberCell} text-slate-700`}>{getCount(group1.counts, "pjlp")}</td>
                  </tr>
                  {isOpen1
                    ? group1.children.map((group2) => {
                      const nodeKey = `${group1.label}::${group2.label}`;
                      const isOpen2 = Boolean(open2[nodeKey]);
                      const employeeData = employeesByNode[nodeKey];
                      const totalPages = Math.max(1, Math.ceil((employeeData?.total || 0) / pageSize));
                      return (
                        <Fragment key={nodeKey}>
                          <tr className="border-b border-slate-100">
                            <td className={`${pivotLabelCell} bg-white`}>
                              <button className="ml-6 flex max-w-[230px] items-center gap-1 text-left text-sm font-medium text-slate-800" onClick={() => toggleLevel2(group1.label, group2.label)}>
                                {isOpen2 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <span className="truncate">{group2.label}</span>
                              </button>
                            </td>
                            <td className={`${pivotNumberCell} font-medium text-slate-900`}>{formatNumber(group2.total)}</td>
                            <td className={`${pivotNumberCell} text-slate-700`}>{getCount(group2.counts, "pnsCpns")}</td>
                            <td className={`${pivotNumberCell} text-slate-700`}>{getCount(group2.counts, "pppk")}</td>
                            <td className={`${pivotNumberCell} text-slate-700`}>{getCount(group2.counts, "pppkParuhWaktu")}</td>
                            <td className={`${pivotNumberCell} text-slate-700`}>{getCount(group2.counts, "nonPns")}</td>
                            <td className={`${pivotNumberCell} text-slate-700`}>{getCount(group2.counts, "pjlp")}</td>
                          </tr>
                          {isOpen2 ? (
                            <>
                              {(employeeData?.items || []).map((employee) => (
                                <tr key={employee.id_pegawai} className="border-b border-slate-100 hover:bg-dinkes-50/40">
                                  <td className={`${pivotLabelCell} bg-white py-1 text-sm text-slate-700`}>
                                    <div className="ml-12 flex min-w-0 items-center justify-between gap-3">
                                      <span className="truncate">{employee.nama}</span>
                                      <Link className="shrink-0 text-xs font-semibold text-dinkes-700 hover:text-dinkes-900" href={`/pegawai/${employee.id_pegawai}`}>
                                        Lihat Profil
                                      </Link>
                                    </div>
                                  </td>
                                  <EmployeePivotCountCells employee={employee} />
                                </tr>
                              ))}
                              {loadingNode === nodeKey ? (
                                <tr className="border-b border-slate-100">
                                  <td className="px-3 py-2 text-xs text-slate-500" colSpan={7}>
                                    <span className="ml-12">Memuat pegawai...</span>
                                  </td>
                                </tr>
                              ) : null}
                              {(employeeData?.total || 0) > pageSize ? (
                                <tr className="border-b border-slate-100">
                                  <td className="px-3 py-2" colSpan={7}>
                                    <div className="ml-12 flex items-center gap-2 text-xs text-slate-600">
                                      <button
                                        className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
                                        disabled={(employeeData?.page || 1) <= 1}
                                        onClick={() => loadEmployees(group1.label, group2.label, Math.max(1, (employeeData?.page || 1) - 1))}
                                      >
                                        Sebelumnya
                                      </button>
                                      <span>Hal {(employeeData?.page || 1)} / {totalPages}</span>
                                      <button
                                        className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
                                        disabled={(employeeData?.page || 1) >= totalPages}
                                        onClick={() => loadEmployees(group1.label, group2.label, Math.min(totalPages, (employeeData?.page || 1) + 1))}
                                      >
                                        Berikutnya
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </>
                          ) : null}
                        </Fragment>
                      );
                    })
                    : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {!loadingTree && !tree.length ? <p className="px-4 py-8 text-center text-sm text-slate-500">Data drilldown tidak ditemukan.</p> : null}
      </div>
    </section>
  );
}

function UkpdDrillPanel({ query }) {
  const [loadingTree, setLoadingTree] = useState(false);
  const [treeError, setTreeError] = useState("");
  const [tree, setTree] = useState([]);
  const [open1, setOpen1] = useState({});
  const [open2, setOpen2] = useState({});
  const [open3, setOpen3] = useState({});
  const [employeesByNode, setEmployeesByNode] = useState({});
  const [loadingNode, setLoadingNode] = useState("");
  const [pageByNode, setPageByNode] = useState({});
  const pageSize = 20;
  const getCount = (counts, key) => formatNumber(counts?.[key] || 0);
  const groupedTree = useMemo(() => {
    const groups = new Map();
    for (const ukpd of tree) {
      const wilayah = ukpd.wilayah || "Tidak Diketahui";
      if (!groups.has(wilayah)) groups.set(wilayah, []);
      groups.get(wilayah).push(ukpd);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "id"))
      .map(([wilayah, items]) => [
        wilayah,
        items.sort((a, b) => a.label.localeCompare(b.label, "id"))
      ]);
  }, [tree]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ mode: "ukpd" });
      if (query) params.set("q", query);
      setLoadingTree(true);
      setTreeError("");
      fetch(`/api/dashboard/pivot-tree?${params.toString()}`)
        .then((res) => res.json())
        .then((payload) => {
          if (!payload?.success) throw new Error(payload?.message || "Struktur pivot gagal dimuat.");
          setTree(payload?.data?.tree || []);
          setOpen1({});
          setOpen2({});
          setOpen3({});
          setEmployeesByNode({});
          setPageByNode({});
        })
        .catch((error) => {
          setTree([]);
          setTreeError(error.message || "Struktur pivot gagal dimuat.");
        })
        .finally(() => setLoadingTree(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  async function loadEmployees(group1, group2, group3, page = 1) {
    const nodeKey = `${group1}::${group2}::${group3}`;
    setLoadingNode(nodeKey);
    const params = new URLSearchParams({ mode: "ukpd", group1, group2, group3, page: String(page), pageSize: String(pageSize) });
    if (query) params.set("q", query);
    try {
      const response = await fetch(`/api/dashboard/pivot-tree?${params.toString()}`);
      const payload = await response.json();
      if (!payload?.success) throw new Error(payload?.message || "Data pegawai gagal dimuat.");
      setEmployeesByNode((current) => ({
        ...current,
        [nodeKey]: { items: payload?.data?.employees || [], total: payload?.data?.total || 0, page: payload?.data?.page || page }
      }));
      setPageByNode((current) => ({ ...current, [nodeKey]: page }));
    } catch (error) {
      setTreeError(error.message || "Data pegawai gagal dimuat.");
    } finally {
      setLoadingNode("");
    }
  }

  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Rincian Pivot: UKPD -&gt; Rumpun -&gt; Jabatan -&gt; Pegawai</h3>
      {loadingTree ? <p className="mt-3 text-sm text-slate-500">Memuat struktur...</p> : null}
      {treeError ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{treeError}</p> : null}
      <div className="mt-3 space-y-2 md:hidden">
        {groupedTree.map(([wilayah, items]) => (
          <section key={wilayah} className="rounded-lg border border-slate-200 bg-white p-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-dinkes-700">Wilayah {wilayah}</h4>
            <div className="space-y-2">
              {items.map((ukpd) => {
                const isOpen1 = Boolean(open1[ukpd.label]);
                return (
                  <article key={ukpd.label} className="rounded-xl bg-slate-50 p-2.5">
                    <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen1((s) => ({ ...s, [ukpd.label]: !s[ukpd.label] }))} type="button">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900">
                        {isOpen1 ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        <span className="truncate">{ukpd.label}</span>
                      </span>
                      <CountPill value={ukpd.total} />
                    </button>
                    {isOpen1 ? (
                      <div className="mt-2 space-y-2">
                        {ukpd.children.map((rumpun) => {
                          const key2 = `${ukpd.label}::${rumpun.label}`;
                          const isOpen2 = Boolean(open2[key2]);
                          return (
                            <div key={key2} className="rounded-lg bg-white p-2">
                              <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen2((s) => ({ ...s, [key2]: !s[key2] }))} type="button">
                                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
                                  {isOpen2 ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                                  <span className="truncate">{rumpun.label}</span>
                                </span>
                                <CountPill value={rumpun.total} />
                              </button>
                              {isOpen2 ? (
                                <div className="mt-2 space-y-2">
                                  {rumpun.children.map((jabatan) => {
                                    const key3 = `${ukpd.label}::${rumpun.label}::${jabatan.label}`;
                                    const isOpen3 = Boolean(open3[key3]);
                                    const employeeData = employeesByNode[key3];
                                    return (
                                      <div key={key3} className="rounded-lg bg-slate-50 p-2">
                                        <button className="flex w-full items-center justify-between gap-3 text-left" onClick={async () => {
                                          const next = !open3[key3];
                                          setOpen3((s) => ({ ...s, [key3]: next }));
                                          if (next) await loadEmployees(ukpd.label, rumpun.label, jabatan.label, pageByNode[key3] || 1);
                                        }} type="button">
                                          <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                                            {isOpen3 ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                                            <span className="truncate">{jabatan.label}</span>
                                          </span>
                                          <CountPill value={jabatan.total} />
                                        </button>
                                        {isOpen3 ? (
                                          <div className="mt-2 space-y-2">
                                            {(employeeData?.items || []).map((employee) => (
                                              <Link key={employee.id_pegawai} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm" href={`/pegawai/${employee.id_pegawai}`}>
                                                <span className="min-w-0 truncate text-slate-700">{employee.nama}</span>
                                                <span className="shrink-0 text-xs font-bold text-dinkes-700">Profil</span>
                                              </Link>
                                            ))}
                                            {loadingNode === key3 ? <p className="px-3 py-2 text-xs text-slate-500">Memuat pegawai...</p> : null}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="table-scroll mt-3 hidden max-w-[1180px] rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[940px] table-fixed">
          <colgroup>
            <col className="w-[64px]" />
            <col className="w-[300px]" />
            <col className="w-[96px]" />
            <col className="w-[112px]" />
            <col className="w-[96px]" />
            <col className="w-[150px]" />
            <col className="w-[112px]" />
            <col className="w-[96px]" />
          </colgroup>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className={`${pivotHeadCell} text-center`}>No</th>
              <th className={pivotLabelHeadCell}>Label Baris</th>
              <th className={pivotNumberHeadCell}>Total</th>
              <th className={pivotNumberHeadCell}>PNS/CPNS</th>
              <th className={pivotNumberHeadCell}>PPPK</th>
              <th className={pivotNumberHeadCell}>PPPK Paruh Waktu</th>
              <th className={pivotNumberHeadCell}>NON PNS</th>
              <th className={pivotNumberHeadCell}>PJLP</th>
            </tr>
          </thead>
          <tbody>
            {groupedTree.map(([wilayah, items]) => (
              <Fragment key={wilayah}>
                <tr className="border-b border-slate-200 bg-dinkes-50">
                  <td className="px-3 py-2" />
                  <td colSpan={7} className="px-3 py-2 text-sm font-bold text-slate-900">
                    Wilayah {wilayah}
                  </td>
                </tr>
                {items.map((ukpd, index) => {
              const isOpen1 = Boolean(open1[ukpd.label]);
              return (
                <Fragment key={ukpd.label}>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <td className="px-3 py-2 text-center text-sm font-semibold text-slate-700">{index + 1}</td>
                    <td className={`${pivotLabelCell} bg-slate-50/95`}>
                      <button className="flex w-full min-w-0 items-center gap-1 text-left text-sm font-semibold text-slate-900" onClick={() => setOpen1((s) => ({ ...s, [ukpd.label]: !s[ukpd.label] }))}>
                        {isOpen1 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="truncate">{ukpd.label}</span>
                      </button>
                    </td>
                    <td className={`${pivotNumberCell} font-semibold text-slate-900`}>{formatNumber(ukpd.total)}</td>
                    <td className={`${pivotNumberCell} text-slate-700`}>{getCount(ukpd.counts, "pnsCpns")}</td>
                    <td className={`${pivotNumberCell} text-slate-700`}>{getCount(ukpd.counts, "pppk")}</td>
                    <td className={`${pivotNumberCell} text-slate-700`}>{getCount(ukpd.counts, "pppkParuhWaktu")}</td>
                    <td className={`${pivotNumberCell} text-slate-700`}>{getCount(ukpd.counts, "nonPns")}</td>
                    <td className={`${pivotNumberCell} text-slate-700`}>{getCount(ukpd.counts, "pjlp")}</td>
                  </tr>
                  {isOpen1 ? ukpd.children.map((rumpun) => {
                    const key2 = `${ukpd.label}::${rumpun.label}`;
                    const isOpen2 = Boolean(open2[key2]);
                    return (
                      <Fragment key={key2}>
                        <tr className="border-b border-slate-100">
                          <td className="px-3 py-2" />
                          <td className={`${pivotLabelCell} bg-white`}>
                            <button className="ml-6 flex max-w-[230px] items-center gap-1 text-left text-sm font-medium text-slate-800" onClick={() => setOpen2((s) => ({ ...s, [key2]: !s[key2] }))}>
                              {isOpen2 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="truncate">{rumpun.label}</span>
                            </button>
                          </td>
                          <td className={`${pivotNumberCell} font-medium text-slate-900`}>{formatNumber(rumpun.total)}</td>
                          <td className={`${pivotNumberCell} text-slate-700`}>{getCount(rumpun.counts, "pnsCpns")}</td>
                          <td className={`${pivotNumberCell} text-slate-700`}>{getCount(rumpun.counts, "pppk")}</td>
                          <td className={`${pivotNumberCell} text-slate-700`}>{getCount(rumpun.counts, "pppkParuhWaktu")}</td>
                          <td className={`${pivotNumberCell} text-slate-700`}>{getCount(rumpun.counts, "nonPns")}</td>
                          <td className={`${pivotNumberCell} text-slate-700`}>{getCount(rumpun.counts, "pjlp")}</td>
                        </tr>
                        {isOpen2 ? rumpun.children.map((jabatan) => {
                          const key3 = `${ukpd.label}::${rumpun.label}::${jabatan.label}`;
                          const isOpen3 = Boolean(open3[key3]);
                          const employeeData = employeesByNode[key3];
                          const totalPages = Math.max(1, Math.ceil((employeeData?.total || 0) / pageSize));
                          return (
                            <Fragment key={key3}>
                              <tr className="border-b border-slate-100">
                                <td className="px-3 py-2" />
                                <td className={`${pivotLabelCell} bg-white`}>
                                  <button className="ml-12 flex max-w-[210px] items-center gap-1 text-left text-sm text-slate-700" onClick={async () => {
                                    const next = !open3[key3];
                                    setOpen3((s) => ({ ...s, [key3]: next }));
                                    if (next) await loadEmployees(ukpd.label, rumpun.label, jabatan.label, pageByNode[key3] || 1);
                                  }}>
                                    {isOpen3 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <span className="truncate">{jabatan.label}</span>
                                  </button>
                                </td>
                                <td className={`${pivotNumberCell} font-medium text-slate-900`}>{formatNumber(jabatan.total)}</td>
                                <td className={`${pivotNumberCell} text-slate-700`}>{getCount(jabatan.counts, "pnsCpns")}</td>
                                <td className={`${pivotNumberCell} text-slate-700`}>{getCount(jabatan.counts, "pppk")}</td>
                                <td className={`${pivotNumberCell} text-slate-700`}>{getCount(jabatan.counts, "pppkParuhWaktu")}</td>
                                <td className={`${pivotNumberCell} text-slate-700`}>{getCount(jabatan.counts, "nonPns")}</td>
                                <td className={`${pivotNumberCell} text-slate-700`}>{getCount(jabatan.counts, "pjlp")}</td>
                              </tr>
                              {isOpen3 ? (
                                <>
                                  {(employeeData?.items || []).map((employee) => (
                                    <tr key={employee.id_pegawai} className="border-b border-slate-100 hover:bg-dinkes-50/40">
                                      <td className="px-3 py-1" />
                                      <td className={`${pivotLabelCell} bg-white py-1 text-sm text-slate-700`}>
                                        <div className="ml-16 flex min-w-0 items-center justify-between gap-3">
                                          <span className="truncate">{employee.nama}</span>
                                          <Link className="shrink-0 text-xs font-semibold text-dinkes-700 hover:text-dinkes-900" href={`/pegawai/${employee.id_pegawai}`}>
                                            Lihat Profil
                                          </Link>
                                        </div>
                                      </td>
                                      <EmployeePivotCountCells employee={employee} />
                                    </tr>
                                  ))}
                                  {loadingNode === key3 ? (
                                    <tr className="border-b border-slate-100">
                                      <td className="px-3 py-2 text-xs text-slate-500" colSpan={8}>
                                        <span className="ml-16">Memuat pegawai...</span>
                                      </td>
                                    </tr>
                                  ) : null}
                                  {(employeeData?.total || 0) > pageSize ? (
                                    <tr className="border-b border-slate-100">
                                      <td className="px-3 py-2" colSpan={8}>
                                        <div className="ml-16 flex items-center gap-2 text-xs text-slate-600">
                                          <button className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50" disabled={(employeeData?.page || 1) <= 1} onClick={() => loadEmployees(ukpd.label, rumpun.label, jabatan.label, Math.max(1, (employeeData?.page || 1) - 1))}>Sebelumnya</button>
                                          <span>Hal {(employeeData?.page || 1)} / {totalPages}</span>
                                          <button className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50" disabled={(employeeData?.page || 1) >= totalPages} onClick={() => loadEmployees(ukpd.label, rumpun.label, jabatan.label, Math.min(totalPages, (employeeData?.page || 1) + 1))}>Berikutnya</button>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : null}
                                </>
                              ) : null}
                            </Fragment>
                          );
                        }) : null}
                      </Fragment>
                    );
                  }) : null}
                </Fragment>
              );
            })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DashboardAnalyticsPanel({ analytics }) {
  const [activeTab, setActiveTab] = useState("ukpd");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.toLowerCase();
  const masaKerjaRows = analytics?.masaKerjaByJenisPegawai || [];
  const pendidikanJurusanRows = analytics?.pendidikanJurusanByJenisPegawai || [];
  const rumpunRows = analytics?.rumpunByJenisPegawai || [];
  const jabatanRows = analytics?.jabatanMenpanByJenisPegawai || [];
  const ukpdRows = analytics?.ukpdSummary || [];

  const rows = useMemo(() => {
    if (!analytics) return [];
    if (activeTab === "ukpd") {
      return ukpdRows.filter((row) => [row.nama_ukpd, row.wilayah, row.jenis_ukpd].join(" ").toLowerCase().includes(normalizedQuery));
    }
    if (activeTab === "pendidikan") {
      return pendidikanJurusanRows.filter((row) => [row.jenis_pegawai, row.pendidikan_jurusan].join(" ").toLowerCase().includes(normalizedQuery));
    }
    if (activeTab === "rumpun") {
      return rumpunRows.filter((row) => {
        const matchQuery = [row.jenis_pegawai, row.rumpun_jabatan].join(" ").toLowerCase().includes(normalizedQuery);
        return matchQuery;
      });
    }
    if (activeTab === "jabatan") {
      return jabatanRows.filter((row) => {
        const matchQuery = [row.jenis_pegawai, row.jabatan_kepmenpan_11].join(" ").toLowerCase().includes(normalizedQuery);
        return matchQuery;
      });
    }
    return masaKerjaRows.filter((row) => {
      return [row.jenis_pegawai, row.masa_kerja_rentang].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [activeTab, analytics, jabatanRows, masaKerjaRows, normalizedQuery, pendidikanJurusanRows, rumpunRows, ukpdRows]);

  const exportRows = useMemo(() => {
    if (activeTab === "ukpd") {
      const grouped = new Map();
      for (const row of rows) {
        const wilayah = row.wilayah || "Tidak Diketahui";
        if (!grouped.has(wilayah)) grouped.set(wilayah, []);
        grouped.get(wilayah).push(row);
      }
      const result = [];
      for (const [wilayah, items] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const sortedItems = items.sort((a, b) => a.nama_ukpd.localeCompare(b.nama_ukpd));
        sortedItems.forEach((item, index) => {
          const pnsCpns = (item.byJenisPegawai?.PNS || 0) + (item.byJenisPegawai?.CPNS || 0);
          result.push([
            wilayah,
            index + 1,
            item.nama_ukpd,
            item.total || 0,
            pnsCpns,
            item.byJenisPegawai?.PPPK || 0,
            item.byJenisPegawai?.["PPPK Paruh Waktu"] || 0,
            item.byJenisPegawai?.["NON PNS"] || 0,
            item.byJenisPegawai?.PJLP || 0
          ]);
        });
      }
      return {
        filename: "daftar-ukpd.csv",
        headers: ["Wilayah", "No", "Nama UKPD", "Total Pegawai", "PNS/CPNS", "PPPK", "PPPK Paruh Waktu", "NON PNS", "PJLP"],
        rows: result
      };
    }

    if (activeTab === "masa-kerja") {
      return {
        filename: "masa-kerja.csv",
        headers: ["No", "Rentang Masa Kerja", "Total Pegawai", "PNS/CPNS", "PPPK", "PPPK Paruh Waktu", "NON PNS", "PJLP"],
        rows: buildPivotAggregates(rows, "masa_kerja_rentang").map((item, index) => [
          index + 1,
          item.label,
          item.total,
          item.pnsCpns,
          item.pppk,
          item.pppkParuhWaktu,
          item.nonPns,
          item.pjlp
        ])
      };
    }

    const labelKey = activeTab === "rumpun"
      ? "rumpun_jabatan"
      : activeTab === "pendidikan"
        ? "pendidikan_jurusan"
        : activeTab === "masa-kerja"
          ? "masa_kerja_rentang"
          : "jabatan_kepmenpan_11";
    const labelTitle = activeTab === "rumpun"
      ? "Rumpun Jabatan"
      : activeTab === "pendidikan"
        ? "Pendidikan-Jurusan"
        : activeTab === "masa-kerja"
          ? "Masa Kerja"
          : "Jabatan";
    const filename = activeTab === "rumpun"
      ? "rumpun-jabatan.csv"
      : activeTab === "pendidikan"
        ? "pendidikan-jurusan.csv"
        : activeTab === "masa-kerja"
          ? "masa-kerja.csv"
          : "jabatan.csv";
    const aggregated = buildPivotAggregates(rows, labelKey);
    return {
      filename,
      headers: ["No", labelTitle, "Total Pegawai", "PNS/CPNS", "PPPK", "PPPK Paruh Waktu", "NON PNS", "PJLP"],
      rows: aggregated.map((item, index) => [
        index + 1,
        item.label,
        item.total,
        item.pnsCpns,
        item.pppk,
        item.pppkParuhWaktu,
        item.nonPns,
        item.pjlp
      ])
    };
  }, [activeTab, rows]);
  const titleByTab = {
    ukpd: "Daftar UKPD (Aktif)",
    pendidikan: "Daftar Pendidikan-Jurusan",
    rumpun: "Daftar Rumpun Jabatan",
    jabatan: "Daftar Jabatan",
    "masa-kerja": "Daftar Masa Kerja"
  };

  const placeholderByTab = {
    ukpd: "Cari UKPD/Wilayah...",
    pendidikan: "Cari jenjang pendidikan atau jurusan...",
    rumpun: "Cari rumpun jabatan...",
    jabatan: "Cari jabatan...",
    "masa-kerja": "Cari rentang masa kerja..."
  };

  return (
    <section className="mt-6">
      <nav className="flex gap-2 overflow-x-auto pb-3" aria-label="Menu analitik dashboard">
        {analyticsTabs.map((tab) => (
          <button
            key={tab.id}
            className={`inline-flex shrink-0 items-center rounded-lg border px-4 py-2 text-sm font-semibold transition focus-ring ${activeTab === tab.id ? "border-dinkes-800 bg-dinkes-800 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-dinkes-300 hover:bg-dinkes-50 hover:text-dinkes-800"}`}
            onClick={() => {
              setActiveTab(tab.id);
              setQuery("");
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-base font-bold text-dinkes-900">{titleByTab[activeTab]}</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="btn-secondary"
            onClick={() => downloadCsv(exportRows.filename, exportRows.headers, exportRows.rows)}
            type="button"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <label className="relative min-w-64">
            <span className="sr-only">Cari analitik</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input py-2 pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholderByTab[activeTab]} />
          </label>
        </div>
      </header>

      <div>
        {activeTab === "ukpd" ? (
          <>
            <UkpdDrillPanel query={query} />
          </>
        ) : activeTab === "pendidikan" ? (
          <PivotDrillPanel mode="pendidikan" query={query} />
        ) : activeTab === "rumpun" ? (
          <PivotDrillPanel mode="rumpun" query={query} />
        ) : activeTab === "jabatan" ? (
          <PivotDrillPanel mode="jabatan" query={query} />
        ) : activeTab === "masa-kerja" ? (
          <PivotDrillPanel mode="masa-kerja" query={query} />
        ) : null}
      </div>
      <footer className="mt-3 text-sm text-slate-500">
        Ditemukan {formatNumber(rows.length)} baris. Gunakan pencarian untuk mempersempit daftar.
      </footer>
      </div>
    </section>
  );
}

function DashboardMiniStats({ cards = [] }) {
  if (!cards.length) return null;

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="section-label">{card.label}</p>
          <strong className="mt-1 block font-display text-xl font-bold tabular-nums text-slate-950">{formatNumber(card.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function DashboardMenuCharts({
  menus = {},
  menusByStatus = {},
  statusOptions = [],
  activeStatus = "total",
  onStatusChange,
  wilayahOptions = [],
  activeWilayah = "all",
  onWilayahChange,
  statusLoading = false,
  wilayahLoading = false,
  activeMenu,
  onMenuChange
}) {
  const activeCacheKey = `${activeWilayah || "all"}::${activeStatus || "total"}`;
  const activeMenus = menusByStatus[activeCacheKey] || menusByStatus[activeStatus] || menusByStatus.total || menus;
  const menuItems = dashboardMenuOrder
    .filter((id) => activeMenus[id])
    .map((id) => ({ id, ...activeMenus[id] }));
  const fallbackId = menuItems[0]?.id;
  const activeId = activeMenus[activeMenu] ? activeMenu : fallbackId;
  const activeView = activeMenus[activeId];

  if (!activeView) return null;

  return (
    <section className="surface mt-4 overflow-hidden">
      <nav className="flex gap-1 overflow-x-auto bg-dinkes-800 px-3 py-2" aria-label="Menu dashboard">
        {menuItems.map((item) => {
          const Icon = dashboardMenuIcons[item.id] || BarChart3;
          const selected = item.id === activeId;
          return (
            <button
              key={item.id}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-white transition focus-ring ${selected ? "border-govgold-300 bg-dinkes-600" : "border-transparent hover:bg-white/10"}`}
              onClick={() => onMenuChange(item.id)}
              type="button"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 sm:p-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-bold text-dinkes-900">{activeView.title}</h2>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            {wilayahOptions.length > 1 ? (
              <label className="flex w-full flex-col gap-1 text-sm font-semibold text-slate-700 sm:w-72">
                <span className="section-label">Wilayah</span>
                <select
                  className="input py-2"
                  value={activeWilayah}
                  disabled={wilayahLoading}
                  onChange={(event) => onWilayahChange(event.target.value)}
                >
                  {wilayahOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({formatNumber(option.total)})
                    </option>
                  ))}
                </select>
                {wilayahLoading ? <span className="text-xs font-medium text-slate-500">Memuat...</span> : null}
              </label>
            ) : null}
            {statusOptions.length > 1 ? (
              <label className="flex w-full flex-col gap-1 text-sm font-semibold text-slate-700 sm:w-72">
                <span className="section-label">Status Pegawai</span>
                <select
                  className="input py-2"
                  value={activeStatus}
                  disabled={statusLoading}
                  onChange={(event) => onStatusChange(event.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({formatNumber(option.total)})
                    </option>
                  ))}
                </select>
                {statusLoading ? <span className="text-xs font-medium text-slate-500">Memuat...</span> : null}
              </label>
            ) : null}
          </div>
        </header>
        <section className="mt-4 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:grid xl:auto-rows-fr xl:grid-cols-2 xl:overflow-visible xl:pb-0">
          {(activeView.charts || []).map((chart) => (
            <div key={chart.id || chart.title} className={`w-full min-w-full snap-start ${chart.fullWidth ? "xl:col-span-2" : ""}`}>
              <DashboardChartCard
                title={chart.title}
                type={chart.type || "bar"}
                labels={chart.labels || []}
                values={chart.values || []}
                colors={chart.colors}
                names={chart.names || []}
                datasets={chart.datasets}
                horizontal={Boolean(chart.horizontal)}
                stacked={Boolean(chart.stacked)}
                heightClass={chart.heightClass || "h-96"}
              />
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboardMenu, setDashboardMenu] = useState("dashboard");
  const [dashboardStatus, setDashboardStatus] = useState("total");
  const [dashboardWilayah, setDashboardWilayah] = useState("all");
  const [dashboardStatusLoading, setDashboardStatusLoading] = useState(false);
  const [dashboardStatusError, setDashboardStatusError] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage("");
    setDashboardStatus("total");
    setDashboardWilayah("all");
    setDashboardStatusError("");
    setDashboardStatusLoading(false);
    setAnalytics(null);
    setAnalyticsError("");
    setAnalyticsLoading(false);
    fetch("/api/dashboard", { cache: "no-store" })
      .then(async (res) => {
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error(`API dashboard mengembalikan respons bukan JSON (HTTP ${res.status}).`);
        }
        return res.json();
      })
      .then((payload) => {
        if (!payload?.success) throw new Error(payload?.message || "Dashboard gagal dimuat.");
        if (active) setData(payload.data);
      })
      .catch((error) => {
        if (active) {
          setData(null);
          setErrorMessage(error.message || "Dashboard gagal dimuat.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />)}
      </section>
    );
  }

  if (errorMessage) {
    return <ErrorState description={errorMessage} onRetry={() => setRefreshKey((value) => value + 1)} />;
  }

  if (!data) return null;

  const columns = [
    { key: "nama", header: "Nama", width: 230 },
    { key: "nip", header: "NIP", width: 180, render: (item) => item.nip || "-" },
    { key: "nama_jabatan_menpan", header: "Jabatan", width: 260, wrap: true, render: (item) => item.nama_jabatan_menpan || item.nama_jabatan_orb || "-" },
    { key: "jenis_pegawai", header: "Status", width: 150, render: (item) => <StatusBadge status={item.jenis_pegawai} /> },
    { key: "nama_ukpd", header: "UKPD", width: 260, wrap: true }
  ];
  const totalPegawai = Number(data.summary.total || 0);

  async function loadAnalytics() {
    if (analytics || analyticsLoading) return;

    setAnalyticsLoading(true);
    setAnalyticsError("");
    try {
      const response = await fetch("/api/dashboard?detail=analytics", { cache: "no-store" });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`API analitik mengembalikan respons bukan JSON (HTTP ${response.status}).`);
      }

      const payload = await response.json();
      if (!payload?.success) throw new Error(payload?.message || "Analitik gagal dimuat.");
      setAnalytics(payload?.data?.analytics || null);
    } catch (error) {
      setAnalyticsError(error.message || "Analitik gagal dimuat.");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  function getDashboardMenuCacheKey(status, wilayah) {
    return `${wilayah || "all"}::${status || "total"}`;
  }

  async function loadDashboardMenus(nextStatus, nextWilayah) {
    setDashboardStatusLoading(true);
    setDashboardStatusError("");
    try {
      const params = new URLSearchParams();
      if (nextStatus && nextStatus !== "total") params.set("status", nextStatus);
      if (nextWilayah && nextWilayah !== "all") params.set("wilayah", nextWilayah);
      const query = params.toString();
      const response = await fetch(`/api/dashboard${query ? `?${query}` : ""}`, { cache: "no-store" });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`API dashboard mengembalikan respons bukan JSON (HTTP ${response.status}).`);
      }

      const payload = await response.json();
      if (!payload?.success) throw new Error(payload?.message || "Dashboard gagal dimuat.");
      const nextMenus = payload?.data?.dashboardMenus || {};
      const nextCacheKey = getDashboardMenuCacheKey(nextStatus, nextWilayah);
      setData((current) => current ? {
        ...current,
        dashboardMenus: nextMenus,
        dashboardMenusByStatus: {
          ...(current.dashboardMenusByStatus || {}),
          [nextCacheKey]: nextMenus
        },
        dashboardMenuStatusOptions: payload?.data?.dashboardMenuStatusOptions || current.dashboardMenuStatusOptions,
        dashboardMenuWilayahOptions: payload?.data?.dashboardMenuWilayahOptions || current.dashboardMenuWilayahOptions,
        dashboardMenuActiveWilayah: payload?.data?.dashboardMenuActiveWilayah || nextWilayah
      } : current);
      setDashboardStatus(nextStatus);
      setDashboardWilayah(nextWilayah);
    } catch (error) {
      setDashboardStatusError(error.message || "Filter dashboard gagal dimuat.");
    } finally {
      setDashboardStatusLoading(false);
    }
  }

  async function handleDashboardStatusChange(nextStatus) {
    if (!data || nextStatus === dashboardStatus) return;

    const cacheKey = getDashboardMenuCacheKey(nextStatus, dashboardWilayah);
    if (data.dashboardMenusByStatus?.[cacheKey]) {
      setDashboardStatus(nextStatus);
      return;
    }

    await loadDashboardMenus(nextStatus, dashboardWilayah);
  }

  async function handleDashboardWilayahChange(nextWilayah) {
    if (!data || nextWilayah === dashboardWilayah) return;
    await loadDashboardMenus(dashboardStatus, nextWilayah);
  }

  return (
    <>
      <header className="mb-5 flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-label text-dinkes-800">Dashboard Utama</p>
          <h1 className="app-heading mt-1 text-2xl sm:text-3xl">Sistem Informasi SDM Kesehatan</h1>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
        <KpiCard title="Total Pegawai" value={data.summary.total} percentage="100%" icon={UsersRound} />
        <KpiCard title="PNS/CPNS" value={data.summary.pnsCpns} percentage={formatPercent(data.summary.pnsCpns, totalPegawai)} icon={ShieldCheck} tone="green" />
        <KpiCard title="PPPK" value={data.summary.pppk} percentage={formatPercent(data.summary.pppk, totalPegawai)} icon={UserRoundCheck} tone="gold" />
        <KpiCard title="PPPK Paruh Waktu" value={data.summary.pppkParuhWaktu} percentage={formatPercent(data.summary.pppkParuhWaktu, totalPegawai)} icon={UserRoundCheck} tone="gold" />
        <KpiCard title="NON PNS" value={data.summary.nonPns} percentage={formatPercent(data.summary.nonPns, totalPegawai)} icon={BriefcaseMedical} tone="slate" />
        <KpiCard title="PJLP" value={data.summary.pjlp} percentage={formatPercent(data.summary.pjlp, totalPegawai)} icon={UsersRound} />
      </section>

      <DashboardMenuCharts
        menus={data.dashboardMenus || {}}
        menusByStatus={data.dashboardMenusByStatus || {}}
        statusOptions={data.dashboardMenuStatusOptions || []}
        activeStatus={dashboardStatus}
        onStatusChange={handleDashboardStatusChange}
        wilayahOptions={data.dashboardMenuWilayahOptions || []}
        activeWilayah={dashboardWilayah}
        onWilayahChange={handleDashboardWilayahChange}
        statusLoading={dashboardStatusLoading}
        wilayahLoading={dashboardStatusLoading}
        activeMenu={dashboardMenu}
        onMenuChange={setDashboardMenu}
      />
      {dashboardStatusError ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {dashboardStatusError}
        </p>
      ) : null}

      {analytics ? (
        <DashboardAnalyticsPanel analytics={analytics} />
      ) : (
        <section className="surface mt-4 p-4">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-bold text-dinkes-900">Analitik Detail</h2>
            <button className="btn-secondary" type="button" onClick={loadAnalytics} disabled={analyticsLoading}>
              <BarChart3 className="h-4 w-4" />
              {analyticsLoading ? "Memuat..." : "Muat Analitik Detail"}
            </button>
          </header>
          {analyticsError ? (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {analyticsError}
            </p>
          ) : null}
        </section>
      )}

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-dinkes-900">Pegawai Terbaru</h2>
            <Link className="text-sm font-semibold text-dinkes-700 hover:text-dinkes-900" href="/pegawai">Lihat semua</Link>
          </div>
          <DataTable columns={columns} data={data.latestEmployees} rowKey="id_pegawai" />
        </article>
        <aside className="surface min-w-0 p-5">
          <h2 className="font-display text-lg font-bold text-dinkes-900">Ringkasan Usulan</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <p className="section-label">Usulan Mutasi</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{data.usulanSummary.mutasi}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <p className="section-label">Usulan Putus JF</p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-950">{data.usulanSummary.putusJf}</p>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
