"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { ContentLayout, ContentSection, ContentSectionPage, ContentSort, ContentType } from "@/lib/cms/types";
import { CONTENT_LAYOUTS, CONTENT_SECTION_PAGES, CONTENT_SORTS, CONTENT_TYPES } from "@/lib/cms/types";
import {
  createSection,
  deleteSection,
  listSections,
  reorderSections,
  updateSection,
} from "./cmsAdminClient";

type SectionForm = {
  id?: string;
  page: ContentSectionPage;
  section_key: string;
  title: string;
  subtitle: string;
  filter_type: "" | ContentType;
  filter_category: string;
  filter_tag: string;
  sort_by: ContentSort;
  display_limit: number;
  layout: ContentLayout;
  is_active: boolean;
  order_position: number;
};

const blankForm = (page: ContentSectionPage): SectionForm => ({
  page,
  section_key: "",
  title: "",
  subtitle: "",
  filter_type: "",
  filter_category: "",
  filter_tag: "",
  sort_by: "priority_desc",
  display_limit: 6,
  layout: "grid-3",
  is_active: true,
  order_position: 0,
});

const toForm = (section: ContentSection): SectionForm => ({
  id: section.id,
  page: section.page,
  section_key: section.section_key,
  title: section.title,
  subtitle: section.subtitle || "",
  filter_type: section.filter_type || "",
  filter_category: section.filter_category || "",
  filter_tag: section.filter_tag || "",
  sort_by: section.sort_by,
  display_limit: section.display_limit,
  layout: section.layout,
  is_active: section.is_active,
  order_position: section.order_position,
});

