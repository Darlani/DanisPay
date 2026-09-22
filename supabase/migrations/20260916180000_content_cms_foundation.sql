-- ============================================================================
-- Migration: 20260916180000_content_cms_foundation.sql
-- Description: Phase 1 Data Foundation for Content CMS (public_contents + content_sections)
-- Author: DaPay Engineering Team
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE: public.public_contents
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  title text NOT NULL,
  excerpt text NULL,
  body text NOT NULL,
  cover_image_url text NULL,
  category text NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  published_at timestamp with time zone NULL,
  expired_at timestamp with time zone NULL,
  event_start_at timestamp with time zone NULL,
  event_end_at timestamp with time zone NULL,
  cta_label text NULL,
  cta_url text NULL,
  cta_target text NOT NULL DEFAULT '_self',
  is_featured boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  related_brand_slug text NULL,
  banner_id bigint NULL,
  created_by uuid NOT NULL,
  published_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

  -- Structural & Semantic Constraints
  CONSTRAINT chk_public_contents_slug_format CHECK (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) >= 2 AND length(slug) <= 120
  ),
  CONSTRAINT chk_public_contents_type CHECK (
    type IN ('NEWS', 'PROMO', 'ANNOUNCEMENT', 'MAINTENANCE')
  ),
  CONSTRAINT chk_public_contents_status CHECK (
    status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'ARCHIVED')
  ),
  CONSTRAINT chk_public_contents_title_not_empty CHECK (
    length(btrim(title)) > 0 AND length(title) <= 200
  ),
  CONSTRAINT chk_public_contents_body_not_empty CHECK (
    length(btrim(body)) > 0
  ),
  CONSTRAINT chk_public_contents_cta_target CHECK (
    cta_target IN ('_self', '_blank')
  ),
  CONSTRAINT chk_public_contents_expiry_order CHECK (
    expired_at IS NULL OR published_at IS NULL OR expired_at >= published_at
  ),
  CONSTRAINT chk_public_contents_event_order CHECK (
    event_end_at IS NULL OR event_start_at IS NULL OR event_end_at >= event_start_at
  ),

  -- Foreign Keys
  CONSTRAINT fk_public_contents_created_by FOREIGN KEY (created_by)
    REFERENCES public.profiles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_public_contents_published_by FOREIGN KEY (published_by)
    REFERENCES public.profiles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_public_contents_banner_id FOREIGN KEY (banner_id)
    REFERENCES public.banners (id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES: public.public_contents
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_public_contents_slug
  ON public.public_contents (slug);

-- Primary public visibility composite index
CREATE INDEX IF NOT EXISTS idx_public_contents_visibility
  ON public.public_contents (status, published_at, expired_at)
  WHERE status = 'PUBLISHED';

-- Filtering by Macro Type & Sorting
CREATE INDEX IF NOT EXISTS idx_public_contents_type_published
  ON public.public_contents (type, published_at DESC)
  WHERE status = 'PUBLISHED';

-- Featured and Priority sorting index
CREATE INDEX IF NOT EXISTS idx_public_contents_featured_priority
  ON public.public_contents (is_featured, priority DESC, published_at DESC)
  WHERE status = 'PUBLISHED';

-- Category lookup index
CREATE INDEX IF NOT EXISTS idx_public_contents_category
  ON public.public_contents (category)
  WHERE category IS NOT NULL;

-- Tag search using GIN index
CREATE INDEX IF NOT EXISTS idx_public_contents_tags
  ON public.public_contents USING GIN (tags);

-- Foreign Key lookups
CREATE INDEX IF NOT EXISTS idx_public_contents_created_by
  ON public.public_contents (created_by);

CREATE INDEX IF NOT EXISTS idx_public_contents_banner_id
  ON public.public_contents (banner_id)
  WHERE banner_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. TRIGGER: public.public_contents updated_at
-- Attaches existing production function public.update_updated_at_column()
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_public_contents_updated_at ON public.public_contents;
CREATE TRIGGER trg_public_contents_updated_at
  BEFORE UPDATE ON public.public_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. TABLE: public.content_sections
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section_key text NOT NULL,
  title text NOT NULL,
  subtitle text NULL,
  filter_type text NULL,
  filter_category text NULL,
  filter_tag text NULL,
  sort_by text NOT NULL DEFAULT 'priority_desc',
  display_limit integer NOT NULL DEFAULT 6,
  layout text NOT NULL DEFAULT 'grid-3',
  is_active boolean NOT NULL DEFAULT true,
  order_position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

  -- Structural Constraints
  CONSTRAINT chk_content_sections_page CHECK (
    page IN ('PROMO', 'NEWS', 'HOME')
  ),
  CONSTRAINT chk_content_sections_filter_type CHECK (
    filter_type IS NULL OR filter_type IN ('NEWS', 'PROMO', 'ANNOUNCEMENT', 'MAINTENANCE')
  ),
  CONSTRAINT chk_content_sections_sort_by CHECK (
    sort_by IN ('priority_desc', 'published_desc', 'event_asc')
  ),
  CONSTRAINT chk_content_sections_layout CHECK (
    layout IN ('grid-3', 'grid-2', 'list', 'carousel')
  ),
  CONSTRAINT chk_content_sections_limit_range CHECK (
    display_limit >= 1 AND display_limit <= 50
  ),
  CONSTRAINT chk_content_sections_order_position CHECK (
    order_position >= 0
  ),
  CONSTRAINT chk_content_sections_title_not_empty CHECK (
    length(btrim(title)) > 0 AND length(title) <= 120
  )
);

