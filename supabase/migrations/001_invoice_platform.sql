-- ─────────────────────────────────────────────────────────────────────────────
-- Invoice Platform Schema — Multi-Business-Unit Support
-- Run this migration in your Supabase SQL Editor (Database → SQL Editor → New query)
-- Supports unlimited business-unit types: IT, Real Estate, Finance, Hotel, Sales, etc.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Business Units ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_units (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name                    TEXT          NOT NULL,
  code                    TEXT          NOT NULL,         -- e.g. "IT", "RE", "FIN-01" (max 10 chars)
  category                TEXT,                           -- free-text: "IT", "Real Estate", "Finance" …
  website                 TEXT,

  -- Contact
  address                 TEXT,
  city                    TEXT,
  state                   TEXT,
  country                 TEXT,
  postal_code             TEXT,
  phone                   TEXT,
  email                   TEXT,

  -- Legal / Tax
  tax_id                  TEXT,
  registration_number     TEXT,
  default_currency        TEXT          NOT NULL DEFAULT 'USD',
  default_tax_rate        NUMERIC(5,2)  NOT NULL DEFAULT 0,
  tax_label               TEXT          NOT NULL DEFAULT 'Tax',  -- VAT, GST, WHT, etc.

  -- Branding
  brand_color             TEXT          NOT NULL DEFAULT '#000000',
  logo_url                TEXT,

  -- Bank / Payment
  bank_name               TEXT,
  bank_account_number     TEXT,
  bank_routing_number     TEXT,
  bank_swift              TEXT,
  bank_iban               TEXT,

  -- Defaults
  payment_terms           TEXT          NOT NULL DEFAULT 'Net 30',
  footer_legal_text       TEXT,
  notes                   TEXT,

  -- State
  is_archived             BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Extension point for vertical-specific extras (hotel check-in fields, RE unit refs, etc.)
  metadata                JSONB         NOT NULL DEFAULT '{}',

  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_units_owner_all" ON public.business_units;

CREATE POLICY "business_units_owner_all"
  ON public.business_units FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Clients ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id    UUID          NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  user_id             UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name                TEXT          NOT NULL,
  company             TEXT,
  email               TEXT,
  phone               TEXT,
  address             TEXT,
  city                TEXT,
  state               TEXT,
  country             TEXT,
  postal_code         TEXT,
  tax_id              TEXT,
  notes               TEXT,

  is_archived         BOOLEAN       NOT NULL DEFAULT FALSE,
  metadata            JSONB         NOT NULL DEFAULT '{}',

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_owner_all" ON public.clients;

CREATE POLICY "clients_owner_all"
  ON public.clients FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Invoice Sequences (collision-safe per BU + year) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  id                  UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id    UUID  NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  year                INT   NOT NULL,
  next_number         INT   NOT NULL DEFAULT 1,
  UNIQUE (business_unit_id, year)
);

ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_sequences_bu_owner" ON public.invoice_sequences;

CREATE POLICY "invoice_sequences_bu_owner"
  ON public.invoice_sequences FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_units bu
      WHERE bu.id = business_unit_id AND bu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_units bu
      WHERE bu.id = business_unit_id AND bu.user_id = auth.uid()
    )
  );

