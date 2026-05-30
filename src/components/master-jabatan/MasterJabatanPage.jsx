"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import DataTable from "@/components/tables/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";

const LABELS = {
  menpan: "Jabatan Berdasarkan Menpan",
  orb: "Jabatan Berdasarkan ORB"
};

function emptyForm(jenis) {
  return {
    id: null,
    jenis,
    nama: "",
    aktif: true
  };
}

function maxPage(totalRows, pageSize) {
  return Math.max(1, Math.ceil(Number(totalRows || 0) / pageSize));
}

export default function MasterJabatanPage({ jenis }) {
  const label = LABELS[jenis] || "Master Jabatan";
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [form, setForm] = useState(emptyForm(jenis));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setForm(emptyForm(jenis));
    setRows([]);
    setTotalRows(0);
    setPage(1);
    setQ("");
    setErrorMessage("");
    setNotice("");
  }, [jenis]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      jenis,
      q,
      page: String(page),
      pageSize: String(pageSize)
    });

    setLoading(true);
    setErrorMessage("");
    fetch(`/api/master-jabatan?${params}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success) throw new Error(payload?.message || "Master jabatan gagal dimuat.");
        setRows(payload.data?.rows || []);
        setTotalRows(payload.data?.total || 0);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setRows([]);
          setTotalRows(0);
          setErrorMessage(error.message || "Master jabatan gagal dimuat.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [jenis, q, page, pageSize, refreshKey]);

  const columns = useMemo(() => [
    { key: "nama", header: "Nama Jabatan", width: 520, wrap: true },
    { key: "aktif", header: "Status", width: 140, render: (item) => item.aktif ? "Aktif" : "Nonaktif" },
    { key: "updated_at", header: "Update Terakhir", width: 190, render: (item) => item.updated_at ? new Date(item.updated_at).toLocaleString("id-ID") : "-" }
  ], []);

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setNotice("");

    try {
      const response = await fetch("/api/master-jabatan", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Master jabatan gagal disimpan.");
      setNotice(payload.message || "Master jabatan berhasil disimpan.");
      setForm(emptyForm(jenis));
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setErrorMessage(error.message || "Master jabatan gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item) {
    if (!window.confirm(`Hapus jabatan "${item.nama}" dari master ${label}?`)) return;
    setSaving(true);
    setErrorMessage("");
    setNotice("");
    try {
      const params = new URLSearchParams({ id: String(item.id), jenis });
      const response = await fetch(`/api/master-jabatan?${params}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Master jabatan gagal dihapus.");
      setNotice(payload.message || "Master jabatan berhasil dihapus.");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setErrorMessage(error.message || "Master jabatan gagal dihapus.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={label}
        description="Kelola referensi jabatan yang dipakai oleh form pegawai dan riwayat jabatan."
        breadcrumbs={[{ label: "Master Jabatan" }, { label }]}
      />

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form className="surface space-y-4 p-5" onSubmit={submitForm}>
          <div>
            <h2 className="text-base font-bold text-dinkes-navy">{form.id ? "Edit Jabatan" : "Tambah Jabatan"}</h2>
            <p className="mt-1 text-sm text-slate-500">Data awal otomatis diambil dari kolom jabatan pada tabel pegawai.</p>
          </div>
          <label className="space-y-2">
            <span className="label">Nama Jabatan</span>
            <textarea
              className="input min-h-28"
              value={form.nama}
              onChange={(event) => setForm((current) => ({ ...current, nama: event.target.value }))}
              placeholder="Masukkan nama jabatan"
              required
            />
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.aktif}
              onChange={(event) => setForm((current) => ({ ...current, aktif: event.target.checked }))}
            />
            Aktif digunakan di form pegawai
          </label>
          {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div> : null}
          {errorMessage ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</div> : null}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary" type="submit" disabled={saving}>
              {form.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? "Menyimpan..." : form.id ? "Simpan" : "Tambah"}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setForm(emptyForm(jenis))}>
              <X className="h-4 w-4" />
              Reset
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Cari jabatan</span>
              <input
                className="input"
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama jabatan"
              />
            </label>
            <button className="btn-secondary" type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              Muat Ulang
            </button>
          </div>

          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-white" />
          ) : errorMessage && !rows.length ? (
            <ErrorState description={errorMessage} onRetry={() => setRefreshKey((value) => value + 1)} />
          ) : rows.length ? (
            <DataTable
              columns={columns}
              data={rows}
              rowKey="id"
              showNumber
              startNumber={(page - 1) * pageSize + 1}
              actionWidth={130}
              actions={(item) => (
                <div className="flex items-center justify-end gap-1">
                  <button className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus-ring" type="button" onClick={() => setForm({ ...item, jenis })} aria-label="Edit jabatan" title="Edit">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 focus-ring" type="button" onClick={() => removeItem(item)} aria-label="Hapus jabatan" title="Hapus">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            />
          ) : (
            <EmptyState title="Master jabatan kosong" description="Belum ada data jabatan pada kategori ini." />
          )}

          <footer className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>Menampilkan {rows.length} dari {totalRows} jabatan</span>
            <div className="grid gap-2 sm:flex sm:items-center">
              <label className="flex items-center gap-2">
                <span>Per halaman</span>
                <select className="input py-2" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                  {[10, 20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <button className="btn-secondary py-2" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Sebelumnya</button>
              <span className="px-2">Hal {page} / {maxPage(totalRows, pageSize)}</span>
              <button className="btn-secondary py-2" disabled={page === maxPage(totalRows, pageSize)} onClick={() => setPage((value) => Math.min(maxPage(totalRows, pageSize), value + 1))}>Berikutnya</button>
            </div>
          </footer>
        </div>
      </section>
    </>
  );
}
