import { z } from "zod";

export const PAYMENT_TERMS_OPTIONS = [
  { value: "Due on Receipt", label: "Due on Receipt" },
  { value: "Balance Due", label: "Balance Due" },
  { value: "Net 7", label: "Net 7" },
  { value: "Net 14", label: "Net 14" },
  { value: "Net 30", label: "Net 30" },
  { value: "Net 45", label: "Net 45" },
  { value: "Net 60", label: "Net 60" },
  { value: "Net 90", label: "Net 90" },
] as const;

export const DEFAULT_PAYMENT_TERMS = "Net 30";

// ── Business Unit ─────────────────────────────────────────────────────────────

export const businessUnitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10, "Max 10 characters"),
  category: z.string().optional(),
  website: z.string().optional(),

  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),

  tax_id: z.string().optional(),
  registration_number: z.string().optional(),
  default_currency: z.string().min(1).default("USD"),
  default_tax_rate: z.coerce.number().min(0).max(100).default(0),
  tax_label: z.string().min(1).default("Tax"),

  brand_color: z.string().default("#000000"),
  logo_url: z.string().optional(),

  bank_name: z.string().optional(),
  account_holder_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_routing_number: z.string().optional(),
  bank_swift: z.string().optional(),
  bank_iban: z.string().optional(),

  payment_terms: z.string().default(DEFAULT_PAYMENT_TERMS),
  footer_legal_text: z.string().optional(),
  notes: z.string().optional(),
});

export type BusinessUnitInput = z.infer<typeof businessUnitSchema>;

export const BUSINESS_UNIT_MEMBER_ROLES = ["owner", "viewer"] as const;

export type BusinessUnitMemberRole = (typeof BUSINESS_UNIT_MEMBER_ROLES)[number];

export type BusinessUnit = BusinessUnitInput & {
  id: string;
  user_id: string;
  is_archived: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  current_user_role?: BusinessUnitMemberRole | null;
  current_user_can_manage?: boolean;
};

export type BusinessUnitMember = {
  user_id: string;
  role: BusinessUnitMemberRole;
  invited_by: string | null;
  created_at: string;
  email: string | null;
  full_name: string | null;
  avatar: string | null;
};

// ── Client ────────────────────────────────────────────────────────────────────