export default function SectionManager() {
  const [page, setPage] = useState<ContentSectionPage>("PROMO");
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [form, setForm] = useState<SectionForm>(() => blankForm("PROMO"));
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSections(page);
      setSections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat sections.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    setForm(blankForm(page));
    void load();
  }, [page, load]);

  const setField = <K extends keyof SectionForm>(key: K, value: SectionForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const input = {
        page: form.page,
        section_key: form.section_key,
        title: form.title,
        subtitle: form.subtitle || null,
        filter_type: form.filter_type || null,
        filter_category: form.filter_category || null,
        filter_tag: form.filter_tag || null,
        sort_by: form.sort_by,
        display_limit: Number(form.display_limit),
        layout: form.layout,
        is_active: form.is_active,
        order_position: Number(form.order_position),
      };

      if (form.id) {
        await updateSection(form.id, input);
        setMessage("Section berhasil diperbarui.");
      } else {
        await createSection(input);
        setMessage("Section berhasil dibuat.");
      }
      setForm(blankForm(page));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan section.");
    } finally {
      setPending(false);
    }
  };

  const remove = async (section: ContentSection) => {
    if (!confirm(`Hapus section "${section.title}"?`)) return;
    setPending(true);
    try {
      await deleteSection(section.id);
      setMessage("Section berhasil dihapus.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus section.");
    } finally {
      setPending(false);
    }
  };

  const toggleActive = async (section: ContentSection) => {
    setPending(true);
    try {
      await updateSection(section.id, { is_active: !section.is_active });
      setMessage("Status section diperbarui.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status section.");
    } finally {
      setPending(false);
    }
  };

  const saveOrder = async () => {
    setPending(true);
    try {
      await reorderSections(sections.map((section) => ({ id: section.id, order_position: section.order_position })));
      setMessage("Urutan section berhasil disimpan.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan urutan section.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Page Sections</p>
          <h3 className="text-xl font-black text-slate-950">Dynamic public sections</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">Kelola filter, layout, limit, dan urutan section publik.</p>
        </div>
        <div className="flex overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
          {CONTENT_SECTION_PAGES.map((item) => (
            <button key={item} type="button" onClick={() => setPage(item)} className={`rounded-lg px-4 py-2 text-xs font-black ${page === item ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-white"}`}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {(error || message) && (
        <div role={error ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] [&_.section-input]:w-full [&_.section-input]:rounded-xl [&_.section-input]:border [&_.section-input]:border-slate-200 [&_.section-input]:bg-white [&_.section-input]:px-3 [&_.section-input]:py-2.5 [&_.section-input]:text-sm [&_.section-input]:font-semibold [&_.section-input]:outline-none [&_.section-input]:focus:border-blue-400 [&_.section-input]:focus:ring-2 [&_.section-input]:focus:ring-blue-100">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="font-black text-slate-950">{form.id ? "Edit Section" : "Create Section"}</h4>
            {form.id && <button type="button" onClick={() => setForm(blankForm(page))} className="text-xs font-bold text-slate-500 hover:text-blue-600">Clear</button>}
          </div>
          <div className="space-y-3">
            <Input label="Section Key"><input className="section-input font-mono" value={form.section_key} onChange={(event) => setField("section_key", event.target.value)} disabled={Boolean(form.id)} placeholder="flash_sale" /></Input>
            <Input label="Title"><input className="section-input" value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="Flash Sale" /></Input>
            <Input label="Subtitle"><input className="section-input" value={form.subtitle} onChange={(event) => setField("subtitle", event.target.value)} placeholder="Promo terbatas minggu ini" /></Input>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Filter Type"><select className="section-input" value={form.filter_type} onChange={(event) => setField("filter_type", event.target.value as SectionForm["filter_type"])}><option value="">Any</option>{CONTENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></Input>
              <Input label="Filter Category"><input className="section-input" value={form.filter_category} onChange={(event) => setField("filter_category", event.target.value)} /></Input>
              <Input label="Filter Tag"><input className="section-input" value={form.filter_tag} onChange={(event) => setField("filter_tag", event.target.value)} /></Input>
              <Input label="Sort"><select className="section-input" value={form.sort_by} onChange={(event) => setField("sort_by", event.target.value as ContentSort)}>{CONTENT_SORTS.map((sort) => <option key={sort} value={sort}>{sort}</option>)}</select></Input>
              <Input label="Limit"><input className="section-input" type="number" min={1} max={50} value={form.display_limit} onChange={(event) => setField("display_limit", Number(event.target.value))} /></Input>
              <Input label="Layout"><select className="section-input" value={form.layout} onChange={(event) => setField("layout", event.target.value as ContentLayout)}>{CONTENT_LAYOUTS.map((layout) => <option key={layout} value={layout}>{layout}</option>)}</select></Input>
              <Input label="Order"><input className="section-input" type="number" min={0} value={form.order_position} onChange={(event) => setField("order_position", Number(event.target.value))} /></Input>
              <Input label="Active"><label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => setField("is_active", event.target.checked)} /> Active</label></Input>
            </div>
            <button type="button" onClick={() => void save()} disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
              {pending ? <Loader2 size={16} className="animate-spin" /> : form.id ? <Save size={16} /> : <Plus size={16} />}
              {form.id ? "Save Section" : "Create Section"}
            </button>
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-black text-slate-950">{page} sections</p>
            <button type="button" onClick={() => void saveOrder()} disabled={pending || sections.length === 0} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50">Save Order</button>
          </div>
          {loading ? (
            <div className="flex min-h-60 items-center justify-center text-slate-500"><Loader2 className="animate-spin" size={22} /></div>
          ) : sections.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">Belum ada section untuk page ini.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sections.map((section, index) => (
                <article key={section.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950">{section.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${section.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{section.is_active ? "ACTIVE" : "INACTIVE"}</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-400">{section.section_key}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">type={section.filter_type || "any"} · category={section.filter_category || "any"} · tag={section.filter_tag || "any"} · {section.sort_by} · {section.layout} · limit {section.display_limit}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <input aria-label={`Order ${section.title}`} type="number" min={0} value={section.order_position} onChange={(event) => setSections((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, order_position: Number(event.target.value) } : item))} className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold" />
                    <button type="button" onClick={() => setForm(toForm(section))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Edit</button>
                    <button type="button" onClick={() => void toggleActive(section)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">{section.is_active ? "Deactivate" : "Activate"}</button>
                    <button type="button" onClick={() => void remove(section)} className="inline-flex items-center gap-1 rounded-lg border border-rose-100 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"><Trash2 size={13} /> Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Input({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}
