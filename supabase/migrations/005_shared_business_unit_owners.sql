-- ─────────────────────────────────────────────────────────────────────────────
-- Shared Business Unit Owners
-- Allows membership role `owner` to manage a business unit the same way as the
-- original creator.
-- ─────────────────────────────────────────────────────────────────────────────

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
      AND (
        bu.user_id = p_user_id
        OR EXISTS (
          SELECT 1
          FROM public.business_unit_members m
          WHERE m.business_unit_id = bu.id
            AND m.user_id = p_user_id
            AND m.role = 'owner'
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

DROP POLICY IF EXISTS "business_units_owner_update" ON public.business_units;

CREATE POLICY "business_units_owner_update"
  ON public.business_units FOR UPDATE
  USING (public.can_manage_business_unit(id))
  WITH CHECK (public.can_manage_business_unit(id));

DROP POLICY IF EXISTS "business_units_owner_delete" ON public.business_units;

CREATE POLICY "business_units_owner_delete"
  ON public.business_units FOR DELETE
  USING (public.can_manage_business_unit(id));

DROP POLICY IF EXISTS "business_unit_members_owner_seed" ON public.business_unit_members;

CREATE POLICY "business_unit_members_owner_seed"
  ON public.business_unit_members FOR INSERT
  WITH CHECK (
    public.is_business_unit_owner(business_unit_id)
    AND role IN ('owner', 'viewer')
  );

DROP POLICY IF EXISTS "business_unit_members_owner_delete" ON public.business_unit_members;

CREATE POLICY "business_unit_members_owner_delete"
  ON public.business_unit_members FOR DELETE
  USING (
    (public.is_business_unit_owner(business_unit_id) AND role <> 'owner')
    OR (auth.uid() = user_id AND role <> 'owner')
  );

DROP POLICY IF EXISTS "business_unit_members_owner_update" ON public.business_unit_members;

CREATE POLICY "business_unit_members_owner_update"
  ON public.business_unit_members FOR UPDATE
  USING (
    public.is_business_unit_owner(business_unit_id)
    AND (
      role <> 'owner'
      OR user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_business_unit_owner(business_unit_id)
    AND role IN ('owner', 'viewer')
  );