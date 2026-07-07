-- ─────────────────────────────────────────────────────────────────────────────
-- Business Unit Ownership Transfer
-- Lets a current owner (the original creator or a promoted co-owner) hand off
-- the business_units.user_id "primary owner" slot to an existing member.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.transfer_business_unit_ownership(
  p_business_unit_id UUID,
  p_new_owner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  IF NOT public.is_business_unit_owner(p_business_unit_id, v_caller) THEN
    RAISE EXCEPTION 'Only a current owner can transfer ownership';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.business_unit_members
    WHERE business_unit_id = p_business_unit_id AND user_id = p_new_owner_id
  ) THEN
    RAISE EXCEPTION 'Target user is not a member of this business unit';
  END IF;

  IF p_new_owner_id = v_caller THEN
    RAISE EXCEPTION 'Cannot transfer ownership to yourself';
  END IF;

  -- Reassign the primary owner slot only if the caller currently holds it.
  -- A promoted (non-creator) owner transferring never touches this column,
  -- so it can't strip the original creator's access as a side effect.
  UPDATE public.business_units
    SET user_id = p_new_owner_id
    WHERE id = p_business_unit_id
      AND user_id = v_caller;

  -- The new owner always gets the 'owner' role in the members table.
  UPDATE public.business_unit_members
    SET role = 'owner'
    WHERE business_unit_id = p_business_unit_id
      AND user_id = p_new_owner_id;

  -- The caller gives up their own owner role, if they held one. Any other
  -- co-owner's role is left untouched.
  UPDATE public.business_unit_members
    SET role = 'viewer'
    WHERE business_unit_id = p_business_unit_id
      AND user_id = v_caller
      AND role = 'owner';
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_business_unit_ownership(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_business_unit_ownership(UUID, UUID) TO authenticated;
