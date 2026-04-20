-- ─────────────────────────────────────────────────────────────────────────────
-- Guests + Public Guest Form Slugs
-- Adds a portable guests table, public guest-form business-unit slug support,
-- and storage rules for guest identification image uploads.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.business_units
  ADD COLUMN IF NOT EXISTS public_guest_form_slug TEXT;

UPDATE public.business_units
SET public_guest_form_slug = lower(
  regexp_replace(
    concat_ws('-', nullif(trim(code), ''), nullif(trim(name), '')),
    '[^a-zA-Z0-9]+',
    '-',
    'g'
  )
)
WHERE public_guest_form_slug IS NULL;

UPDATE public.business_units
SET public_guest_form_slug = trim(both '-' from public_guest_form_slug)
WHERE public_guest_form_slug IS NOT NULL;

WITH ranked_slugs AS (
  SELECT
    id,
    public_guest_form_slug,
    row_number() OVER (PARTITION BY public_guest_form_slug ORDER BY created_at, id) AS slug_rank
  FROM public.business_units
)
UPDATE public.business_units bu
SET public_guest_form_slug = CASE
  WHEN ranked_slugs.slug_rank = 1 THEN ranked_slugs.public_guest_form_slug
  ELSE concat(ranked_slugs.public_guest_form_slug, '-', substring(bu.id::text from 1 for 8))
END
FROM ranked_slugs
WHERE bu.id = ranked_slugs.id;

ALTER TABLE public.business_units
  ALTER COLUMN public_guest_form_slug SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.business_units
    ADD CONSTRAINT business_units_public_guest_form_slug_key UNIQUE (public_guest_form_slug);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.business_units
    ADD CONSTRAINT business_units_public_guest_form_slug_format
    CHECK (public_guest_form_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.guests (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id             UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  user_id                      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name                   TEXT NOT NULL,
  last_name                    TEXT NOT NULL,
  phone_number                 TEXT NOT NULL,
  email                        TEXT,
  birthday                     DATE,
  gender                       TEXT NOT NULL CHECK (gender IN ('female', 'male', 'non-binary', 'prefer-not-to-say')),
  nationality                  TEXT NOT NULL,
  identification_type          TEXT CHECK (identification_type IN ('passport', 'drivers-license', 'national-id', 'voters-card', 'residence-permit', 'other')),
  identification_number        TEXT,
  identification_image_path    TEXT,
  emergency_contact            TEXT NOT NULL,
  notes                        TEXT,
  is_archived                  BOOLEAN NOT NULL DEFAULT FALSE,
  metadata                     JSONB NOT NULL DEFAULT '{}',
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_guests
    BEFORE UPDATE ON public.guests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "guests_member_select" ON public.guests;
CREATE POLICY "guests_member_select"
  ON public.guests FOR SELECT
  USING (public.is_business_unit_member(business_unit_id));

DROP POLICY IF EXISTS "guests_owner_insert" ON public.guests;
CREATE POLICY "guests_owner_insert"
  ON public.guests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_manage_business_unit(business_unit_id)
  );

DROP POLICY IF EXISTS "guests_owner_update" ON public.guests;
CREATE POLICY "guests_owner_update"
  ON public.guests FOR UPDATE
  USING (public.can_manage_business_unit(business_unit_id))
  WITH CHECK (public.can_manage_business_unit(business_unit_id));

DROP POLICY IF EXISTS "guests_owner_delete" ON public.guests;
CREATE POLICY "guests_owner_delete"
  ON public.guests FOR DELETE
  USING (public.can_manage_business_unit(business_unit_id));

CREATE INDEX IF NOT EXISTS idx_guests_business_unit_id
  ON public.guests (business_unit_id);

CREATE INDEX IF NOT EXISTS idx_guests_lookup
  ON public.guests (business_unit_id, is_archived, last_name, first_name);

CREATE INDEX IF NOT EXISTS idx_guests_email
  ON public.guests (lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guests_phone_number
  ON public.guests (phone_number);

CREATE OR REPLACE FUNCTION public.get_public_guest_form_business_unit(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  category TEXT,
  public_guest_form_slug TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bu.id, bu.name, bu.code, bu.category, bu.public_guest_form_slug
  FROM public.business_units bu
  WHERE bu.public_guest_form_slug = lower(trim(p_slug))
    AND bu.is_archived = false
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_guest(
  p_slug TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone_number TEXT,
  p_email TEXT DEFAULT NULL,
  p_birthday DATE DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_nationality TEXT DEFAULT NULL,
  p_identification_type TEXT DEFAULT NULL,
  p_identification_number TEXT DEFAULT NULL,
  p_identification_image_path TEXT DEFAULT NULL,
  p_emergency_contact TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.guests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_unit public.business_units%ROWTYPE;
  v_guest public.guests%ROWTYPE;
BEGIN
  SELECT * INTO v_business_unit
  FROM public.business_units bu
  WHERE bu.public_guest_form_slug = lower(trim(p_slug))
    AND bu.is_archived = false
  LIMIT 1;

  IF v_business_unit.id IS NULL THEN
    RAISE EXCEPTION 'Guest form is not available for this business unit';
  END IF;

  INSERT INTO public.guests (
    business_unit_id,
    user_id,
    first_name,
    last_name,
    phone_number,
    email,
    birthday,
    gender,
    nationality,
    identification_type,
    identification_number,
    identification_image_path,
    emergency_contact,
    notes,
    metadata
  ) VALUES (
    v_business_unit.id,
    v_business_unit.user_id,
    trim(p_first_name),
    trim(p_last_name),
    trim(p_phone_number),
    nullif(trim(p_email), ''),
    p_birthday,
    p_gender,
    trim(p_nationality),
    p_identification_type,
    nullif(trim(p_identification_number), ''),
    nullif(trim(p_identification_image_path), ''),
    trim(p_emergency_contact),
    nullif(trim(p_notes), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_guest;

  RETURN v_guest;
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guest-identifications',
  'guest-identifications',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY "guest_identifications_anon_insert"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (
      bucket_id = 'guest-identifications'
      AND array_length(storage.foldername(name), 1) >= 2
      AND EXISTS (
        SELECT 1
        FROM public.business_units bu
        WHERE bu.id::text = (storage.foldername(name))[1]
          AND bu.public_guest_form_slug = (storage.foldername(name))[2]
          AND bu.is_archived = false
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "guest_identifications_member_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'guest-identifications'
      AND public.is_business_unit_member(((storage.foldername(name))[1])::uuid)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "guest_identifications_manager_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'guest-identifications'
      AND public.can_manage_business_unit(((storage.foldername(name))[1])::uuid)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "guest_identifications_manager_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'guest-identifications'
      AND public.can_manage_business_unit(((storage.foldername(name))[1])::uuid)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;