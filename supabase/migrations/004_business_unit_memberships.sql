-- ─────────────────────────────────────────────────────────────────────────────
-- Business Unit Memberships
-- Adds shared, view-only access to business units for invited users.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_unit_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id  UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role              TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'viewer')),
  invited_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_unit_id, user_id)
);

ALTER TABLE public.business_unit_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_business_unit_owner(
  p_business_unit_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_units bu
    WHERE bu.id = p_business_unit_id
      AND bu.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_unit_member(
  p_business_unit_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_units bu
    WHERE bu.id = p_business_unit_id
      AND (
        bu.user_id = p_user_id
        OR EXISTS (
          SELECT 1
          FROM public.business_unit_members m
          WHERE m.business_unit_id = bu.id
            AND m.user_id = p_user_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_business_unit(
  p_business_unit_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_business_unit_owner(p_business_unit_id, p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.get_profile_by_email(p_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.avatar
  FROM public.profiles p
  WHERE lower(p.email) = lower(trim(p_email))
  LIMIT 1;
END;
$$;

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
      ELSE 1
    END,
    lower(COALESCE(p.full_name, p.email, ''));
END;
$$;

INSERT INTO public.business_unit_members (business_unit_id, user_id, role, invited_by)
SELECT bu.id, bu.user_id, 'owner', bu.user_id
FROM public.business_units bu
ON CONFLICT (business_unit_id, user_id) DO UPDATE
SET role = 'owner';

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_business_unit_members
    BEFORE UPDATE ON public.business_unit_members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "business_units_owner_all" ON public.business_units;

DROP POLICY IF EXISTS "business_units_member_select" ON public.business_units;

CREATE POLICY "business_units_member_select"
  ON public.business_units FOR SELECT
  USING (public.is_business_unit_member(id));

DROP POLICY IF EXISTS "business_units_owner_insert" ON public.business_units;

CREATE POLICY "business_units_owner_insert"
  ON public.business_units FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "business_units_owner_update" ON public.business_units;

CREATE POLICY "business_units_owner_update"
  ON public.business_units FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "business_units_owner_delete" ON public.business_units;

CREATE POLICY "business_units_owner_delete"
  ON public.business_units FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "clients_owner_all" ON public.clients;

DROP POLICY IF EXISTS "clients_member_select" ON public.clients;

CREATE POLICY "clients_member_select"
  ON public.clients FOR SELECT
  USING (public.is_business_unit_member(business_unit_id));

DROP POLICY IF EXISTS "clients_owner_insert" ON public.clients;

CREATE POLICY "clients_owner_insert"
  ON public.clients FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_manage_business_unit(business_unit_id)
  );

DROP POLICY IF EXISTS "clients_owner_update" ON public.clients;

CREATE POLICY "clients_owner_update"
  ON public.clients FOR UPDATE
  USING (public.can_manage_business_unit(business_unit_id))
  WITH CHECK (public.can_manage_business_unit(business_unit_id));

DROP POLICY IF EXISTS "clients_owner_delete" ON public.clients;

CREATE POLICY "clients_owner_delete"
  ON public.clients FOR DELETE
  USING (public.can_manage_business_unit(business_unit_id));

DROP POLICY IF EXISTS "invoice_sequences_bu_owner" ON public.invoice_sequences;

DROP POLICY IF EXISTS "invoice_sequences_owner_all" ON public.invoice_sequences;

CREATE POLICY "invoice_sequences_owner_all"
  ON public.invoice_sequences FOR ALL
  USING (public.can_manage_business_unit(business_unit_id))
  WITH CHECK (public.can_manage_business_unit(business_unit_id));

DROP POLICY IF EXISTS "invoices_owner_all" ON public.invoices;

DROP POLICY IF EXISTS "invoices_member_select" ON public.invoices;

CREATE POLICY "invoices_member_select"
  ON public.invoices FOR SELECT
  USING (public.is_business_unit_member(business_unit_id));

DROP POLICY IF EXISTS "invoices_owner_insert" ON public.invoices;

CREATE POLICY "invoices_owner_insert"
  ON public.invoices FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_manage_business_unit(business_unit_id)
  );

DROP POLICY IF EXISTS "invoices_owner_update" ON public.invoices;

CREATE POLICY "invoices_owner_update"
  ON public.invoices FOR UPDATE
  USING (public.can_manage_business_unit(business_unit_id))
  WITH CHECK (public.can_manage_business_unit(business_unit_id));

DROP POLICY IF EXISTS "invoices_owner_delete" ON public.invoices;

CREATE POLICY "invoices_owner_delete"
  ON public.invoices FOR DELETE
  USING (public.can_manage_business_unit(business_unit_id));

DROP POLICY IF EXISTS "invoice_items_invoice_owner" ON public.invoice_items;

DROP POLICY IF EXISTS "invoice_items_member_select" ON public.invoice_items;

CREATE POLICY "invoice_items_member_select"
  ON public.invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.is_business_unit_member(i.business_unit_id)
    )
  );

DROP POLICY IF EXISTS "invoice_items_owner_insert" ON public.invoice_items;

CREATE POLICY "invoice_items_owner_insert"
  ON public.invoice_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_manage_business_unit(i.business_unit_id)
    )
  );

DROP POLICY IF EXISTS "invoice_items_owner_update" ON public.invoice_items;

CREATE POLICY "invoice_items_owner_update"
  ON public.invoice_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_manage_business_unit(i.business_unit_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_manage_business_unit(i.business_unit_id)
    )
  );

