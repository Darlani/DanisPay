"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Archive, CheckCircle2, Loader2, RotateCcw, X } from "lucide-react";
import type { ContentType, CtaTarget, PublicContent } from "@/lib/cms/types";
import { CONTENT_TYPES, CTA_TARGETS } from "@/lib/cms/types";
import {
  archiveContent,
  createContent,
  publishContent,
  unpublishContent,
  updateContent,
} from "./cmsAdminClient";

type ContentForm = {
  title: string;
  slug: string;
  type: ContentType;
  category: string;
  tags: string;
  excerpt: string;
  body: string;
  cover_image_url: string;
  published_at: string;
  expired_at: string;
  event_start_at: string;
  event_end_at: string;
  cta_label: string;
  cta_url: string;
  cta_target: CtaTarget;
  is_featured: boolean;
  priority: number;
};

interface ContentEditorModalProps {
  content: PublicContent | null;
  defaultType?: ContentType;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const emptyForm = (type: ContentType = "NEWS"): ContentForm => ({
  title: "",
  slug: "",
  type,
  category: "",
  tags: "",
  excerpt: "",
  body: "",
  cover_image_url: "",
  published_at: "",
  expired_at: "",
  event_start_at: "",
  event_end_at: "",
  cta_label: "",
  cta_url: "",
  cta_target: "_self",
  is_featured: false,
  priority: 0,
});

function toLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function validateCtaUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed.startsWith("//") ? "URL internal tidak boleh diawali //." : null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? null : "CTA eksternal wajib menggunakan https://.";
  } catch {
    return "CTA URL tidak valid. Gunakan /path atau https://...";
  }
}

