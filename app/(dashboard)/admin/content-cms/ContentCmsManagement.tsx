"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileText,
  Layers,
  Megaphone,
  Newspaper,
  Plus,
  RefreshCw,
  Search,
  Wrench,
} from "lucide-react";
import AdminKpi from "../shared/AdminKpi";
import ContentEditorModal from "./ContentEditorModal";
import ContentTable from "./ContentTable";
import SectionManager from "./SectionManager";
import { listContents } from "./cmsAdminClient";
import type { ContentType, PublicContent } from "@/lib/cms/types";
import { CONTENT_STATUSES, CONTENT_TYPES } from "@/lib/cms/types";

type CmsTab = "ALL" | "NEWS" | "PROMO" | "ANNOUNCEMENT" | "MAINTENANCE" | "SECTIONS";

interface ContentCmsManagementProps {
  currentRole?: string;
}

const TAB_CONFIG: Array<{ id: CmsTab; label: string; icon: typeof FileText }> = [
  { id: "ALL", label: "All Content", icon: Layers },
  { id: "NEWS", label: "News", icon: Newspaper },
  { id: "PROMO", label: "Promo", icon: Megaphone },
  { id: "ANNOUNCEMENT", label: "Announcements", icon: AlertCircle },
  { id: "MAINTENANCE", label: "Maintenance", icon: Wrench },
  { id: "SECTIONS", label: "Sections", icon: Calendar },
];

export default function ContentCmsManagement({ currentRole = "Admin" }: ContentCmsManagementProps) {
  const [tab, setTab] = useState<CmsTab>("ALL");
  const [items, setItems] = useState<PublicContent[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [category, setCategory] = useState("");
  const [isFeatured, setIsFeatured] = useState<string>("");
  const [sortBy, setSortBy] = useState("created_desc");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<PublicContent | null>(null);

  const isAdmin = useMemo(() => {
    const normalized = currentRole.trim().toLowerCase();
    return normalized === "admin";
  }, [currentRole]);

  const activeTypeFilter = useMemo<ContentType | undefined>(() => {
    if (tab === "NEWS") return "NEWS";
    if (tab === "PROMO") return "PROMO";
    if (tab === "ANNOUNCEMENT") return "ANNOUNCEMENT";
    if (tab === "MAINTENANCE") return "MAINTENANCE";
    return type ? (type as ContentType) : undefined;
  }, [tab, type]);

  const load = useCallback(async () => {
    if (tab === "SECTIONS") return;
    setLoading(true);
    setError(null);
    try {
      const data = await listContents({
        type: activeTypeFilter,
        status: status || undefined,
        category: category.trim() || undefined,
        is_featured: isFeatured === "" ? undefined : isFeatured,
        search: search.trim() || undefined,
        sort_by: sortBy || undefined,
        page,
        limit: 15,
      });
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat konten CMS.");
    } finally {
      setLoading(false);
    }
  }, [tab, activeTypeFilter, status, category, isFeatured, search, sortBy, page]);

  useEffect(() => {
    setPage(1);
  }, [tab, status, type, category, isFeatured, search, sortBy]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpi = useMemo(() => {
    const draft = items.filter((item) => item.status === "DRAFT").length;
    const scheduled = items.filter((item) => item.status === "SCHEDULED").length;
    const published = items.filter((item) => item.status === "PUBLISHED").length;
    return { draft, scheduled, published };
  }, [items]);

  const handleEdit = (content: PublicContent) => {
    setEditingContent(content);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingContent(null);
    setEditorOpen(true);
  };

  const handleFeedback = (message?: string) => {
    if (message) {
      setToast(message);
      setTimeout(() => setToast(null), 3000);
    }
    void load();
  };

  return (
    <div className="w-full space-y-6 pb-16 font-sans text-slate-900">
      <header className="flex flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.03)] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">DaPay Public CMS</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Content CMS</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Kelola artikel, promosi, pengumuman, maintenance, dan section publik.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" onClick={handleCreate} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700">
            <Plus size={16} /> Create Content
          </button>
        </div>
      </header>

      {toast && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {toast}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminKpi title="Total Content" value={total} subtitle="Konten terdaftar di filter aktif" variant="blue" icon={<FileText size={18} />} />
        <AdminKpi title="Draft" value={kpi.draft} subtitle="Konten belum tayang" variant="default" icon={<Layers size={18} />} />
        <AdminKpi title="Scheduled" value={kpi.scheduled} subtitle="Menunggu waktu publish" variant="amber" icon={<Calendar size={18} />} />
        <AdminKpi title="Published" value={kpi.published} subtitle="Sedang aktif di publik" variant="emerald" icon={<CheckCircle2 size={18} />} />
      </section>

      <nav aria-label="CMS Sections" className="flex overflow-x-auto rounded-[20px] border border-slate-200 bg-white p-1.5 shadow-xs">
        {TAB_CONFIG.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${active ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-slate-500 hover:bg-slate-100"}`}>
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {tab === "SECTIONS" ? (
        <SectionManager />
      ) : (
        <div className="space-y-4">
          <section className="grid gap-2.5 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.03)] sm:grid-cols-2 lg:grid-cols-6 [&_.filter-input]:h-10 [&_.filter-input]:w-full [&_.filter-input]:rounded-xl [&_.filter-input]:border [&_.filter-input]:border-slate-200 [&_.filter-input]:bg-white [&_.filter-input]:px-3 [&_.filter-input]:text-xs [&_.filter-input]:font-bold [&_.filter-input]:text-slate-700 [&_.filter-input]:outline-none [&_.filter-input]:focus:border-blue-400">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title/slug/body..." className="filter-input pl-9" />
            </div>
            {tab === "ALL" && (
              <select value={type} onChange={(event) => setType(event.target.value)} className="filter-input">
                <option value="">All Types</option>
                {CONTENT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            )}
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="filter-input">
              <option value="">All Status</option>
              {CONTENT_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category..." className="filter-input" />
            <select value={isFeatured} onChange={(event) => setIsFeatured(event.target.value)} className="filter-input">
              <option value="">All Pin</option>
              <option value="true">Featured Only</option>
              <option value="false">Non-Featured</option>
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="filter-input">
              <option value="created_desc">Terbaru Dibuat</option>
              <option value="published_desc">Terbaru Publish</option>
              <option value="priority_desc">Priority Tertinggi</option>
            </select>
          </section>

          <ContentTable
            items={items}
            loading={loading}
            error={error}
            total={total}
            page={page}
            totalPages={totalPages}
            isAdmin={isAdmin}
            onPageChange={setPage}
            onEdit={handleEdit}
            onRefresh={handleFeedback}
          />
        </div>
      )}

      {editorOpen && (
        <ContentEditorModal
          content={editingContent}
          defaultType={tab === "SECTIONS" || tab === "ALL" ? "NEWS" : tab}
          onClose={() => setEditorOpen(false)}
          onSaved={(message) => {
            setEditorOpen(false);
            handleFeedback(message);
          }}
        />
      )}
    </div>
  );
}
