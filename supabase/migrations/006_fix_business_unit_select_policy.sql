-- Avoid self-referential SELECT policy checks on business_units during INSERT ... RETURNING.
-- Owner reads can be evaluated directly from the row, while shared-member reads rely on the
-- membership table only.

DROP POLICY IF EXISTS "business_units_owner_select" ON public.business_units;

CREATE POLICY "business_units_owner_select"
  ON public.business_units FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "business_units_member_select" ON public.business_units;

CREATE POLICY "business_units_member_select"
  ON public.business_units FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_unit_members m
      WHERE m.business_unit_id = id
        AND m.user_id = auth.uid()
    )
  );