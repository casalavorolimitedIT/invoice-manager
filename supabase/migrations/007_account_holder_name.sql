-- Add account holder name to business units and invoice snapshots.

ALTER TABLE public.business_units
  ADD COLUMN IF NOT EXISTS account_holder_name TEXT;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS bu_account_holder_name TEXT;

UPDATE public.invoices AS i
SET bu_account_holder_name = bu.account_holder_name
FROM public.business_units AS bu
WHERE bu.id = i.business_unit_id
  AND i.bu_account_holder_name IS NULL
  AND bu.account_holder_name IS NOT NULL;