DROP POLICY IF EXISTS "invoice_items_owner_delete" ON public.invoice_items;

CREATE POLICY "invoice_items_owner_delete"
  ON public.invoice_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_manage_business_unit(i.business_unit_id)
    )
  );

DROP POLICY IF EXISTS "invoice_status_history_invoice_owner" ON public.invoice_status_history;

DROP POLICY IF EXISTS "invoice_status_history_member_select" ON public.invoice_status_history;

CREATE POLICY "invoice_status_history_member_select"
  ON public.invoice_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.is_business_unit_member(i.business_unit_id)
    )
  );

DROP POLICY IF EXISTS "invoice_status_history_owner_insert" ON public.invoice_status_history;

CREATE POLICY "invoice_status_history_owner_insert"
  ON public.invoice_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_manage_business_unit(i.business_unit_id)
    )
  );

DROP POLICY IF EXISTS "profiles_owner_select" ON public.profiles;

CREATE POLICY "profiles_owner_select"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "business_unit_members_self_select" ON public.business_unit_members;

CREATE POLICY "business_unit_members_self_select"
  ON public.business_unit_members FOR SELECT
  USING (auth.uid() = user_id OR public.is_business_unit_member(business_unit_id));

DROP POLICY IF EXISTS "business_unit_members_owner_seed" ON public.business_unit_members;

CREATE POLICY "business_unit_members_owner_seed"
  ON public.business_unit_members FOR INSERT
  WITH CHECK (
    (
      auth.uid() = user_id
      AND role = 'owner'
      AND public.is_business_unit_owner(business_unit_id)
    )
    OR (
      public.is_business_unit_owner(business_unit_id)
      AND role = 'viewer'
    )
  );

DROP POLICY IF EXISTS "business_unit_members_owner_delete" ON public.business_unit_members;

CREATE POLICY "business_unit_members_owner_delete"
  ON public.business_unit_members FOR DELETE
  USING (
    (public.is_business_unit_owner(business_unit_id) AND role <> 'owner')
    OR (auth.uid() = user_id AND role <> 'owner')
  );

CREATE INDEX IF NOT EXISTS idx_business_unit_members_business_unit_id
  ON public.business_unit_members (business_unit_id);

CREATE INDEX IF NOT EXISTS idx_business_unit_members_user_id
  ON public.business_unit_members (user_id);

CREATE INDEX IF NOT EXISTS idx_business_unit_members_lookup
  ON public.business_unit_members (business_unit_id, user_id);