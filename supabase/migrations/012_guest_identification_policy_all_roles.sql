-- ─────────────────────────────────────────────────────────────────────────────
-- Guest Identification Upload Policy – Cover Both anon and authenticated
--
-- The walk-in guest form is public, but the Supabase browser client sends the
-- authenticated user's JWT when the visitor happens to be logged in (e.g. an
-- admin testing the form).  The previous `TO anon` policy blocked those
-- requests.  Apply the same security-definer check to both roles.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "guest_identifications_anon_insert" ON storage.objects;

CREATE POLICY "guest_identifications_public_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'guest-identifications'
    AND array_length(storage.foldername(name), 1) >= 2
    AND public.can_upload_guest_identification(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
  );