-- ── Atomic sequence function ──────────────────────────────────────────────────
-- Returns the next available invoice number for (business_unit, year).
-- Thread-safe: the UPDATE row lock prevents concurrent duplicates.
CREATE OR REPLACE FUNCTION public.next_invoice_number(
  p_business_unit_id  UUID,
  p_year              INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_number INT;
BEGIN
  -- Ensure a row exists (1st call for that BU+year)
  INSERT INTO public.invoice_sequences (business_unit_id, year, next_number)
  VALUES (p_business_unit_id, p_year, 1)
  ON CONFLICT (business_unit_id, year) DO NOTHING;

  -- Atomically claim and advance the counter
  UPDATE public.invoice_sequences
  SET    next_number = next_number + 1
  WHERE  business_unit_id = p_business_unit_id
    AND  year = p_year
  RETURNING next_number - 1 INTO v_number;

  RETURN v_number;
END;
$$;

-- ── Invoices ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_unit_id        UUID            NOT NULL REFERENCES public.business_units(id) ON DELETE RESTRICT,
  client_id               UUID            REFERENCES public.clients(id) ON DELETE SET NULL,

  invoice_number          TEXT            NOT NULL,
  issue_date              DATE            NOT NULL DEFAULT CURRENT_DATE,
  due_date                DATE            NOT NULL,
  status                  TEXT            NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','sent','paid','overdue')),

  -- Client snapshot (preserved for historical accuracy after client edits)
  client_name             TEXT            NOT NULL,
  client_company          TEXT,
  client_email            TEXT,
  client_address          TEXT,

  -- Financials (server-calculated)
  subtotal                NUMERIC(12,2)   NOT NULL DEFAULT 0,
  discount_type           TEXT            NOT NULL DEFAULT 'percentage'
                            CHECK (discount_type IN ('percentage','fixed')),
  discount_value          NUMERIC(12,2)   NOT NULL DEFAULT 0,
  discount_amount         NUMERIC(12,2)   NOT NULL DEFAULT 0,
  tax_rate                NUMERIC(5,2)    NOT NULL DEFAULT 0,
  tax_label               TEXT            NOT NULL DEFAULT 'Tax',
  tax_amount              NUMERIC(12,2)   NOT NULL DEFAULT 0,
  total                   NUMERIC(12,2)   NOT NULL DEFAULT 0,
  currency                TEXT            NOT NULL DEFAULT 'USD',

  notes                   TEXT,
  payment_terms           TEXT            NOT NULL DEFAULT 'Net 30',

  -- Business-unit snapshot (brand/legal at time of issue)
  bu_name                 TEXT            NOT NULL,
  bu_address              TEXT,
  bu_email                TEXT,
  bu_phone                TEXT,
  bu_tax_id               TEXT,
  bu_bank_name            TEXT,
  bu_bank_account_number  TEXT,
  bu_bank_swift           TEXT,
  bu_bank_iban            TEXT,
  bu_footer_legal_text    TEXT,
  bu_logo_url             TEXT,
  bu_brand_color          TEXT,
  bu_tax_label            TEXT,

  -- Vertical-specific extras
  metadata                JSONB           NOT NULL DEFAULT '{}',

  created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_owner_all" ON public.invoices;

CREATE POLICY "invoices_owner_all"
  ON public.invoices FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Invoice Items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID            NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  sort_order      INT             NOT NULL DEFAULT 0,
  description     TEXT            NOT NULL,
  quantity        NUMERIC(10,3)   NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12,2)   NOT NULL DEFAULT 0,
  total           NUMERIC(12,2)   NOT NULL DEFAULT 0,
  metadata        JSONB           NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_items_invoice_owner" ON public.invoice_items;

CREATE POLICY "invoice_items_invoice_owner"
  ON public.invoice_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND i.user_id = auth.uid()
    )
  );

-- ── Invoice Status History ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_status_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID        NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT        NOT NULL,
  notes       TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoice_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_status_history_invoice_owner" ON public.invoice_status_history;

CREATE POLICY "invoice_status_history_invoice_owner"
  ON public.invoice_status_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND i.user_id = auth.uid()
    )
  );

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_business_units
    BEFORE UPDATE ON public.business_units
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_clients
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_invoices
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_business_units_user_id    ON public.business_units (user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id           ON public.clients (user_id);
CREATE INDEX IF NOT EXISTS idx_clients_business_unit_id  ON public.clients (business_unit_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id          ON public.invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_unit_id ON public.invoices (business_unit_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id        ON public.invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status           ON public.invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id  ON public.invoice_items (invoice_id);
