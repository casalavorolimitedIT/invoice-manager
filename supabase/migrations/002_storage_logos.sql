-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: Business Unit Logo Uploads
-- Creates a public "logos" bucket and scoped RLS policies so that each
-- authenticated user can only manage files in their own folder.
-- Files are stored at:  logos/{user_id}/{uuid}.{ext}
-- ─────────────────────────────────────────────────────────────────────────────

-- Create the bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880, -- 5 MB limit per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
  SET public            = true,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── RLS policies ──────────────────────────────────────────────────────────────
-- Public read: anyone can view logos (needed to render them on invoices)
DO $$ BEGIN
  CREATE POLICY "logos_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'logos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated users can upload into their own folder ({user_id}/...)
DO $$ BEGIN
  CREATE POLICY "logos_authenticated_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'logos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated users can update files in their own folder
DO $$ BEGIN
  CREATE POLICY "logos_authenticated_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'logos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated users can delete files in their own folder
DO $$ BEGIN
  CREATE POLICY "logos_authenticated_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'logos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
