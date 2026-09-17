import { supabase } from "@/utils/supabaseClient";
import type {
  ContentSection,
  ContentSectionPage,
  CreateContentDraftInput,
  CreateSectionInput,
  PublicContent,
  UpdateContentInput,
  UpdateSectionInput,
} from "@/lib/cms/types";

export type ContentListQuery = {
  type?: string;
  status?: string;
  category?: string;
  tag?: string;
  search?: string;
  is_featured?: string;
  sort_by?: string;
  page?: number;
  limit?: number;
};

export type ContentListResponse = {
  items: PublicContent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error?: string };

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function cmsFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers || {});

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...options, headers, cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload && "error" in payload && payload.error ? payload.error : "CMS request failed.");
  }

  return payload.data;
}

function queryString(params: ContentListQuery) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

export function listContents(params: ContentListQuery) {
  const qs = queryString(params);
  return cmsFetch<ContentListResponse>(`/api/admin/content${qs ? `?${qs}` : ""}`);
}

export function createContent(input: CreateContentDraftInput) {
  return cmsFetch<PublicContent>("/api/admin/content", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateContent(id: string, input: UpdateContentInput) {
  return cmsFetch<PublicContent>(`/api/admin/content/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function publishContent(id: string, publishedAt?: string | null) {
  return cmsFetch<PublicContent>(`/api/admin/content/${encodeURIComponent(id)}/publish`, {
    method: "POST",
    body: JSON.stringify(publishedAt ? { published_at: publishedAt } : {}),
  });
}

export function archiveContent(id: string) {
  return cmsFetch<PublicContent>(`/api/admin/content/${encodeURIComponent(id)}/archive`, { method: "POST" });
}

export function unpublishContent(id: string) {
  return cmsFetch<PublicContent>(`/api/admin/content/${encodeURIComponent(id)}/unpublish`, { method: "POST" });
}

export function setContentFeatured(id: string, isFeatured: boolean) {
  return cmsFetch<PublicContent>(`/api/admin/content/${encodeURIComponent(id)}/feature`, {
    method: "POST",
    body: JSON.stringify({ is_featured: isFeatured }),
  });
}

export function updateContentPriority(id: string, priority: number) {
  return cmsFetch<PublicContent>(`/api/admin/content/${encodeURIComponent(id)}/priority`, {
    method: "POST",
    body: JSON.stringify({ priority }),
  });
}

export function deleteContent(id: string) {
  return cmsFetch<{ success: boolean; id: string }>(`/api/admin/content/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function listSections(page: ContentSectionPage) {
  return cmsFetch<ContentSection[]>(`/api/admin/content/sections?page=${page}`);
}

export function createSection(input: CreateSectionInput) {
  return cmsFetch<ContentSection>("/api/admin/content/sections", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSection(id: string, input: UpdateSectionInput) {
  return cmsFetch<ContentSection>(`/api/admin/content/sections/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteSection(id: string) {
  return cmsFetch<{ success: boolean; id: string }>(`/api/admin/content/sections/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function reorderSections(orders: Array<{ id: string; order_position: number }>) {
  return cmsFetch<{ success: boolean; updated: number }>("/api/admin/content/sections/reorder", {
    method: "POST",
    body: JSON.stringify({ orders }),
  });
}
