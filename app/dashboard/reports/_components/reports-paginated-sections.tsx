"use client";

import { useState } from "react";
import type { InvoiceStatus } from "@/lib/types/invoice";
import { formatCurrency, STATUS_COLORS, STATUS_LABELS } from "@/lib/types/invoice";
import { TablePagination } from "@/components/custom/table-pagination";
import { cn } from "@/lib/utils";
import Link from "next/link";

const BUSINESS_UNIT_PAGE_SIZE = 8;
const INVOICE_PAGE_SIZE = 10;
const BUSINESS_UNIT_BAR_CLASSES = [
  "bg-primary",
  "bg-orange-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-blue-400",
  "bg-rose-400",
  "bg-violet-400",
  "bg-zinc-400",
];

function getMeterWidthClass(value: number, hasValue = value > 0) {
  if (!hasValue || value <= 0) return "w-0";
  if (value <= 20) return "w-1/5 min-w-6";
  if (value <= 40) return "w-2/5";
  if (value <= 60) return "w-3/5";
  if (value <= 80) return "w-4/5";
  return "w-full";
}

interface BusinessUnitRevenueRow {
  name: string;
  color: string;
  total: number;
  count: number;
}

interface RecentInvoiceRow {
  id: string;
  invoice_number: string;
  client_name: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
}

interface ReportsPaginatedSectionsProps {
  businessUnits: BusinessUnitRevenueRow[];
  currency: string;
}

export function ReportsBusinessUnitsSection({
  businessUnits,
  currency,
  isOpen = false,
}: ReportsPaginatedSectionsProps & { isOpen?: boolean }) {
  const [businessUnitPage, setBusinessUnitPage] = useState(0);

  const businessUnitTotalPages = Math.max(1, Math.ceil(businessUnits.length / BUSINESS_UNIT_PAGE_SIZE));
  const safeBusinessUnitPage = Math.min(businessUnitPage, businessUnitTotalPages - 1);
  const paginatedBusinessUnits = businessUnits.slice(
    safeBusinessUnitPage * BUSINESS_UNIT_PAGE_SIZE,
    (safeBusinessUnitPage + 1) * BUSINESS_UNIT_PAGE_SIZE
  );

  return (
    <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,248,242,0.88)_100%)] p-5 shadow-[0_22px_70px_rgba(24,18,9,0.06)] md:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-zinc-950">Business units</h3>
          <p className="mt-1 text-sm text-zinc-600">Revenue distribution across your units.</p>
        </div>
        <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
          Ranked by total invoiced
        </div>
      </div>

      {businessUnits.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-zinc-200 bg-white/70 py-10 text-center text-sm text-muted-foreground">
          No business units yet.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedBusinessUnits.map((businessUnit, index) => {
              const barClass =
                BUSINESS_UNIT_BAR_CLASSES[index % BUSINESS_UNIT_BAR_CLASSES.length];
              const relativeShare = businessUnits[0]?.total
                ? (businessUnit.total / businessUnits[0].total) * 100
                : 0;

              return (
              <div
                key={businessUnit.name}
                className="rounded-[22px] border border-white/80 bg-white/88 p-4 shadow-[0_16px_40px_rgba(24,18,9,0.05)]"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn("h-11 w-2 shrink-0 rounded-full", barClass)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-zinc-900">{businessUnit.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {businessUnit.count} {businessUnit.count === 1 ? "invoice" : "invoices"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold tabular-nums text-zinc-950 ${isOpen ? "blur-lg" : ""}`}>
                      {formatCurrency(businessUnit.total, currency)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      barClass,
                      getMeterWidthClass(relativeShare, businessUnit.total > 0),
                    )}
                  />
                </div>
              </div>
              );
            })}
          </div>

          {businessUnits.length > BUSINESS_UNIT_PAGE_SIZE && (
            <TablePagination
              page={safeBusinessUnitPage}
              totalPages={businessUnitTotalPages}
              totalItems={businessUnits.length}
              pageSize={BUSINESS_UNIT_PAGE_SIZE}
              onPageChange={setBusinessUnitPage}
            />
          )}
        </>
      )}
    </div>
  );
}

interface ReportsRecentInvoicesSectionProps {
  recentInvoices: RecentInvoiceRow[];
}

export function ReportsRecentInvoicesSection({ recentInvoices, isOpen = false }: ReportsRecentInvoicesSectionProps & { isOpen?: boolean }) {
  const [invoicePage, setInvoicePage] = useState(0);

  const invoiceTotalPages = Math.max(1, Math.ceil(recentInvoices.length / INVOICE_PAGE_SIZE));
  const safeInvoicePage = Math.min(invoicePage, invoiceTotalPages - 1);
  const paginatedInvoices = recentInvoices.slice(
    safeInvoicePage * INVOICE_PAGE_SIZE,
    (safeInvoicePage + 1) * INVOICE_PAGE_SIZE
  );

  if (recentInvoices.length === 0) return null;

  return (
    <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(252,249,246,0.9)_100%)] p-5 shadow-[0_22px_70px_rgba(24,18,9,0.06)] md:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-zinc-950">Recent invoices</h3>
          <p className="mt-1 text-sm text-zinc-600">Latest activity across the current scope.</p>
        </div>
        <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
          {recentInvoices.length} records
        </div>
      </div>

      <div className="overflow-x-auto rounded-[24px] border border-white/80 bg-white/88 shadow-[0_16px_40px_rgba(24,18,9,0.04)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/70">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice #</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
              <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedInvoices.map((invoice) => (
              <tr key={invoice.id} className="transition-colors hover:bg-zinc-50/80">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/invoices/${invoice.id}`}
                    className="font-mono text-xs font-semibold text-zinc-900 underline-offset-4 transition-colors hover:text-primary underline"
                  >
                    {invoice.invoice_number}
                  </Link>
                </td>
                <td className="max-w-35 truncate px-4 py-3 text-muted-foreground">
                  {invoice.client_name}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                      STATUS_COLORS[invoice.status]
                    )}
                  >
                    {STATUS_LABELS[invoice.status]}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-semibold tabular-nums text-zinc-950 ${isOpen ? "blur-lg" : ""}`}>
                  {formatCurrency(invoice.total, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {recentInvoices.length > INVOICE_PAGE_SIZE && (
        <TablePagination
          page={safeInvoicePage}
          totalPages={invoiceTotalPages}
          totalItems={recentInvoices.length}
          pageSize={INVOICE_PAGE_SIZE}
          onPageChange={setInvoicePage}
        />
      )}
    </div>
  );
}