export const clientSchema = z.object({
  business_unit_id: z.string().uuid("Select a business unit"),
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  tax_id: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;

export type Client = ClientInput & {
  id: string;
  user_id: string;
  is_archived: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// ── Invoice ───────────────────────────────────────────────────────────────────

export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
};

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unit_price: z.coerce.number().min(0, "Price must be ≥ 0"),
  total: z.coerce.number().min(0),
  sort_order: z.number().int().default(0),
});

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const invoiceSchema = z.object({
  business_unit_id: z.string().uuid("Select a business unit"),
  client_id: z.string().uuid().optional(),

  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().min(1, "Due date is required"),

  client_name: z.string().min(1, "Client name is required"),
  client_company: z.string().optional(),
  client_email: z.string().optional(),
  client_address: z.string().optional(),

  discount_type: z.enum(["percentage", "fixed"]).default("percentage"),
  discount_value: z.coerce.number().min(0).default(0),
  payment_terms: z.string().default(DEFAULT_PAYMENT_TERMS),
  paid_amount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),

  items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  sort_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Invoice = {
  id: string;
  user_id: string;
  business_unit_id: string;
  client_id: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  client_name: string;
  client_company: string | null;
  client_email: string | null;
  client_address: string | null;
  subtotal: number;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_label: string;
  tax_amount: number;
  total: number;
  currency: string;
  notes: string | null;
  payment_terms: string;
  bu_name: string;
  bu_address: string | null;
  bu_email: string | null;
  bu_phone: string | null;
  bu_tax_id: string | null;
  bu_bank_name: string | null;
  bu_account_holder_name: string | null;
  bu_bank_account_number: string | null;
  bu_bank_swift: string | null;
  bu_bank_iban: string | null;
  bu_footer_legal_text: string | null;
  bu_logo_url: string | null;
  bu_brand_color: string | null;
  bu_tax_label: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
};

// ── Preview Payload (shared by live preview & PDF export) ─────────────────────

export interface InvoicePreviewPayload {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  business: {
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    taxId: string | null;
    bankName: string | null;
    accountHolderName: string | null;
    bankAccount: string | null;
    bankSwift: string | null;
    bankIban: string | null;
    logoUrl: string | null;
    brandColor: string;
    taxLabel: string;
    footerLegalText: string | null;
  };
  client: {
    name: string;
    company: string | null;
    email: string | null;
    address: string | null;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxLabel: string;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  notes: string | null;
  paymentTerms: string;
}

function parsePaidAmountFromMetadata(metadata: Record<string, unknown> | undefined): number {
  const raw = metadata?.paid_amount;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, raw);
  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
}

export function resolveInvoicePaidAmount(invoice: Pick<Invoice, "metadata" | "total">): number {
  return Math.min(parsePaidAmountFromMetadata(invoice.metadata), Math.max(0, invoice.total));
}

export function computeBalanceDue(total: number, paidAmount: number): number {
  const safeTotal = Math.max(0, total);
  const safePaidAmount = Math.min(Math.max(0, paidAmount), safeTotal);
  return Math.max(0, safeTotal - safePaidAmount);
}

// ── Utility: build preview payload from an Invoice record ─────────────────────

export function invoiceToPreviewPayload(invoice: Invoice): InvoicePreviewPayload {
  const paidAmount = resolveInvoicePaidAmount(invoice);
  const balanceDue = computeBalanceDue(invoice.total, paidAmount);

  return {
    invoiceNumber: invoice.invoice_number,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    status: invoice.status,
    business: {
      name: invoice.bu_name,
      address: invoice.bu_address,
      city: null,
      state: null,
      country: null,
      phone: invoice.bu_phone,
      email: invoice.bu_email,
      taxId: invoice.bu_tax_id,
      bankName: invoice.bu_bank_name,
      bankAccount: invoice.bu_bank_account_number,
      accountHolderName: invoice.bu_account_holder_name,
      bankSwift: invoice.bu_bank_swift,
      bankIban: invoice.bu_bank_iban,
      logoUrl: invoice.bu_logo_url,
      brandColor: invoice.bu_brand_color ?? "#000000",
      taxLabel: invoice.bu_tax_label ?? invoice.tax_label,
      footerLegalText: invoice.bu_footer_legal_text,
    },
    client: {
      name: invoice.client_name,
      company: invoice.client_company,
      email: invoice.client_email,
      address: invoice.client_address,
    },
    items:
      invoice.items?.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
      })) ?? [],
    subtotal: invoice.subtotal,
    discountType: invoice.discount_type,
    discountValue: invoice.discount_value,
    discountAmount: invoice.discount_amount,
    taxRate: invoice.tax_rate,
    taxLabel: invoice.tax_label,
    taxAmount: invoice.tax_amount,
    total: invoice.total,
    paidAmount,
    balanceDue,
    currency: invoice.currency,
    notes: invoice.notes,
    paymentTerms: invoice.payment_terms,
  };
}

// ── Utility: compute invoice totals (client-side, server mirrors this) ────────

export function computeInvoiceTotals(
  items: { quantity: number; unitPrice: number }[],
  discountType: "percentage" | "fixed",
  discountValue: number,
  taxRate: number
) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmount =
    discountType === "percentage"
      ? (subtotal * discountValue) / 100
      : Math.min(discountValue, subtotal);
  const taxBase = subtotal - discountAmount;
  const taxAmount = (taxBase * taxRate) / 100;
  const total = taxBase + taxAmount;
  return { subtotal, discountAmount, taxBase, taxAmount, total };
}

// ── Utility: format currency ──────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ── Utility: add days to an ISO date string ───────────────────────────────────

export function addDaysToDate(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export function paymentTermsToDays(terms: string): number {
  if (terms === "Due on Receipt" || terms === "Balance Due") {
    return 0;
  }
  const match = terms.match(/\d+/);
  return match ? parseInt(match[0], 10) : 30;
}
