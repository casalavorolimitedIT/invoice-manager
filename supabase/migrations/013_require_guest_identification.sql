-- Enforce required guest identification fields for new writes.
-- Existing legacy rows are left untouched via NOT VALID constraints.

ALTER TABLE public.guests
  DROP CONSTRAINT IF EXISTS guests_identification_type_required;

ALTER TABLE public.guests
  ADD CONSTRAINT guests_identification_type_required
  CHECK (identification_type IS NOT NULL) NOT VALID;

ALTER TABLE public.guests
  DROP CONSTRAINT IF EXISTS guests_identification_image_path_required;

ALTER TABLE public.guests
  ADD CONSTRAINT guests_identification_image_path_required
  CHECK (nullif(trim(identification_image_path), '') IS NOT NULL) NOT VALID;
