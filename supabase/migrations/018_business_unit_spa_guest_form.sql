-- ─────────────────────────────────────────────────────────────────────────────
-- Spa-only Guest Form per Business Unit
-- A business unit whose intake is always a spa booking (a spa or wellness
-- centre) flags its guest form so the spa health screening is always shown and
-- the guest never has to answer whether it applies.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.business_units
  ADD COLUMN IF NOT EXISTS guest_form_spa_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Return type gains a column, so the function has to be dropped, not replaced.
DROP FUNCTION IF EXISTS public.get_public_guest_form_business_unit(TEXT);

CREATE OR REPLACE FUNCTION public.get_public_guest_form_business_unit(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  category TEXT,
  public_guest_form_slug TEXT,
  guest_form_spa_default BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bu.id, bu.name, bu.code, bu.category, bu.public_guest_form_slug, bu.guest_form_spa_default
  FROM public.business_units bu
  WHERE bu.public_guest_form_slug = lower(trim(p_slug))
    AND bu.is_archived = false
  LIMIT 1;
$$;

-- ── Public submission RPC ────────────────────────────────────────────────────
-- Recreated so a spa-only business unit forces is_spa_service server-side: the
-- flag lives in the database, not in the payload the browser sends.

DROP FUNCTION IF EXISTS public.submit_public_guest(
  TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB,
  BOOLEAN, TEXT[], TEXT
);

CREATE OR REPLACE FUNCTION public.submit_public_guest(
  p_slug TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone_number TEXT,
  p_email TEXT DEFAULT NULL,
  p_birthday DATE DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_nationality TEXT DEFAULT NULL,
  p_identification_type TEXT DEFAULT NULL,
  p_identification_number TEXT DEFAULT NULL,
  p_identification_image_path TEXT DEFAULT NULL,
  p_emergency_contact TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_is_spa_service BOOLEAN DEFAULT FALSE,
  p_spa_health_conditions TEXT[] DEFAULT '{}',
  p_spa_health_notes TEXT DEFAULT NULL
)
RETURNS public.guests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_unit public.business_units%ROWTYPE;
  v_guest public.guests%ROWTYPE;
  v_is_spa_service BOOLEAN;
  v_spa_health_conditions TEXT[] := coalesce(p_spa_health_conditions, '{}');
  v_spa_health_notes TEXT := nullif(trim(coalesce(p_spa_health_notes, '')), '');
BEGIN
  SELECT * INTO v_business_unit
  FROM public.business_units bu
  WHERE bu.public_guest_form_slug = lower(trim(p_slug))
    AND bu.is_archived = false
  LIMIT 1;

  IF v_business_unit.id IS NULL THEN
    RAISE EXCEPTION 'Guest form is not available for this business unit';
  END IF;

  v_is_spa_service := coalesce(v_business_unit.guest_form_spa_default, FALSE)
    OR coalesce(p_is_spa_service, FALSE);

  IF NOT v_is_spa_service THEN
    v_spa_health_conditions := '{}';
    v_spa_health_notes := NULL;
  ELSIF coalesce(array_length(v_spa_health_conditions, 1), 0) = 0
    AND v_spa_health_notes IS NULL THEN
    RAISE EXCEPTION 'Spa guests must declare their medical conditions and allergies';
  END IF;

  INSERT INTO public.guests (
    business_unit_id,
    user_id,
    first_name,
    last_name,
    phone_number,
    email,
    birthday,
    gender,
    nationality,
    identification_type,
    identification_number,
    identification_image_path,
    emergency_contact,
    notes,
    metadata,
    is_spa_service,
    spa_health_conditions,
    spa_health_notes
  ) VALUES (
    v_business_unit.id,
    v_business_unit.user_id,
    trim(p_first_name),
    trim(p_last_name),
    trim(p_phone_number),
    nullif(trim(p_email), ''),
    p_birthday,
    p_gender,
    trim(p_nationality),
    p_identification_type,
    nullif(trim(p_identification_number), ''),
    nullif(trim(p_identification_image_path), ''),
    trim(p_emergency_contact),
    nullif(trim(p_notes), ''),
    coalesce(p_metadata, '{}'::jsonb),
    v_is_spa_service,
    v_spa_health_conditions,
    v_spa_health_notes
  )
  RETURNING * INTO v_guest;

  RETURN v_guest;
END;
$$;
