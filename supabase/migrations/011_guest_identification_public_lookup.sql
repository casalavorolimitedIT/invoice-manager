-- ─────────────────────────────────────────────────────────────────────────────
-- Guest Identification Public Lookup Fix
-- Uses a SECURITY DEFINER helper for anon storage insert validation so the
-- policy does not depend on direct reads against RLS-protected business_units.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_upload_guest_identification(
  p_business_unit_id TEXT,
  p_public_slug TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_units bu
    WHERE bu.id::text = trim(p_business_unit_id)
      AND bu.public_guest_form_slug = trim(lower(p_public_slug))
      AND bu.is_archived = false
  );
$$;

DROP POLICY IF EXISTS "guest_identifications_anon_insert" ON storage.objects;

DO $$ BEGIN
  CREATE POLICY "guest_identifications_anon_insert"
    ON storage.objects FOR INSERT
    TO anon
    WITH CHECK (
      bucket_id = 'guest-identifications'
      AND array_length(storage.foldername(name), 1) >= 2
      AND public.can_upload_guest_identification(
        (storage.foldername(name))[1],
        (storage.foldername(name))[2]
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;