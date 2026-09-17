// ============================================================================
// File: lib/cms/types.ts
// Description: Canonical TypeScript types for DaPay Content CMS
// Phase: 2A Data Foundation & Service Layer
// ============================================================================

/**
 * Fundamental Content Types
 * Canonical values matching DB CHECK constraint (chk_public_contents_type)
 */
export const CONTENT_TYPES = ["NEWS", "PROMO", "ANNOUNCEMENT", "MAINTENANCE"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/**
 * Content Lifecycle Statuses
 * Canonical values matching DB CHECK constraint (chk_public_contents_status)
 */
export const CONTENT_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/**
 * Target pages supported by Content Sections
 * Canonical values matching DB CHECK constraint (chk_content_sections_page)
 */
export const CONTENT_SECTION_PAGES = ["PROMO", "NEWS", "HOME"] as const;
export type ContentSectionPage = (typeof CONTENT_SECTION_PAGES)[number];

/**
 * Section sorting strategies
 * Canonical values matching DB CHECK constraint (chk_content_sections_sort_by)
 */
export const CONTENT_SORTS = ["priority_desc", "published_desc", "event_asc"] as const;
export type ContentSort = (typeof CONTENT_SORTS)[number];

/**
 * Section layout presentation modes
 * Canonical values matching DB CHECK constraint (chk_content_sections_layout)
 */
export const CONTENT_LAYOUTS = ["grid-3", "grid-2", "list", "carousel"] as const;
export type ContentLayout = (typeof CONTENT_LAYOUTS)[number];

/**
 * Call-To-Action navigation targets
 */
export const CTA_TARGETS = ["_self", "_blank"] as const;
export type CtaTarget = (typeof CTA_TARGETS)[number];

/**
 * Controlled category vocabulary for DaPay Content
 */
export const CONTENT_CATEGORIES = [
  "Game",
  "PPOB",
  "Voucher",
  "Entertainment",
  "Sistem",
  "Keamanan",
  "Event",
  "Afiliasi",
] as const;
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number] | (string & {});

/**
 * Full Database Entity: public.public_contents
 */
export interface PublicContent {
  id: string;
  slug: string;
  type: ContentType;
  status: ContentStatus;
  title: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  category: string | null;
  tags: string[];
  published_at: string | null;
  expired_at: string | null;
  event_start_at: string | null;
  event_end_at: string | null;
  cta_label: string | null;
  cta_url: string | null;
  cta_target: CtaTarget;
  is_featured: boolean;
  priority: number;
  related_brand_slug: string | null;
  banner_id: number | null;
  created_by: string;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Full Database Entity: public.content_sections
 */
export interface ContentSection {
  id: string;
  page: ContentSectionPage;
  section_key: string;
  title: string;
  subtitle: string | null;
  filter_type: ContentType | null;
  filter_category: string | null;
  filter_tag: string | null;
  sort_by: ContentSort;
  display_limit: number;
  layout: ContentLayout;
  is_active: boolean;
  order_position: number;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// INPUT DTOs
// ----------------------------------------------------------------------------

export interface CreateContentDraftInput {
  title: string;
  slug?: string;
  type: ContentType;
  body: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  category?: string | null;
  tags?: string[];
  published_at?: string | null;
  expired_at?: string | null;
  event_start_at?: string | null;
  event_end_at?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  cta_target?: CtaTarget;
  is_featured?: boolean;
  priority?: number;
  related_brand_slug?: string | null;
  banner_id?: number | null;
}

export interface UpdateContentInput {
  title?: string;
  slug?: string;
  type?: ContentType;
  body?: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  category?: string | null;
  tags?: string[];
  published_at?: string | null;
  expired_at?: string | null;
  event_start_at?: string | null;
  event_end_at?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  cta_target?: CtaTarget;
  is_featured?: boolean;
  priority?: number;
  related_brand_slug?: string | null;
  banner_id?: number | null;
}

export interface ListContentsFilter {
  type?: ContentType;
  types?: ContentType[];
  status?: ContentStatus;
  category?: string;
  tag?: string;
  is_featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: "priority_desc" | "published_desc" | "event_asc" | "created_desc";
}

export interface CreateSectionInput {
  page: ContentSectionPage;
  section_key: string;
  title: string;
  subtitle?: string | null;
  filter_type?: ContentType | null;
  filter_category?: string | null;
  filter_tag?: string | null;
  sort_by?: ContentSort;
  display_limit?: number;
  layout?: ContentLayout;
  is_active?: boolean;
  order_position?: number;
}

export interface UpdateSectionInput {
  title?: string;
  subtitle?: string | null;
  filter_type?: ContentType | null;
  filter_category?: string | null;
  filter_tag?: string | null;
  sort_by?: ContentSort;
  display_limit?: number;
  layout?: ContentLayout;
  is_active?: boolean;
  order_position?: number;
}

// ----------------------------------------------------------------------------
// SERVICE RESULTS & ERROR MODEL
// ----------------------------------------------------------------------------

export type CmsErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "DATABASE_ERROR";

export interface CmsServiceError {
  isError: true;
  code: CmsErrorCode;
  message: string;
  details?: unknown;
}

export interface CmsServiceSuccess<T> {
  isError: false;
  data: T;
}

export type CmsResult<T> = CmsServiceSuccess<T> | CmsServiceError;
