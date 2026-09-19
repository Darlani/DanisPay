// ============================================================================
// File: lib/cms/content-service.ts
// Description: Central Service Layer for DaPay Content CMS
// Phase: 2A CMS Data Foundation & Service Layer
// ============================================================================

import "server-only";
import { supabaseAdmin } from "@/utils/supabaseAdmin";
import type {
  PublicContent,
  PublicContentTranslation,
  ContentSection,
  CreateContentDraftInput,
  UpdateContentInput,
  ListContentsFilter,
  CreateSectionInput,
  UpdateSectionInput,
  CmsResult,
  CmsErrorCode,
  CmsServiceSuccess,
  CmsServiceError,
} from "./types";
import {
  CONTENT_TYPES,
  CONTENT_SECTION_PAGES,
  CONTENT_SORTS,
  CONTENT_LAYOUTS,
  CTA_TARGETS,
} from "./types";

// ----------------------------------------------------------------------------
// 1. SYSTEM RESERVED SLUGS & NAMESPACES
// ----------------------------------------------------------------------------

export const RESERVED_SLUGS = new Set([
  // Core system & app routes
  "admin",
  "api",
  "login",
  "register",
  "checkout",
  "news",
  "promo",
  "promotions",
  "ref",
  "user",
  "sandbox",
  "qris-analyzer",
  "qris-generator",
  "productsection",
  // Auth sub-routes
  "forgot-password",
  "setup-2fa",
  "update-password",
  // Reserved static assets/endpoints
  "public",
  "_next",
  "static",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

// ----------------------------------------------------------------------------
// 2. HELPER CONSTRUCTORS
// ----------------------------------------------------------------------------

function ok<T>(data: T): CmsServiceSuccess<T> {
  return { isError: false, data };
}

function fail(code: CmsErrorCode, message: string, details?: unknown): CmsServiceError {
  return { isError: true, code, message, details };
}

// ----------------------------------------------------------------------------
// 3. SLUG UTILITIES & VALIDATION
// ----------------------------------------------------------------------------

/**
 * Normalizes any title/text into a valid lowercase kebab-case slug.
 * Format guaranteed: ^[a-z0-9]+(?:-[a-z0-9]+)*$ (length 2..120)
 */
export function slugify(input: string): string {
  let normalized = input
    .trim()
    .toLowerCase()
    // Replace accented/diacritic characters
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Replace non-alphanumeric with dash
    .replace(/[^a-z0-9]+/g, "-")
    // Collapse consecutive dashes
    .replace(/-+/g, "-")
    // Remove leading/trailing dash
    .replace(/^-+|-+$/g, "");

  if (normalized.length < 2) {
    normalized = `${normalized || "content"}-item`;
  }
  if (normalized.length > 120) {
    normalized = normalized.substring(0, 120).replace(/-+$/g, "");
  }

  return normalized;
}

/**
 * Validates a slug against DB constraint regex and reserved namespace.
 */
export function validateSlug(slug: string): string | null {
  const trimmed = slug.trim().toLowerCase();
  if (trimmed.length < 2 || trimmed.length > 120) {
    return "Slug harus memiliki panjang antara 2 hingga 120 karakter.";
  }
  const regex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!regex.test(trimmed)) {
    return "Format slug hanya boleh berupa huruf kecil, angka, dan tanda hubung (-).";
  }
  if (RESERVED_SLUGS.has(trimmed)) {
    return `Slug "${trimmed}" merupakan namespace rute sistem yang dilindungi dan tidak dapat digunakan.`;
  }
  return null;
}

/**
 * Finds an available slug by appending sequential numeric suffixes if a collision exists.
 */
export async function resolveAvailableSlug(
  baseSlug: string,
  excludeId?: string,
): Promise<string> {
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    let query = supabaseAdmin
      .from("public_contents")
      .select("id")
      .eq("slug", candidate);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query.maybeSingle();

    if (!data) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;

    if (counter > 100) {
      // Fallback with timestamp to guarantee uniqueness without infinite loop
      return `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }
  }
}

// ----------------------------------------------------------------------------
// 4. CTA URL VALIDATION
// ----------------------------------------------------------------------------

/**
 * Validates CTA URLs strictly:
 * - Internal: must start with "/" (no protocol-relative //)
 * - External: must start with "https://"
 * Rejects: http:, javascript:, data:, protocol-relative //, spaces
 */
export function validateCtaUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  // Protocol-relative injection check
  if (trimmed.startsWith("//")) {
    return "URL CTA tidak boleh berupa protocol-relative (//). Gunakan rute internal /... atau https://...";
  }

  // Internal route check
  if (trimmed.startsWith("/")) {
    if (trimmed.includes(" ") || trimmed.includes("javascript:") || trimmed.includes("data:")) {
      return "URL internal CTA mengandung karakter atau skema yang tidak aman.";
    }
    return null;
  }

  // External URL check
  if (trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") {
        return "URL eksternal CTA harus menggunakan protokol HTTPS.";
      }
      return null;
    } catch {
      return "Format URL eksternal CTA tidak valid.";
    }
  }

  return "URL CTA harus diawali dengan rute internal (contoh: /mobile-legends) atau HTTPS eksternal (contoh: https://...).";
}

// ----------------------------------------------------------------------------
// 5. DATE CONSISTENCY VALIDATION
// ----------------------------------------------------------------------------

export function validateDates(dates: {
  published_at?: string | null;
  expired_at?: string | null;
  event_start_at?: string | null;
  event_end_at?: string | null;
}): string | null {
  const { published_at, expired_at, event_start_at, event_end_at } = dates;

  if (published_at && expired_at) {
    const pub = new Date(published_at).getTime();
    const exp = new Date(expired_at).getTime();
    if (isNaN(pub) || isNaN(exp)) {
      return "Format tanggal publikasi atau tanggal kedaluwarsa tidak valid.";
    }
    if (exp < pub) {
      return "Waktu kedaluwarsa (expired_at) tidak boleh lebih awal dari waktu publikasi (published_at).";
    }
  }

  if (event_start_at && event_end_at) {
    const start = new Date(event_start_at).getTime();
    const end = new Date(event_end_at).getTime();
    if (isNaN(start) || isNaN(end)) {
      return "Format tanggal mulai kegiatan atau tanggal selesai tidak valid.";
    }
    if (end < start) {
      return "Waktu kegiatan selesai (event_end_at) tidak boleh lebih awal dari waktu mulai (event_start_at).";
    }
  }

  return null;
}

// ----------------------------------------------------------------------------
// 6. CONTENT SERVICE MUTATIONS & QUERIES
// ----------------------------------------------------------------------------

/**
 * Creates a new content draft.
 * - created_by is guaranteed from the authenticated identity.
 * - slug is validated and resolved against collisions.
 * - status defaults to DRAFT.
 */
export async function createContentDraft(
  input: CreateContentDraftInput,
  authorUserId: string,
): Promise<CmsResult<PublicContent>> {
  if (!authorUserId?.trim()) {
    return fail("FORBIDDEN", "Identitas pembuat (authorUserId) wajib terverifikasi di server.");
  }
  if (!input.title?.trim()) {
    return fail("VALIDATION_ERROR", "Judul konten (title) wajib diisi.");
  }
  if (!input.body?.trim()) {
    return fail("VALIDATION_ERROR", "Isi konten (body) wajib diisi.");
  }
  if (!CONTENT_TYPES.includes(input.type)) {
    return fail("VALIDATION_ERROR", `Tipe konten "${input.type}" tidak valid.`);
  }

  // CTA Validation
  const ctaError = validateCtaUrl(input.cta_url);
  if (ctaError) {
    return fail("VALIDATION_ERROR", ctaError);
  }

  // Date Validation
  const dateError = validateDates({
    published_at: input.published_at,
    expired_at: input.expired_at,
    event_start_at: input.event_start_at,
    event_end_at: input.event_end_at,
  });
  if (dateError) {
    return fail("VALIDATION_ERROR", dateError);
  }

  // Slug determination & collision resolution
  const rawSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  const slugValidationErr = validateSlug(rawSlug);
  if (slugValidationErr) {
    return fail("VALIDATION_ERROR", slugValidationErr);
  }

  const finalSlug = await resolveAvailableSlug(rawSlug);

  const payload = {
    slug: finalSlug,
    type: input.type,
    status: "DRAFT",
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || null,
    body: input.body.trim(),
    cover_image_url: input.cover_image_url?.trim() || null,
    category: input.category?.trim() || null,
    tags: Array.isArray(input.tags) ? input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
    published_at: input.published_at || null,
    expired_at: input.expired_at || null,
    event_start_at: input.event_start_at || null,
    event_end_at: input.event_end_at || null,
    cta_label: input.cta_label?.trim() || null,
    cta_url: input.cta_url?.trim() || null,
    cta_target: input.cta_target && CTA_TARGETS.includes(input.cta_target) ? input.cta_target : "_self",
    is_featured: Boolean(input.is_featured),
    priority: Number.isSafeInteger(input.priority) ? Number(input.priority) : 0,
    related_brand_slug: input.related_brand_slug?.trim().toLowerCase() || null,
    banner_id: input.banner_id && Number.isSafeInteger(Number(input.banner_id)) ? Number(input.banner_id) : null,
    created_by: authorUserId,
    published_by: null,
  };

  const { data, error } = await supabaseAdmin
    .from("public_contents")
    .insert([payload])
    .select()
    .single();

  if (error || !data) {
    return fail("DATABASE_ERROR", error?.message || "Gagal menyimpan draf konten.", error);
  }

  return ok(data as PublicContent);
}

/**
 * Updates an existing content item.
 */
export async function updateContent(
  id: string,
  input: UpdateContentInput,
): Promise<CmsResult<PublicContent>> {
  if (!id?.trim()) {
    return fail("VALIDATION_ERROR", "ID konten wajib disediakan.");
  }

  // Check existence
  const { data: existing, error: existErr } = await supabaseAdmin
    .from("public_contents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existErr || !existing) {
    return fail("NOT_FOUND", "Konten tidak ditemukan.");
  }

  if (input.title !== undefined && !input.title.trim()) {
    return fail("VALIDATION_ERROR", "Judul konten tidak boleh kosong.");
  }
  if (input.body !== undefined && !input.body.trim()) {
    return fail("VALIDATION_ERROR", "Isi konten tidak boleh kosong.");
  }
  if (input.type !== undefined && !CONTENT_TYPES.includes(input.type)) {
    return fail("VALIDATION_ERROR", `Tipe konten "${input.type}" tidak valid.`);
  }

  // CTA Validation
  if (input.cta_url !== undefined) {
    const ctaError = validateCtaUrl(input.cta_url);
    if (ctaError) {
      return fail("VALIDATION_ERROR", ctaError);
    }
  }

  // Date Validation (combining existing + updated)
  const dateError = validateDates({
    published_at: input.published_at !== undefined ? input.published_at : existing.published_at,
    expired_at: input.expired_at !== undefined ? input.expired_at : existing.expired_at,
    event_start_at: input.event_start_at !== undefined ? input.event_start_at : existing.event_start_at,
    event_end_at: input.event_end_at !== undefined ? input.event_end_at : existing.event_end_at,
  });
  if (dateError) {
    return fail("VALIDATION_ERROR", dateError);
  }

  // Slug resolution if changed
  let finalSlug = existing.slug;
  if (input.slug !== undefined && input.slug.trim()) {
    const candidate = slugify(input.slug);
    const slugErr = validateSlug(candidate);
    if (slugErr) return fail("VALIDATION_ERROR", slugErr);
    finalSlug = await resolveAvailableSlug(candidate, id);
  }

  const updates: Record<string, unknown> = {};

  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.slug !== undefined) updates.slug = finalSlug;
  if (input.type !== undefined) updates.type = input.type;
  if (input.body !== undefined) updates.body = input.body.trim();
  if (input.excerpt !== undefined) updates.excerpt = input.excerpt?.trim() || null;
  if (input.cover_image_url !== undefined) updates.cover_image_url = input.cover_image_url?.trim() || null;
  if (input.category !== undefined) updates.category = input.category?.trim() || null;
  if (input.tags !== undefined) {
    updates.tags = Array.isArray(input.tags)
      ? input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];
  }
  if (input.published_at !== undefined) updates.published_at = input.published_at || null;
  if (input.expired_at !== undefined) updates.expired_at = input.expired_at || null;
  if (input.event_start_at !== undefined) updates.event_start_at = input.event_start_at || null;
  if (input.event_end_at !== undefined) updates.event_end_at = input.event_end_at || null;
  if (input.cta_label !== undefined) updates.cta_label = input.cta_label?.trim() || null;
  if (input.cta_url !== undefined) updates.cta_url = input.cta_url?.trim() || null;
  if (input.cta_target !== undefined && CTA_TARGETS.includes(input.cta_target)) {
    updates.cta_target = input.cta_target;
  }
  if (input.is_featured !== undefined) updates.is_featured = Boolean(input.is_featured);
  if (input.priority !== undefined && Number.isSafeInteger(input.priority)) {
    updates.priority = Number(input.priority);
  }
  if (input.related_brand_slug !== undefined) {
    updates.related_brand_slug = input.related_brand_slug?.trim().toLowerCase() || null;
  }
  if (input.banner_id !== undefined) {
    updates.banner_id = input.banner_id && Number.isSafeInteger(Number(input.banner_id))
      ? Number(input.banner_id)
      : null;
  }

  const { data, error } = await supabaseAdmin
    .from("public_contents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return fail("DATABASE_ERROR", error?.message || "Gagal memperbarui konten.", error);
  }

  return ok(data as PublicContent);
}

/**
 * Publishes or schedules content:
 * - If published_at <= now, transitions status to PUBLISHED
 * - If published_at > now, transitions status to SCHEDULED
 * - Sets published_by from the authenticated publisher identity
 */
export async function publishContent(
  id: string,
  publisherUserId: string,
  customPublishAt?: string | null,
): Promise<CmsResult<PublicContent>> {
  if (!id?.trim()) return fail("VALIDATION_ERROR", "ID konten wajib disediakan.");
  if (!publisherUserId?.trim()) return fail("FORBIDDEN", "Identitas penerbit wajib terverifikasi.");

  const { data: existing, error: existErr } = await supabaseAdmin
    .from("public_contents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existErr || !existing) {
    return fail("NOT_FOUND", "Konten tidak ditemukan.");
  }

  const effectivePublishTime = customPublishAt || existing.published_at || new Date().toISOString();
  const pubDate = new Date(effectivePublishTime).getTime();

  if (isNaN(pubDate)) {
    return fail("VALIDATION_ERROR", "Format tanggal rilis (published_at) tidak valid.");
  }

  const now = Date.now();
  const nextStatus = pubDate <= now ? "PUBLISHED" : "SCHEDULED";

  const { data, error } = await supabaseAdmin
    .from("public_contents")
    .update({
      status: nextStatus,
      published_at: effectivePublishTime,
      published_by: publisherUserId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return fail("DATABASE_ERROR", error?.message || "Gagal mempublikasikan konten.", error);
  }

  return ok(data as PublicContent);
}

/**
 * Transitions content status to ARCHIVED.
 */
export async function archiveContent(id: string): Promise<CmsResult<PublicContent>> {
  if (!id?.trim()) return fail("VALIDATION_ERROR", "ID konten wajib disediakan.");

  const { data, error } = await supabaseAdmin
    .from("public_contents")
    .update({ status: "ARCHIVED" })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return fail("DATABASE_ERROR", error?.message || "Gagal mengarsipkan konten.", error);
  }

  return ok(data as PublicContent);
}

/**
 * Transitions content status back to DRAFT (unpublish).
 */
export async function unpublishContent(id: string): Promise<CmsResult<PublicContent>> {
  if (!id?.trim()) return fail("VALIDATION_ERROR", "ID konten wajib disediakan.");

  const { data, error } = await supabaseAdmin
    .from("public_contents")
    .update({ status: "DRAFT" })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return fail("DATABASE_ERROR", error?.message || "Gagal menarik konten ke draf.", error);
  }

  return ok(data as PublicContent);
}

/**
 * Hard delete a content item.
 * Strictly restricted to users with verified role 'admin'.
 */
export async function deleteContentAdminOnly(
  id: string,
  callerRole: string,
): Promise<CmsResult<{ success: boolean; id: string }>> {
  if (!id?.trim()) return fail("VALIDATION_ERROR", "ID konten wajib disediakan.");
  if (callerRole?.toLowerCase() !== "admin") {
    return fail("FORBIDDEN", "Operasi penghapusan permanen konten hanya dapat dilakukan oleh Admin.");
  }

  const { error } = await supabaseAdmin
    .from("public_contents")
    .delete()
    .eq("id", id);

  if (error) {
    return fail("DATABASE_ERROR", error.message || "Gagal menghapus konten.", error);
  }

  return ok({ success: true, id });
}

/**
 * Quick toggles is_featured flag.
 */
export async function setContentFeatured(
  id: string,
  isFeatured: boolean,
): Promise<CmsResult<PublicContent>> {
  const { data, error } = await supabaseAdmin
    .from("public_contents")
    .update({ is_featured: Boolean(isFeatured) })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return fail("DATABASE_ERROR", error?.message || "Gagal mengubah status featured.", error);
  }

  return ok(data as PublicContent);
}

/**
 * Quick update priority rank.
 */
export async function updateContentPriority(
  id: string,
  priority: number,
): Promise<CmsResult<PublicContent>> {
  if (!Number.isSafeInteger(priority)) {
    return fail("VALIDATION_ERROR", "Nilai priority harus berupa angka bulat.");
  }

  const { data, error } = await supabaseAdmin
    .from("public_contents")
    .update({ priority })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return fail("DATABASE_ERROR", error?.message || "Gagal mengubah nilai priority.", error);
  }

  return ok(data as PublicContent);
}

/**
 * Retrieves a single content item by ID (Management view).
 */
export async function getContentById(id: string): Promise<CmsResult<PublicContent>> {
  const { data, error } = await supabaseAdmin
    .from("public_contents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return fail("DATABASE_ERROR", error.message, error);
  }
  if (!data) {
    return fail("NOT_FOUND", "Konten tidak ditemukan.");
  }

  return ok(data as PublicContent);
}

/**
 * Retrieves a single published content item by slug (Public view).
 * Strictly enforces canonical public visibility contract:
 * status = 'PUBLISHED' AND published_at <= now() AND (expired_at IS NULL OR expired_at > now())
 */
export async function getPublicContentBySlug(
  slug: string,
  locale = "id",
): Promise<CmsResult<PublicContent>> {
  const trimmed = slug.trim().toLowerCase();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("public_contents")
    .select("*, public_content_translations(*)")
    .eq("slug", trimmed)
    .eq("status", "PUBLISHED")
    .lte("published_at", nowIso)
    .or(`expired_at.is.null,expired_at.gt.${nowIso}`)
    .maybeSingle();

  if (error) {
    return fail("DATABASE_ERROR", error.message, error);
  }
  if (!data) {
    return fail("NOT_FOUND", "Konten tidak ditemukan atau belum dipublikasikan.");
  }

  type ContentWithTranslations = PublicContent & {
    public_content_translations?: PublicContentTranslation[];
  };

  const rawItem = data as unknown as ContentWithTranslations;
  const translations = rawItem.public_content_translations;
  const baseData: PublicContent = { ...rawItem };
  delete (baseData as { public_content_translations?: unknown }).public_content_translations;

  if (locale === "en") {
    const enTrans = Array.isArray(translations)
      ? translations.find((t) => t.locale === "en")
      : null;

    if (!enTrans) {
      return fail("NOT_FOUND", "Konten dalam bahasa Inggris belum tersedia.");
    }

    return ok({
      ...baseData,
      title: enTrans.title || baseData.title,
      excerpt: enTrans.excerpt !== null ? enTrans.excerpt : baseData.excerpt,
      body: enTrans.body || baseData.body,
      cta_label: enTrans.cta_label !== null ? enTrans.cta_label : baseData.cta_label,
    });
  }

  return ok(baseData);
}

/**
 * Lists contents with filtering and pagination (Management & Public compatible).
 */
export async function listContents(
  filter: ListContentsFilter = {},
  isPublicOnly = false,
  locale = "id",
): Promise<CmsResult<{ items: PublicContent[]; total: number }>> {
  const effectiveLocale = filter.locale || locale;
  let query = supabaseAdmin
    .from("public_contents")
    .select("*, public_content_translations(*)", { count: "exact" });

  if (isPublicOnly) {
    const nowIso = new Date().toISOString();
    query = query
      .eq("status", "PUBLISHED")
      .lte("published_at", nowIso)
      .or(`expired_at.is.null,expired_at.gt.${nowIso}`);
  } else if (filter.status) {
    query = query.eq("status", filter.status);
  }

  if (filter.type) {
    query = query.eq("type", filter.type);
  } else if (filter.types && filter.types.length > 0) {
    query = query.in("type", filter.types);
  }
  if (filter.category) {
    query = query.eq("category", filter.category);
  }
  if (filter.tag) {
    query = query.contains("tags", [filter.tag.toLowerCase()]);
  }
  if (filter.is_featured !== undefined) {
    query = query.eq("is_featured", filter.is_featured);
  }
  if (filter.search?.trim()) {
    query = query.ilike("title", `%${filter.search.trim()}%`);
  }

  // Sorting with deterministic secondary ordering
  if (filter.sortBy === "priority_desc") {
    query = query
      .order("is_featured", { ascending: false })
      .order("priority", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true });
  } else if (filter.sortBy === "published_desc") {
    query = query
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true });
  } else if (filter.sortBy === "event_asc") {
    query = query
      .order("event_start_at", { ascending: true, nullsFirst: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true });
  } else {
    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
  }

  const limit = Math.min(Math.max(filter.limit || 20, 1), 100);
  const offset = Math.max(filter.offset || 0, 0);

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return fail("DATABASE_ERROR", error.message, error);
  }

  type ContentWithTranslations = PublicContent & {
    public_content_translations?: PublicContentTranslation[];
  };

  const rawItems = (data || []) as unknown as ContentWithTranslations[];

  if (effectiveLocale === "en") {
    const localizedItems: PublicContent[] = [];

    for (const raw of rawItems) {
      const translations = raw.public_content_translations;
      const enTrans = Array.isArray(translations)
        ? translations.find((t) => t.locale === "en")
        : null;

      if (isPublicOnly && !enTrans) {
        // Exclude unlocalized items from public English view
        continue;
      }

      const base: PublicContent = { ...raw };
      delete (base as { public_content_translations?: unknown }).public_content_translations;

      if (enTrans) {
        localizedItems.push({
          ...base,
          title: enTrans.title || base.title,
          excerpt: enTrans.excerpt !== null ? enTrans.excerpt : base.excerpt,
          body: enTrans.body || base.body,
          cta_label: enTrans.cta_label !== null ? enTrans.cta_label : base.cta_label,
        });
      } else {
        localizedItems.push(base);
      }
    }

    return ok({
      items: localizedItems,
      total: isPublicOnly ? localizedItems.length : (count || 0),
    });
  }

  const sanitizedItems: PublicContent[] = rawItems.map((raw) => {
    const base: PublicContent = { ...raw };
    delete (base as { public_content_translations?: unknown }).public_content_translations;
    return base;
  });

  return ok({
    items: sanitizedItems,
    total: count || 0,
  });
}

// ----------------------------------------------------------------------------
// 7. SECTION SERVICE MUTATIONS & QUERIES
// ----------------------------------------------------------------------------

export async function listSectionsByPage(
  page: "PROMO" | "NEWS" | "HOME",
  activeOnly = false,
): Promise<CmsResult<ContentSection[]>> {
  let query = supabaseAdmin
    .from("content_sections")
    .select("*")
    .eq("page", page)
    .order("order_position", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    return fail("DATABASE_ERROR", error.message, error);
  }

  return ok((data || []) as ContentSection[]);
}

export async function createSection(
  input: CreateSectionInput,
): Promise<CmsResult<ContentSection>> {
  if (!CONTENT_SECTION_PAGES.includes(input.page)) {
    return fail("VALIDATION_ERROR", `Halaman tujuan "${input.page}" tidak valid.`);
  }
  if (!input.section_key?.trim()) {
    return fail("VALIDATION_ERROR", "Section key wajib diisi.");
  }
  if (!input.title?.trim()) {
    return fail("VALIDATION_ERROR", "Judul section wajib diisi.");
  }

  const normalizedKey = slugify(input.section_key);

  // Server-enforce max 6 active sections per page to prevent unbounded queries
  if (input.is_active !== false) {
    const { count: activeCount } = await supabaseAdmin
      .from("content_sections")
      .select("*", { count: "exact", head: true })
      .eq("page", input.page)
      .eq("is_active", true);

    if (activeCount !== null && activeCount >= 6) {
      return fail(
        "CONFLICT",
        `Maksimal 6 section aktif yang diizinkan untuk halaman ${input.page}. Nonaktifkan section lain terlebih dahulu.`
      );
    }
  }

  // Check composite uniqueness (page + section_key)
  const { data: duplicate } = await supabaseAdmin
    .from("content_sections")
    .select("id")
    .eq("page", input.page)
    .eq("section_key", normalizedKey)
    .maybeSingle();

  if (duplicate) {
    return fail("CONFLICT", `Section key "${normalizedKey}" sudah digunakan pada halaman ${input.page}.`);
  }

  const payload = {
    page: input.page,
    section_key: normalizedKey,
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    filter_type: input.filter_type && CONTENT_TYPES.includes(input.filter_type) ? input.filter_type : null,
    filter_category: input.filter_category?.trim() || null,
    filter_tag: input.filter_tag?.trim().toLowerCase() || null,
    sort_by: input.sort_by && CONTENT_SORTS.includes(input.sort_by) ? input.sort_by : "priority_desc",
    display_limit: input.display_limit ? Math.min(Math.max(input.display_limit, 1), 50) : 6,
    layout: input.layout && CONTENT_LAYOUTS.includes(input.layout) ? input.layout : "grid-3",
    is_active: input.is_active !== false,
    order_position: Number.isSafeInteger(input.order_position) ? Math.max(0, Number(input.order_position)) : 0,
  };

  const { data, error } = await supabaseAdmin
    .from("content_sections")
    .insert([payload])
    .select()
    .single();

  if (error || !data) {
    return fail("DATABASE_ERROR", error?.message || "Gagal membuat section baru.", error);
  }

  return ok(data as ContentSection);
}

export async function updateSection(
  id: string,
  input: UpdateSectionInput,
): Promise<CmsResult<ContentSection>> {
  if (!id?.trim()) return fail("VALIDATION_ERROR", "ID section wajib disediakan.");

  const updates: Record<string, unknown> = {};

  if (input.title !== undefined) {
    if (!input.title.trim()) return fail("VALIDATION_ERROR", "Judul section tidak boleh kosong.");
    updates.title = input.title.trim();
  }
  if (input.subtitle !== undefined) updates.subtitle = input.subtitle?.trim() || null;
  if (input.filter_type !== undefined) {
    updates.filter_type = input.filter_type && CONTENT_TYPES.includes(input.filter_type) ? input.filter_type : null;
  }
  if (input.filter_category !== undefined) updates.filter_category = input.filter_category?.trim() || null;
  if (input.filter_tag !== undefined) updates.filter_tag = input.filter_tag?.trim().toLowerCase() || null;
  if (input.sort_by !== undefined && CONTENT_SORTS.includes(input.sort_by)) updates.sort_by = input.sort_by;
  if (input.display_limit !== undefined) {
    updates.display_limit = Math.min(Math.max(input.display_limit, 1), 50);
  }
  if (input.layout !== undefined && CONTENT_LAYOUTS.includes(input.layout)) updates.layout = input.layout;
  if (input.is_active !== undefined) updates.is_active = Boolean(input.is_active);
  if (input.order_position !== undefined && Number.isSafeInteger(input.order_position)) {
    updates.order_position = Math.max(0, Number(input.order_position));
  }

  // Server-enforce max 6 active sections when activating a section
  if (input.is_active === true) {
    const { data: currentSec } = await supabaseAdmin
      .from("content_sections")
      .select("page, is_active")
      .eq("id", id)
      .single();

    if (currentSec && !currentSec.is_active) {
      const { count: activeCount } = await supabaseAdmin
        .from("content_sections")
        .select("*", { count: "exact", head: true })
        .eq("page", currentSec.page)
        .eq("is_active", true);

      if (activeCount !== null && activeCount >= 6) {
        return fail(
          "CONFLICT",
          `Maksimal 6 section aktif yang diizinkan untuk halaman ${currentSec.page}. Nonaktifkan section lain terlebih dahulu.`
        );
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from("content_sections")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return fail("DATABASE_ERROR", error?.message || "Gagal memperbarui section.", error);
  }

  return ok(data as ContentSection);
}

export async function deleteSection(id: string): Promise<CmsResult<{ success: boolean; id: string }>> {
  if (!id?.trim()) return fail("VALIDATION_ERROR", "ID section wajib disediakan.");

  const { error } = await supabaseAdmin
    .from("content_sections")
    .delete()
    .eq("id", id);

  if (error) {
    return fail("DATABASE_ERROR", error.message || "Gagal menghapus section.", error);
  }

  return ok({ success: true, id });
}

/**
 * Public targeted section content resolver.
 * Fetches exactly the top N matching eligible items directly from DB.
 * Enforces canonical public eligibility:
 * status = 'PUBLISHED' AND published_at <= now() AND (expired_at IS NULL OR expired_at > now())
 */
export async function getSectionContents(
  section: ContentSection,
  locale = "id",
): Promise<PublicContent[]> {
  const filter: ListContentsFilter = {
    type: section.filter_type || undefined,
    category: section.filter_category || undefined,
    tag: section.filter_tag || undefined,
    sortBy: section.sort_by,
    limit: Math.min(Math.max(section.display_limit, 1), 50),
    locale,
  };

  const res = await listContents(filter, true, locale); // true = canonical public eligibility
  return res.isError ? [] : res.data.items;
}

/**
 * Resolves multiple content sections with query deduplication.
 * If multiple sections share the exact same filter/sort/limit criteria,
 * exactly one DB query is executed and reused across them.
 */
export async function resolveSectionContents(
  sections: ContentSection[],
  locale = "id",
): Promise<Array<{ section: ContentSection; items: PublicContent[] }>> {
  if (sections.length === 0) return [];

  // Map unique query key -> Promise<PublicContent[]>
  const queryPromises = new Map<string, Promise<PublicContent[]>>();

  for (const sec of sections) {
    const key = [
      sec.filter_type || "*",
      sec.filter_category?.toLowerCase().trim() || "*",
      sec.filter_tag?.toLowerCase().trim() || "*",
      sec.sort_by,
      Math.min(Math.max(sec.display_limit, 1), 50),
      locale,
    ].join(":");

    if (!queryPromises.has(key)) {
      queryPromises.set(key, getSectionContents(sec, locale));
    }
  }

  // Resolve all unique queries concurrently
  const resultsMap = new Map<string, PublicContent[]>();
  const resolved = await Promise.all(
    Array.from(queryPromises.entries()).map(async ([key, promise]) => {
      const items = await promise;
      return [key, items] as const;
    })
  );

  for (const [key, items] of resolved) {
    resultsMap.set(key, items);
  }

  // Assemble results matching original section order
  const output: Array<{ section: ContentSection; items: PublicContent[] }> = [];
  for (const sec of sections) {
    const key = [
      sec.filter_type || "*",
      sec.filter_category?.toLowerCase().trim() || "*",
      sec.filter_tag?.toLowerCase().trim() || "*",
      sec.sort_by,
      Math.min(Math.max(sec.display_limit, 1), 50),
      locale,
    ].join(":");

    const items = resultsMap.get(key) || [];
    if (items.length > 0) {
      output.push({ section: sec, items });
    }
  }

  return output;
}

export async function reorderSections(
  orderMapping: { id: string; order_position: number }[],
): Promise<CmsResult<boolean>> {
  if (!Array.isArray(orderMapping) || orderMapping.length === 0) {
    return fail("VALIDATION_ERROR", "Daftar urutan section wajib disediakan.");
  }

  for (const item of orderMapping) {
    if (!item.id || !Number.isSafeInteger(item.order_position)) continue;
    await supabaseAdmin
      .from("content_sections")
      .update({ order_position: Math.max(0, item.order_position) })
      .eq("id", item.id);
  }

  return ok(true);
}
