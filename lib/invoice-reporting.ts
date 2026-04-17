import type { BusinessUnit, Invoice, InvoiceStatus } from "@/lib/types/invoice";

export type InvoiceStatusFilter = "all" | InvoiceStatus;

export interface InvoiceFilterState {
  query: string;
  status: InvoiceStatusFilter;
  dateFrom: string;
  dateTo: string;
}

export interface InvoiceSummaryStats {
  total: number;
  paid: number;
  outstanding: number;
  overdue: number;
  draft: number;
  count: number;
  paidCount: number;
  outstandingCount: number;
  overdueCount: number;
  draftCount: number;
}

export interface BusinessUnitRevenueRow {
  id: string;
  name: string;
  color: string;
  total: number;
  count: number;
}

function normalizeDateValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function filterInvoices(
  invoices: Invoice[],
  filters: InvoiceFilterState,
  dateField: "issue_date" | "due_date" | "created_at" = "issue_date"
): Invoice[] {
  const query = normalizeQuery(filters.query);

  return invoices.filter((invoice) => {
    if (filters.status !== "all" && invoice.status !== filters.status) {
      return false;
    }

    const dateValue = normalizeDateValue(invoice[dateField]);
    if (filters.dateFrom && (!dateValue || dateValue < filters.dateFrom)) {
      return false;
    }
    if (filters.dateTo && (!dateValue || dateValue > filters.dateTo)) {
      return false;
    }

    if (!query) return true;

    const searchHaystack = [
      invoice.invoice_number,
      invoice.client_name,
      invoice.client_company,
      invoice.client_email,
      invoice.bu_name,
      invoice.payment_terms,
      invoice.status,
      invoice.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchHaystack.includes(query);
  });
}

export function summarizeInvoices(invoices: Invoice[]): InvoiceSummaryStats {
  const stats: InvoiceSummaryStats = {
    total: 0,
    paid: 0,
    outstanding: 0,
    overdue: 0,
    draft: 0,
    count: 0,
    paidCount: 0,
    outstandingCount: 0,
    overdueCount: 0,
    draftCount: 0,
  };

  for (const invoice of invoices) {
    const total = Number(invoice.total) || 0;
    stats.total += total;
    stats.count += 1;

    if (invoice.status === "paid") {
      stats.paid += total;
      stats.paidCount += 1;
    }

    if (invoice.status === "sent") {
      stats.outstanding += total;
      stats.outstandingCount += 1;
    }

    if (invoice.status === "overdue") {
      stats.overdue += total;
      stats.overdueCount += 1;
    }

    if (invoice.status === "draft") {
      stats.draft += total;
      stats.draftCount += 1;
    }
  }

  return stats;
}

export function buildBusinessUnitRevenue(
  invoices: Invoice[],
  businessUnits: Pick<BusinessUnit, "id" | "name" | "brand_color">[]
): BusinessUnitRevenueRow[] {
  const rows = new Map<string, BusinessUnitRevenueRow>();

  for (const businessUnit of businessUnits) {
    rows.set(businessUnit.id, {
      id: businessUnit.id,
      name: businessUnit.name,
      color: businessUnit.brand_color ?? "#000000",
      total: 0,
      count: 0,
    });
  }

  for (const invoice of invoices) {
    const row = rows.get(invoice.business_unit_id);
    if (!row) continue;

    row.total += Number(invoice.total) || 0;
    row.count += 1;
  }

  return Array.from(rows.values()).sort((left, right) => right.total - left.total);
}

export function hasActiveInvoiceFilters(filters: InvoiceFilterState): boolean {
  return Boolean(filters.query || filters.dateFrom || filters.dateTo || filters.status !== "all");
}