export default function ContentEditorModal({
  content,
  defaultType = "NEWS",
  onClose,
  onSaved,
}: ContentEditorModalProps) {
  const [form, setForm] = useState<ContentForm>(() => emptyForm(defaultType));
  const [slugTouched, setSlugTouched] = useState(Boolean(content?.slug));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(content);

  useEffect(() => {
    if (!content) {
      setForm(emptyForm(defaultType));
      setSlugTouched(false);
      return;
    }

    setForm({
      title: content.title,
      slug: content.slug,
      type: content.type,
      category: content.category || "",
      tags: content.tags.join(", "),
      excerpt: content.excerpt || "",
      body: content.body,
      cover_image_url: content.cover_image_url || "",
      published_at: toLocalInput(content.published_at),
      expired_at: toLocalInput(content.expired_at),
      event_start_at: toLocalInput(content.event_start_at),
      event_end_at: toLocalInput(content.event_end_at),
      cta_label: content.cta_label || "",
      cta_url: content.cta_url || "",
      cta_target: content.cta_target,
      is_featured: content.is_featured,
      priority: content.priority,
    });
    setSlugTouched(true);
  }, [content, defaultType]);

  const ctaError = useMemo(() => validateCtaUrl(form.cta_url), [form.cta_url]);

  const setField = <K extends keyof ContentForm>(key: K, value: ContentForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleTitleChange = (title: string) => {
    setForm((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : slugify(title),
    }));
  };

  const buildInput = () => ({
    title: form.title,
    slug: form.slug || undefined,
    type: form.type,
    body: form.body,
    excerpt: form.excerpt || null,
    cover_image_url: form.cover_image_url || null,
    category: form.category || null,
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    published_at: toIso(form.published_at),
    expired_at: toIso(form.expired_at),
    event_start_at: toIso(form.event_start_at),
    event_end_at: toIso(form.event_end_at),
    cta_label: form.cta_label || null,
    cta_url: form.cta_url || null,
    cta_target: form.cta_target,
    is_featured: form.is_featured,
    priority: Number(form.priority) || 0,
  });

  const runAction = async (action: () => Promise<unknown>, message: string, close = true) => {
    if (ctaError) {
      setError(ctaError);
      return;
    }

    setPending(true);
    setError(null);
    try {
      await action();
      onSaved(message);
      if (close) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi CMS gagal.");
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = () => {
    void runAction(
      () => (content ? updateContent(content.id, buildInput()) : createContent(buildInput())),
      content ? "Konten berhasil diperbarui." : "Draft konten berhasil dibuat.",
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Content editor">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Content CMS</p>
            <h2 className="text-lg font-black text-slate-950 sm:text-2xl">{isEdit ? "Edit Content" : "Create Draft"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="Tutup editor">
            <X size={20} />
          </button>
        </header>

        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5 [&_.cms-input]:w-full [&_.cms-input]:rounded-xl [&_.cms-input]:border [&_.cms-input]:border-slate-200 [&_.cms-input]:bg-white [&_.cms-input]:px-3 [&_.cms-input]:py-2.5 [&_.cms-input]:text-sm [&_.cms-input]:font-semibold [&_.cms-input]:text-slate-800 [&_.cms-input]:outline-none [&_.cms-input]:transition [&_.cms-input]:focus:border-blue-400 [&_.cms-input]:focus:ring-2 [&_.cms-input]:focus:ring-blue-100">
          {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

          <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-4">
              <Field label="Title" required>
                <input value={form.title} onChange={(event) => handleTitleChange(event.target.value)} className="cms-input" placeholder="Judul konten" />
              </Field>
              <Field label="Slug">
                <input value={form.slug} onChange={(event) => { setSlugTouched(true); setField("slug", slugify(event.target.value)); }} className="cms-input font-mono" placeholder="auto-from-title" />
              </Field>
              <Field label="Excerpt">
                <textarea value={form.excerpt} onChange={(event) => setField("excerpt", event.target.value)} className="cms-input min-h-20" placeholder="Ringkasan singkat untuk SEO/kartu publik" />
              </Field>
              <Field label="Body" required>
                <textarea value={form.body} onChange={(event) => setField("body", event.target.value)} className="cms-input min-h-48" placeholder="Isi konten" />
              </Field>
            </div>

            <div className="space-y-4">
              <Field label="Type">
                <select value={form.type} onChange={(event) => setField("type", event.target.value as ContentType)} className="cms-input">
                  {CONTENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <input value={form.category} onChange={(event) => setField("category", event.target.value)} className="cms-input" placeholder="Game, Event, Sistem" />
              </Field>
              <Field label="Tags">
                <input value={form.tags} onChange={(event) => setField("tags", event.target.value)} className="cms-input" placeholder="flash-sale, mlbb" />
              </Field>
              <Field label="Cover Image URL">
                <input value={form.cover_image_url} onChange={(event) => setField("cover_image_url", event.target.value)} className="cms-input" placeholder="https://..." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Featured">
                  <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={form.is_featured} onChange={(event) => setField("is_featured", event.target.checked)} /> Featured
                  </label>
                </Field>
                <Field label="Priority">
                  <input type="number" value={form.priority} onChange={(event) => setField("priority", Number(event.target.value))} className="cms-input" />
                </Field>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Field label="Published At">
              <input type="datetime-local" value={form.published_at} onChange={(event) => setField("published_at", event.target.value)} className="cms-input" />
            </Field>
            <Field label="Expired At">
              <input type="datetime-local" value={form.expired_at} onChange={(event) => setField("expired_at", event.target.value)} className="cms-input" />
            </Field>
            <Field label="Event Start">
              <input type="datetime-local" value={form.event_start_at} onChange={(event) => setField("event_start_at", event.target.value)} className="cms-input" />
            </Field>
            <Field label="Event End">
              <input type="datetime-local" value={form.event_end_at} onChange={(event) => setField("event_end_at", event.target.value)} className="cms-input" />
            </Field>
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.7fr_1fr_0.4fr]">
            <Field label="CTA Label">
              <input value={form.cta_label} onChange={(event) => setField("cta_label", event.target.value)} className="cms-input" placeholder="Baca selengkapnya" />
            </Field>
            <Field label="CTA URL">
              <input value={form.cta_url} onChange={(event) => setField("cta_url", event.target.value)} className="cms-input" placeholder="/promo atau https://..." />
              {ctaError && <p className="mt-1 text-xs font-semibold text-rose-600">{ctaError}</p>}
            </Field>
            <Field label="Target">
              <select value={form.cta_target} onChange={(event) => setField("cta_target", event.target.value as CtaTarget)} className="cms-input">
                {CTA_TARGETS.map((target) => <option key={target} value={target}>{target}</option>)}
              </select>
            </Field>
          </section>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {content && <WorkflowButton label="Publish / Schedule" icon={<CheckCircle2 size={16} />} disabled={pending} onClick={() => void runAction(() => publishContent(content.id, toIso(form.published_at)), "Konten berhasil dipublish/dijadwalkan.", false)} />}
            {content && <WorkflowButton label="Archive" icon={<Archive size={16} />} disabled={pending} onClick={() => void runAction(() => archiveContent(content.id), "Konten berhasil diarsipkan.", false)} />}
            {content && <WorkflowButton label="Unpublish" icon={<RotateCcw size={16} />} disabled={pending} onClick={() => void runAction(() => unpublishContent(content.id), "Konten dikembalikan ke DRAFT.", false)} />}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {pending && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? "Save Changes" : "Create Draft"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}{required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function WorkflowButton({ label, icon, disabled, onClick }: { label: string; icon: ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
      {icon}{label}
    </button>
  );
}
