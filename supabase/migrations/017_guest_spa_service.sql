-- ─────────────────────────────────────────────────────────────────────────────
-- Guest Spa Service + Health Screening
-- Flags guests booking a spa service and records the medical conditions and
-- allergies they declare (preset keys plus free-text entries), so the front
-- desk can screen treatments before check-in.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS is_spa_service BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS spa_health_conditions TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS spa_health_notes TEXT;

-- A spa guest must declare something: at least one condition (the "none"
-- option counts) or free-text notes. Legacy rows stay untouched (NOT VALID).
ALTER TABLE public.guests
  DROP CONSTRAINT IF EXISTS guests_spa_health_declaration_required;

ALTER TABLE public.guests
  ADD CONSTRAINT guests_spa_health_declaration_required
  CHECK (
    is_spa_service = FALSE
    OR coalesce(array_length(spa_health_conditions, 1), 0) > 0
    OR nullif(trim(spa_health_notes), '') IS NOT NULL
  ) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_guests_spa_service
  ON public.guests (business_unit_id, is_spa_service)
  WHERE is_spa_service = TRUE;

CREATE INDEX IF NOT EXISTS idx_guests_spa_health_conditions
  ON public.guests USING GIN (spa_health_conditions);

-- ── Public submission RPC ────────────────────────────────────────────────────
-- Dropped and recreated instead of CREATE OR REPLACE: the new spa parameters
-- would otherwise register a second overload and make named-argument calls
-- ambiguous.

DROP FUNCTION IF EXISTS public.submit_public_guest(
  TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
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
  v_is_spa_service BOOLEAN := coalesce(p_is_spa_service, FALSE);
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
