"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Archive, CheckCircle2, Edit3, Loader2, Pin, RotateCcw, SlidersHorizontal, Trash2 } from "lucide-react";
import AdminBadge from "../shared/AdminBadge";
import type { PublicContent } from "@/lib/cms/types";
import {
  archiveContent,
  deleteContent,
  publishContent,
  setContentFeatured,
  unpublishContent,
  updateContentPriority,
} from "./cmsAdminClient";

interface ContentTableProps {
  items: PublicContent[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  isAdmin: boolean;
  onPageChange: (page: number) => void;
  onEdit: (content: PublicContent) => void;
  onRefresh: (message?: string) => void;
}

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
};

export default function ContentTable({
  items,
  loading,
  error,
  total,
  page,
  totalPages,
  isAdmin,
  onPageChange,
  onEdit,
  onRefresh,
}: ContentTableProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (id: string, action: () => Promise<unknown>, message: string) => {
    setBusyId(id);
    try {
      await action();
      onRefresh(message);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Aksi CMS gagal.");
    } finally {
      setBusyId(null);
    }
  };

  const handlePriority = (item: PublicContent) => {
    const nextValue = prompt("Masukkan priority baru:", String(item.priority));
    if (nextValue === null) return;
    const priority = Number(nextValue);
    if (!Number.isSafeInteger(priority)) {
      alert("Priority wajib berupa integer valid.");
      return;
    }
    void run(item.id, () => updateContentPriority(item.id, priority), "Priority konten diperbarui.");
  };

  const handleDelete = (item: PublicContent) => {
    if (!isAdmin) return;
    const confirmed = confirm(`Hapus permanen konten "${item.title}"? Aksi ini hanya untuk Admin.`);
    if (!confirmed) return;
    void run(item.id, () => deleteContent(item.id), "Konten berhasil dihapus.");
  };

  if (loading) {
    return <StateCard icon={<Loader2 className="animate-spin" size={20} />} title="Memuat Content CMS" text="Mengambil data dari API admin..." />;
  }

  if (error) {
    return <StateCard title="Gagal memuat konten" text={error} tone="rose" />;
  }

  if (items.length === 0) {
    return <StateCard title="Belum ada konten" text="Buat draft pertama atau ubah filter pencarian." />;
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-270 w-full text-left text-sm">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70">
                <td className="max-w-80 px-5 py-4">
                  <p className="truncate font-black text-slate-950">{item.title}</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-slate-400">/{item.slug}</p>
                </td>
                <td className="px-4 py-4"><AdminBadge status={item.type} showDot={false} /></td>
                <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-4 text-xs font-bold text-slate-600">{item.category || "-"}</td>
                <td className="px-4 py-4 text-xs font-bold text-slate-600">{item.is_featured ? "Yes" : "No"}</td>
                <td className="px-4 py-4 font-mono text-xs font-black text-slate-700">{item.priority}</td>
                <td className="px-4 py-4 text-xs text-slate-500">{formatDate(item.published_at)}</td>
                <td className="px-4 py-4 text-xs text-slate-500">{formatDate(item.updated_at)}</td>
                <td className="px-5 py-4">
                  <ActionGroup item={item} busy={busyId === item.id} isAdmin={isAdmin} onEdit={onEdit} onRun={run} onPriority={handlePriority} onDelete={handleDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 lg:hidden">
        {items.map((item) => (
          <article key={item.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{item.title}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-400">/{item.slug}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 min-[360px]:grid-cols-3">
              <Meta label="Type" value={item.type} />
              <Meta label="Category" value={item.category || "-"} />
              <Meta label="Priority" value={String(item.priority)} />
              <Meta label="Featured" value={item.is_featured ? "Yes" : "No"} />
              <Meta label="Published" value={formatDate(item.published_at)} />
              <Meta label="Updated" value={formatDate(item.updated_at)} />
            </div>
            <ActionGroup item={item} busy={busyId === item.id} isAdmin={isAdmin} onEdit={onEdit} onRun={run} onPriority={handlePriority} onDelete={handleDelete} compact />
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>{total.toLocaleString("id-ID")} content • page {page} / {Math.max(totalPages, 1)}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:opacity-40">Prev</button>
          <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}

function ActionGroup({
  item,
  busy,
  isAdmin,
  compact,
  onEdit,
  onRun,
  onPriority,
  onDelete,
}: {
  item: PublicContent;
  busy: boolean;
  isAdmin: boolean;
  compact?: boolean;
  onEdit: (content: PublicContent) => void;
  onRun: (id: string, action: () => Promise<unknown>, message: string) => Promise<void>;
  onPriority: (content: PublicContent) => void;
  onDelete: (content: PublicContent) => void;
}) {
  const buttonClass = compact ? "px-2.5 py-2" : "px-2.5 py-1.5";
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <IconButton label="Edit" className={buttonClass} disabled={busy} onClick={() => onEdit(item)} icon={<Edit3 size={14} />} />
      <IconButton label="Publish" className={buttonClass} disabled={busy} onClick={() => void onRun(item.id, () => publishContent(item.id, item.published_at), "Konten berhasil dipublish/dijadwalkan.")} icon={<CheckCircle2 size={14} />} />
      <IconButton label="Archive" className={buttonClass} disabled={busy} onClick={() => void onRun(item.id, () => archiveContent(item.id), "Konten berhasil diarsipkan.")} icon={<Archive size={14} />} />
      <IconButton label="Unpublish" className={buttonClass} disabled={busy} onClick={() => void onRun(item.id, () => unpublishContent(item.id), "Konten kembali ke DRAFT.")} icon={<RotateCcw size={14} />} />
      <IconButton label={item.is_featured ? "Unfeature" : "Feature"} className={buttonClass} disabled={busy} onClick={() => void onRun(item.id, () => setContentFeatured(item.id, !item.is_featured), "Featured konten diperbarui.")} icon={<Pin size={14} />} />
      <IconButton label="Priority" className={buttonClass} disabled={busy} onClick={() => onPriority(item)} icon={<SlidersHorizontal size={14} />} />
      {isAdmin && <IconButton label="Delete" className={`${buttonClass} text-rose-600 hover:bg-rose-50`} disabled={busy} onClick={() => onDelete(item)} icon={<Trash2 size={14} />} />}
      {busy && <Loader2 size={16} className="mt-2 animate-spin text-blue-600" />}
    </div>
  );
}

function IconButton({ label, icon, disabled, onClick, className = "" }: { label: string; icon: ReactNode; disabled?: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={label} title={label} className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
      {icon}<span className="hidden min-[420px]:inline">{label}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: PublicContent["status"] }) {
  const tone = {
    DRAFT: "border-slate-200 bg-slate-100 text-slate-600",
    SCHEDULED: "border-blue-100 bg-blue-50 text-blue-700",
    PUBLISHED: "border-emerald-100 bg-emerald-50 text-emerald-700",
    EXPIRED: "border-amber-100 bg-amber-50 text-amber-700",
    ARCHIVED: "border-rose-100 bg-rose-50 text-rose-700",
  }[status];
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black ${tone}`}>{status}</span>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-bold text-slate-700">{value}</p>
    </div>
  );
}

function StateCard({ icon, title, text, tone = "slate" }: { icon?: ReactNode; title: string; text: string; tone?: "slate" | "rose" }) {
  return (
    <div className={`flex min-h-60 items-center justify-center rounded-[22px] border border-dashed p-8 text-center ${tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-500"}`}>
      <div>
        {icon && <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{icon}</div>}
        <p className="font-black text-slate-800">{title}</p>
        <p className="mt-1 text-sm font-medium">{text}</p>
      </div>
    </div>
  );
}
