-- Provide a stable shared-access lookup path that does not depend on callers
-- selecting from business_units directly under table RLS.

CREATE OR REPLACE FUNCTION public.get_accessible_business_units(
  p_include_archived BOOLEAN DEFAULT FALSE
)
RETURNS SETOF public.business_units
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bu.*
  FROM public.business_units bu
  WHERE auth.uid() IS NOT NULL
    AND (p_include_archived OR bu.is_archived = FALSE)
    AND (
      bu.user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.business_unit_members m
        WHERE m.business_unit_id = bu.id
          AND m.user_id = auth.uid()
      )
    )
  ORDER BY bu.is_archived ASC, bu.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_accessible_business_unit(
  p_business_unit_id UUID
)
RETURNS SETOF public.business_units
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bu.*
  FROM public.business_units bu
  WHERE auth.uid() IS NOT NULL
    AND bu.id = p_business_unit_id
    AND (
      bu.user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.business_unit_members m
        WHERE m.business_unit_id = bu.id
          AND m.user_id = auth.uid()
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_accessible_business_units(BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_accessible_business_unit(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_accessible_business_units(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_business_unit(UUID) TO authenticated;