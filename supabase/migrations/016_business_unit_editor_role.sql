-- ─────────────────────────────────────────────────────────────────────────────
-- Business Unit Editor Role
-- Adds a role between owner and viewer that can create/edit invoices,
-- clients, and guests, without business-unit deletion, ownership transfer,
-- or member-management power (all of which stay owner-only).
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow 'editor' as a role
ALTER TABLE public.business_unit_members
  DROP CONSTRAINT IF EXISTS business_unit_members_role_check;
ALTER TABLE public.business_unit_members
  ADD CONSTRAINT business_unit_members_role_check
  CHECK (role IN ('owner', 'editor', 'viewer'));

-- New permission function: editor OR owner
CREATE OR REPLACE FUNCTION public.can_edit_business_unit(
  p_business_unit_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_business_unit_owner(p_business_unit_id, p_user_id)
    OR EXISTS (
      SELECT 1 FROM public.business_unit_members m
      WHERE m.business_unit_id = p_business_unit_id
        AND m.user_id = p_user_id
        AND m.role = 'editor'
    );
$$;

-- clients
DROP POLICY IF EXISTS "clients_owner_insert" ON public.clients;
CREATE POLICY "clients_owner_insert"
  ON public.clients FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_edit_business_unit(business_unit_id)
  );

DROP POLICY IF EXISTS "clients_owner_update" ON public.clients;
CREATE POLICY "clients_owner_update"
  ON public.clients FOR UPDATE
  USING (public.can_edit_business_unit(business_unit_id))
  WITH CHECK (public.can_edit_business_unit(business_unit_id));

DROP POLICY IF EXISTS "clients_owner_delete" ON public.clients;
CREATE POLICY "clients_owner_delete"
  ON public.clients FOR DELETE
  USING (public.can_edit_business_unit(business_unit_id));

-- invoice_sequences
DROP POLICY IF EXISTS "invoice_sequences_owner_all" ON public.invoice_sequences;
CREATE POLICY "invoice_sequences_owner_all"
  ON public.invoice_sequences FOR ALL
  USING (public.can_edit_business_unit(business_unit_id))
  WITH CHECK (public.can_edit_business_unit(business_unit_id));

-- invoices
DROP POLICY IF EXISTS "invoices_owner_insert" ON public.invoices;
CREATE POLICY "invoices_owner_insert"
  ON public.invoices FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_edit_business_unit(business_unit_id)
  );

DROP POLICY IF EXISTS "invoices_owner_update" ON public.invoices;
CREATE POLICY "invoices_owner_update"
  ON public.invoices FOR UPDATE
  USING (public.can_edit_business_unit(business_unit_id))
  WITH CHECK (public.can_edit_business_unit(business_unit_id));

DROP POLICY IF EXISTS "invoices_owner_delete" ON public.invoices;
CREATE POLICY "invoices_owner_delete"
  ON public.invoices FOR DELETE
  USING (public.can_edit_business_unit(business_unit_id));

-- invoice_items
DROP POLICY IF EXISTS "invoice_items_owner_insert" ON public.invoice_items;
CREATE POLICY "invoice_items_owner_insert"
  ON public.invoice_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_edit_business_unit(i.business_unit_id)
    )
  );

DROP POLICY IF EXISTS "invoice_items_owner_update" ON public.invoice_items;
CREATE POLICY "invoice_items_owner_update"
  ON public.invoice_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_edit_business_unit(i.business_unit_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_edit_business_unit(i.business_unit_id)
    )
  );

DROP POLICY IF EXISTS "invoice_items_owner_delete" ON public.invoice_items;
CREATE POLICY "invoice_items_owner_delete"
  ON public.invoice_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_edit_business_unit(i.business_unit_id)
    )
  );

-- invoice_status_history
DROP POLICY IF EXISTS "invoice_status_history_owner_insert" ON public.invoice_status_history;
CREATE POLICY "invoice_status_history_owner_insert"
  ON public.invoice_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_edit_business_unit(i.business_unit_id)
    )
  );

-- guests
DROP POLICY IF EXISTS "guests_owner_insert" ON public.guests;
CREATE POLICY "guests_owner_insert"
  ON public.guests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_edit_business_unit(business_unit_id)
  );

DROP POLICY IF EXISTS "guests_owner_update" ON public.guests;
CREATE POLICY "guests_owner_update"
  ON public.guests FOR UPDATE
  USING (public.can_edit_business_unit(business_unit_id))
  WITH CHECK (public.can_edit_business_unit(business_unit_id));

DROP POLICY IF EXISTS "guests_owner_delete" ON public.guests;
CREATE POLICY "guests_owner_delete"
  ON public.guests FOR DELETE
  USING (public.can_edit_business_unit(business_unit_id));

-- guest-identifications storage bucket
DROP POLICY IF EXISTS "guest_identifications_manager_update" ON storage.objects;
DO $$ BEGIN
  CREATE POLICY "guest_identifications_manager_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'guest-identifications'
      AND public.can_edit_business_unit(((storage.foldername(name))[1])::uuid)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "guest_identifications_manager_delete" ON storage.objects;
DO $$ BEGIN
  CREATE POLICY "guest_identifications_manager_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'guest-identifications'
      AND public.can_edit_business_unit(((storage.foldername(name))[1])::uuid)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Role editing: any current owner can change any OTHER member's role
-- between editor/viewer. The primary owner's own row can never be edited
-- directly (only via transfer_business_unit_ownership), and a plain
-- UPDATE can never set role = 'owner' -- that only ever happens through
-- the RPC, which bypasses RLS as SECURITY DEFINER.
DROP POLICY IF EXISTS "business_unit_members_owner_update" ON public.business_unit_members;
CREATE POLICY "business_unit_members_owner_update"
  ON public.business_unit_members FOR UPDATE
  USING (
    public.is_business_unit_owner(business_unit_id)
    AND user_id <> (
      SELECT bu.user_id FROM public.business_units bu WHERE bu.id = business_unit_id
    )
  )
  WITH CHECK (
    public.is_business_unit_owner(business_unit_id)
    AND role IN ('editor', 'viewer')
  );

-- Sort editors between owners and viewers in the members list
CREATE OR REPLACE FUNCTION public.get_business_unit_members(p_business_unit_id UUID)
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  invited_by UUID,
  created_at TIMESTAMPTZ,
  email TEXT,
  full_name TEXT,
  avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_business_unit_member(p_business_unit_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.user_id,
    m.role,
    m.invited_by,
    m.created_at,
    p.email,
    p.full_name,
    p.avatar
  FROM public.business_unit_members m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.business_unit_id = p_business_unit_id
  ORDER BY
    CASE m.role
      WHEN 'owner' THEN 0
      WHEN 'editor' THEN 1
      ELSE 2
    END,
    lower(COALESCE(p.full_name, p.email, ''));
END;
$$;
