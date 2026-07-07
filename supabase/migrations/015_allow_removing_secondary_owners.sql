-- ─────────────────────────────────────────────────────────────────────────────
-- Allow Removing Secondary Owners
-- The primary owner (business_units.user_id) may need to fully revoke a
-- member's access, including a legacy/secondary co-owner (a
-- business_unit_members row with role='owner' that isn't the primary owner
-- slot). The prior policy blocked deleting any role='owner' row outright.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "business_unit_members_owner_delete" ON public.business_unit_members;

CREATE POLICY "business_unit_members_owner_delete"
  ON public.business_unit_members FOR DELETE
  USING (
    (
      public.is_business_unit_owner(business_unit_id)
      AND user_id <> auth.uid()
      AND user_id <> (
        SELECT bu.user_id FROM public.business_units bu WHERE bu.id = business_unit_id
      )
    )
    OR (auth.uid() = user_id AND role <> 'owner')
  );
