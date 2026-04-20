-- ─────────────────────────────────────────────────────────────────────────────
-- Guest Identification Upload Policy Fix
-- Ensures anonymous walk-in guest uploads match Supabase's anon role explicitly.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "guest_identifications_anon_insert" ON storage.objects;

DO $$ BEGIN
  CREATE POLICY "guest_identifications_anon_insert"
    ON storage.objects FOR INSERT
    TO anon
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