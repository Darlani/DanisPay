-- ============================================================================
-- Migration: 20260919190000_public_content_translations.sql
-- Description: Public Content Translations table and English seed for active news
-- Phase: 11G.15 Public News / Promo i18n
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.public_content_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.public_contents(id) ON DELETE CASCADE,
  locale text NOT NULL,
  title text NOT NULL,
  excerpt text NULL,
  body text NOT NULL,
  cta_label text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT uq_public_content_translations_content_locale UNIQUE (content_id, locale),
  CONSTRAINT chk_public_content_translations_locale CHECK (locale IN ('id', 'en')),
  CONSTRAINT chk_public_content_translations_title_not_empty CHECK (length(btrim(title)) > 0),
  CONSTRAINT chk_public_content_translations_body_not_empty CHECK (length(btrim(body)) > 0)
);

-- Index for fast lookup by content_id and locale
CREATE INDEX IF NOT EXISTS idx_public_content_translations_lookup 
  ON public.public_content_translations (content_id, locale);

-- Attach standard updated_at trigger
DROP TRIGGER IF EXISTS trg_public_content_translations_updated_at ON public.public_content_translations;
CREATE TRIGGER trg_public_content_translations_updated_at
  BEFORE UPDATE ON public.public_content_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.public_content_translations ENABLE ROW LEVEL SECURITY;

-- Grants
REVOKE ALL ON TABLE public.public_content_translations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_content_translations TO anon, authenticated;
GRANT ALL ON TABLE public.public_content_translations TO service_role;

-- Policy 1: Public & Anon can view translations for published and non-expired content
DROP POLICY IF EXISTS "Public can view translations of published contents" ON public.public_content_translations;
CREATE POLICY "Public can view translations of published contents"
  ON public.public_content_translations
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.public_contents
      WHERE public_contents.id = public_content_translations.content_id
        AND public_contents.status = 'PUBLISHED'
        AND public_contents.published_at IS NOT NULL
        AND public_contents.published_at <= now()
        AND (public_contents.expired_at IS NULL OR public_contents.expired_at > now())
    )
  );

-- Policy 2: Management persona can view all content translations
DROP POLICY IF EXISTS "Management can view all content translations" ON public.public_content_translations;
CREATE POLICY "Management can view all content translations"
  ON public.public_content_translations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND lower(profiles.role) IN ('admin', 'manager')
    )
  );

-- Seed English translation for the published news article (if it exists)
INSERT INTO public.public_content_translations (
  content_id,
  locale,
  title,
  excerpt,
  body,
  cta_label
)
SELECT
  id,
  'en',
  'DaPay Official Information Center Updates for Seamless Transactions',
  'DaPay introduces an integrated official information channel to transparently deliver news, system updates, and operational announcements to all users.',
  '## DaPay Service Transparency Commitment

In line with our commitment to delivering a safe and reliable digital transaction experience, DaPay has released an update to our integrated official communication channel. This feature is designed to make it easy for you to monitor all system developments in one structured place.

Through this official channel, users can receive accurate information directly from management regarding scheduled routine maintenance, new feature releases, and account security guidelines.

## Information You Can Access

This information channel provides various service update categories:

- **System Updates**: Schedule of latest feature releases and transaction performance enhancements.
- **Operational Notices**: Routine maintenance schedule so your transaction activities remain well-planned.
- **Account Education & Security**: Official information on credential confidentiality and DaPay account security tips.

We encourage all users to always refer to this official channel to verify the authenticity of any announcement issued on behalf of DaPay.',
  'Read More'
FROM public.public_contents
WHERE slug = 'pembaruan-pusat-informasi-resmi-dapay'
ON CONFLICT (content_id, locale) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  body = EXCLUDED.body,
  cta_label = EXCLUDED.cta_label,
  updated_at = now();