-- ----------------------------------------------------------------------------
-- 5. INDEXES: public.content_sections
-- ----------------------------------------------------------------------------
-- Composite uniqueness: section_key is unique per target page
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_content_sections_page_key
  ON public.content_sections (page, section_key);

-- Public layout order query index
CREATE INDEX IF NOT EXISTS idx_content_sections_page_active_order
  ON public.content_sections (page, order_position ASC)
  WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- 6. TRIGGER: public.content_sections updated_at
-- Attaches existing production function public.update_updated_at_column()
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_content_sections_updated_at ON public.content_sections;
CREATE TRIGGER trg_content_sections_updated_at
  BEFORE UPDATE ON public.content_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY & POLICIES
-- ----------------------------------------------------------------------------
-- Enable RLS
ALTER TABLE public.public_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sections ENABLE ROW LEVEL SECURITY;

-- Revoke default broad permissions, grant strictly
REVOKE ALL ON TABLE public.public_contents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.content_sections FROM PUBLIC, anon, authenticated;

-- Public & Anon can only SELECT eligible records
GRANT SELECT ON TABLE public.public_contents TO anon, authenticated;
GRANT SELECT ON TABLE public.content_sections TO anon, authenticated;

-- Service role has full management capabilities (used by serverAuth API routes)
GRANT ALL ON TABLE public.public_contents TO service_role;
GRANT ALL ON TABLE public.content_sections TO service_role;

-- Policy 1: Public Can Read Published & Active Contents
DROP POLICY IF EXISTS "Public can view published active contents" ON public.public_contents;
CREATE POLICY "Public can view published active contents"
  ON public.public_contents
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'PUBLISHED'
    AND published_at IS NOT NULL
    AND published_at <= now()
    AND (expired_at IS NULL OR expired_at > now())
  );

-- Policy 2: Public Can View Active Content Sections
DROP POLICY IF EXISTS "Public can view active content sections" ON public.content_sections;
CREATE POLICY "Public can view active content sections"
  ON public.content_sections
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
  );

-- Policy 3: Management Persona (Admin/Manager) can read all public_contents
DROP POLICY IF EXISTS "Management can view all contents" ON public.public_contents;
CREATE POLICY "Management can view all contents"
  ON public.public_contents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND lower(profiles.role) IN ('admin', 'manager')
    )
  );

-- Policy 4: Management Persona (Admin/Manager) can view all content sections
DROP POLICY IF EXISTS "Management can view all content sections" ON public.content_sections;
CREATE POLICY "Management can view all content sections"
  ON public.content_sections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND lower(profiles.role) IN ('admin', 'manager')
    )
  );
