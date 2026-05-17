"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  FilePenLine,
  FileQuestion,
  FolderKanban,
  Pencil,
  Plus,
  Save,
  Search,
  SquarePen,
  Trash2,
  X
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import EmptyState from "@/components/ui/EmptyState";

const emptyCategoryForm = {
  id: null,
  name: "",
  description: "",
  sort_order: 0,
  is_active: true
};

const emptyItemForm = {
  id: null,
  category_id: "",
  question: "",
  answer: "",
  status: "published"
};

function SummaryCard({ title, value, description, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white",
    blue: "border-sky-200 bg-sky-50/70",
    emerald: "border-emerald-200 bg-emerald-50/70",
    amber: "border-amber-200 bg-amber-50/70"
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function PanelShell({ title, description, icon: Icon, onClose, children }) {
  return (
    <section className="surface space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-dinkes-50 p-3 text-dinkes-700">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <button className="btn-secondary" type="button" onClick={onClose}>
          <X className="h-4 w-4" />
          Tutup
        </button>
      </div>
      {children}
    </section>
  );
}

export default function QnaAdminPage() {
  const [data, setData] = useState({ categories: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [panelMode, setPanelMode] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const deferredSearch = useDeferredValue(search);

  async function refreshData() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/qna/admin", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Data QnA gagal dimuat.");
      }
      const categories = payload.data?.categories || [];
      setData(payload.data || { categories: [], items: [] });
      setActiveCategoryId((current) => current || categories[0]?.id || null);
    } catch (err) {
      setError(err.message || "Data QnA gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  const filteredCategories = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    if (!keyword) return data.categories;
    return data.categories.filter((category) => {
      const text = [category.name, category.description, ...(category.items || []).flatMap((item) => [item.question, item.answer])].join(" ").toLowerCase();
      return text.includes(keyword);
    });
  }, [data.categories, deferredSearch]);

  useEffect(() => {
    if (!filteredCategories.length) {
      setActiveCategoryId(null);
      return;
    }
    if (!filteredCategories.some((category) => category.id === activeCategoryId)) {
      setActiveCategoryId(filteredCategories[0]?.id || null);
    }
  }, [filteredCategories, activeCategoryId]);

  const activeCategory = filteredCategories.find((category) => category.id === activeCategoryId) || null;
  const filteredItems = useMemo(() => {
    const source = activeCategory?.items || [];
    const keyword = deferredSearch.trim().toLowerCase();
    if (!keyword) return source;
    return source.filter((item) => `${item.question} ${item.answer}`.toLowerCase().includes(keyword));
  }, [activeCategory, deferredSearch]);

  const summaries = useMemo(() => ({
    categories: data.categories.length,
    items: data.items.length,
    published: data.items.filter((item) => item.status === "published").length,
    draft: data.items.filter((item) => item.status === "draft").length
  }), [data]);

  function closePanel() {
    setPanelMode(null);
    setCategoryForm(emptyCategoryForm);
    setItemForm(emptyItemForm);
  }

  function openCreateCategory() {
    setPanelMode("category-create");
    setCategoryForm(emptyCategoryForm);
  }

  function openEditCategory(category) {
    setPanelMode("category-edit");
    setCategoryForm({
      id: category.id,
      name: category.name || "",
      description: category.description || "",
      sort_order: Number(category.sort_order || 0),
      is_active: Boolean(category.is_active)
    });
  }

  function openCreateItem() {
    setPanelMode("item-create");
    setItemForm({
      ...emptyItemForm,
      category_id: activeCategory?.id ? String(activeCategory.id) : ""
    });
  }

  function openEditItem(item) {
    setPanelMode("item-edit");
    setItemForm({
      id: item.id,
      category_id: String(item.category_id),
      question: item.question || "",
      answer: item.answer || "",
      status: item.status || "published"
    });
  }

  async function submitCategory(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        panelMode === "category-edit" ? `/api/qna/category/${categoryForm.id}` : "/api/qna/admin",
        {
          method: panelMode === "category-edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            panelMode === "category-edit"
              ? categoryForm
              : { ...categoryForm, type: "category" }
          )
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Kategori gagal disimpan.");
      }
      closePanel();
      await refreshData();
    } catch (err) {
      setError(err.message || "Kategori gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function submitItem(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        panelMode === "item-edit" ? `/api/qna/item/${itemForm.id}` : "/api/qna/admin",
        {
          method: panelMode === "item-edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            panelMode === "item-edit"
              ? { ...itemForm, category_id: Number(itemForm.category_id) }
              : { ...itemForm, type: "item", category_id: Number(itemForm.category_id) }
          )
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Item QnA gagal disimpan.");
      }
      closePanel();
      await refreshData();
    } catch (err) {
      setError(err.message || "Item QnA gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(deleteTarget.url, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Data QnA gagal dihapus.");
      }
      setDeleteTarget(null);
      await refreshData();
    } catch (err) {
      setError(err.message || "Data QnA gagal dihapus.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="QnA Admin Dinas"
        description="Kelola kategori dan pertanyaan QnA yang tampil di halaman depan. CRUD hanya tersedia untuk Super Admin."
        breadcrumbs={[{ label: "QnA Admin" }]}
        action={(
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={openCreateCategory}>
              <FolderKanban className="h-4 w-4" />
              Tambah Kategori
            </button>
            <button className="btn-primary" type="button" onClick={openCreateItem}>
              <Plus className="h-4 w-4" />
              Tambah QnA
            </button>
          </div>
        )}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Kategori" value={summaries.categories} description="Kategori yang tersedia di knowledge base." />
        <SummaryCard title="Total QnA" value={summaries.items} description="Seluruh item pertanyaan dan jawaban." tone="blue" />
        <SummaryCard title="Published" value={summaries.published} description="QnA yang tampil di halaman depan." tone="emerald" />
        <SummaryCard title="Draft" value={summaries.draft} description="QnA yang masih disimpan sebagai konsep." tone="amber" />
      </div>

      {error ? (
        <section className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      <section className={`grid gap-5 ${panelMode ? "xl:grid-cols-[390px_1fr]" : "xl:grid-cols-1"}`}>
        {panelMode === "category-create" || panelMode === "category-edit" ? (
          <PanelShell
            title={panelMode === "category-create" ? "Tambah Kategori" : "Edit Kategori"}
            description="Atur nama, urutan, dan status aktif kategori QnA."
            icon={FolderKanban}
            onClose={closePanel}
          >
            <form className="space-y-4" onSubmit={submitCategory}>
              <label className="space-y-2">
                <span className="label">Nama Kategori</span>
                <input className="input" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} required />
              </label>
              <label className="space-y-2">
                <span className="label">Deskripsi</span>
                <textarea className="input min-h-28" value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <label className="space-y-2">
                <span className="label">Urutan Tampil</span>
                <input className="input" type="number" value={categoryForm.sort_order} onChange={(event) => setCategoryForm((current) => ({ ...current, sort_order: Number(event.target.value) }))} />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span>Status aktif</span>
                <input type="checkbox" checked={categoryForm.is_active} onChange={(event) => setCategoryForm((current) => ({ ...current, is_active: event.target.checked }))} />
              </label>
              <button className="btn-primary w-full" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Menyimpan..." : "Simpan Kategori"}
              </button>
            </form>
          </PanelShell>
        ) : null}

        {panelMode === "item-create" || panelMode === "item-edit" ? (
          <PanelShell
            title={panelMode === "item-create" ? "Tambah Item QnA" : "Edit Item QnA"}
            description="Pertanyaan berstatus published akan tampil di halaman depan."
            icon={FilePenLine}
            onClose={closePanel}
          >
            <form className="space-y-4" onSubmit={submitItem}>
              <label className="space-y-2">
                <span className="label">Kategori</span>
                <select className="input" value={itemForm.category_id} onChange={(event) => setItemForm((current) => ({ ...current, category_id: event.target.value }))} required>
                  <option value="">Pilih kategori</option>
                  {data.categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="label">Pertanyaan</span>
                <textarea className="input min-h-28" value={itemForm.question} onChange={(event) => setItemForm((current) => ({ ...current, question: event.target.value }))} required />
              </label>
              <label className="space-y-2">
                <span className="label">Jawaban</span>
                <textarea className="input min-h-40" value={itemForm.answer} onChange={(event) => setItemForm((current) => ({ ...current, answer: event.target.value }))} required />
              </label>
              <label className="space-y-2">
                <span className="label">Status</span>
                <select className="input" value={itemForm.status} onChange={(event) => setItemForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <button className="btn-primary w-full" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Menyimpan..." : "Simpan Item"}
              </button>
            </form>
          </PanelShell>
        ) : null}

        <div className="space-y-5">
          <section className="surface p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="relative block min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kategori, pertanyaan, atau jawaban" />
              </label>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
                {filteredItems.length} item pada kategori aktif
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[320px_1fr]">
            <aside className="surface p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-2xl bg-dinkes-50 p-3 text-dinkes-700">
                  <BookOpenText className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Kategori QnA</h2>
                  <p className="text-sm text-slate-500">Pilih kategori untuk melihat dan mengelola item.</p>
                </div>
              </div>

              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)
                ) : filteredCategories.length ? (
                  filteredCategories.map((category) => {
                    const active = category.id === activeCategoryId;
                    return (
                      <article
                        key={category.id}
                        className={`rounded-2xl border p-4 transition ${active ? "border-dinkes-200 bg-dinkes-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-dinkes-100 hover:bg-slate-50"}`}
                      >
                        <button type="button" className="w-full text-left" onClick={() => setActiveCategoryId(category.id)}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{category.name}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">{category.description || "Tanpa deskripsi kategori."}</p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                              {category.items.length}
                            </span>
                          </div>
                        </button>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button className="btn-secondary" type="button" onClick={() => openEditCategory(category)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            className="btn-secondary"
                            type="button"
                            onClick={() => setDeleteTarget({
                              title: `Hapus kategori ${category.name}?`,
                              description: "Semua item QnA pada kategori ini juga akan ikut terhapus karena relasi database menggunakan cascade delete.",
                              url: `/api/qna/category/${category.id}`
                            })}
                          >
                            <Trash2 className="h-4 w-4" />
                            Hapus
                          </button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <EmptyState title="Kategori belum tersedia" description="Tambahkan kategori baru atau ubah kata kunci pencarian." />
                )}
              </div>
            </aside>

            <section className="surface p-5">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Daftar Item QnA</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">{activeCategory?.name || "Belum ada kategori dipilih"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{activeCategory?.description || "Pilih kategori di sisi kiri untuk melihat item pertanyaan."}</p>
                </div>
                <button className="btn-primary" type="button" onClick={openCreateItem}>
                  <Plus className="h-4 w-4" />
                  Tambah Item
                </button>
              </div>

              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)
                ) : filteredItems.length ? (
                  filteredItems.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "published" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>
                              {item.status}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {item.category_name}
                            </span>
                          </div>
                          <h3 className="mt-3 text-base font-bold leading-7 text-slate-900">{item.question}</h3>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.answer}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button className="btn-secondary" type="button" onClick={() => openEditItem(item)}>
                            <SquarePen className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            className="btn-secondary"
                            type="button"
                            onClick={() => setDeleteTarget({
                              title: "Hapus item QnA ini?",
                              description: "Pertanyaan dan jawabannya akan dihapus permanen dari knowledge base.",
                              url: `/api/qna/item/${item.id}`
                            })}
                          >
                            <Trash2 className="h-4 w-4" />
                            Hapus
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState title="Item QnA belum tersedia" description="Tambahkan item baru atau pilih kategori lain." />
                )}
              </div>
            </section>
          </section>
        </div>
      </section>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.title || "Hapus data?"}
        description={deleteTarget?.description || "Data akan dihapus permanen."}
        loading={saving}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
