"use client";

import { useState } from "react";
import type { InvoiceStatus } from "@/lib/types/invoice";
import { formatCurrency, STATUS_COLORS, STATUS_LABELS } from "@/lib/types/invoice";
import { TablePagination } from "@/components/custom/table-pagination";
import { cn } from "@/lib/utils";
import Link from "next/link";

const BUSINESS_UNIT_PAGE_SIZE = 8;
const INVOICE_PAGE_SIZE = 10;

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
}: ReportsPaginatedSectionsProps) {
  const [businessUnitPage, setBusinessUnitPage] = useState(0);

  const businessUnitTotalPages = Math.max(1, Math.ceil(businessUnits.length / BUSINESS_UNIT_PAGE_SIZE));
  const safeBusinessUnitPage = Math.min(businessUnitPage, businessUnitTotalPages - 1);
  const paginatedBusinessUnits = businessUnits.slice(
    safeBusinessUnitPage * BUSINESS_UNIT_PAGE_SIZE,
    (safeBusinessUnitPage + 1) * BUSINESS_UNIT_PAGE_SIZE
  );

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">By Business Unit</h3>
        <p className="text-xs text-muted-foreground">Total invoiced per unit (all statuses)</p>
      </div>

      {businessUnits.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No business units yet.</p>
      ) : (
        <>
          <div>
            {paginatedBusinessUnits.map((businessUnit) => (
              <div
                key={businessUnit.name}
                className="flex items-center gap-4 py-3 border-b last:border-0"
              >
                <div className="w-2 h-8 rounded-full shrink-0 bg-primary/40" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{businessUnit.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {businessUnit.count} {businessUnit.count === 1 ? "invoice" : "invoices"}
                  </div>
                </div>
                <div className="text-sm font-bold tabular-nums text-right">
                  {formatCurrency(businessUnit.total, currency)}
                </div>
              </div>
            ))}
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

export function ReportsRecentInvoicesSection({ recentInvoices }: ReportsRecentInvoicesSectionProps) {
  const [invoicePage, setInvoicePage] = useState(0);

  const invoiceTotalPages = Math.max(1, Math.ceil(recentInvoices.length / INVOICE_PAGE_SIZE));
  const safeInvoicePage = Math.min(invoicePage, invoiceTotalPages - 1);
  const paginatedInvoices = recentInvoices.slice(
    safeInvoicePage * INVOICE_PAGE_SIZE,
    (safeInvoicePage + 1) * INVOICE_PAGE_SIZE
  );

  if (recentInvoices.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">Recent Invoices</h3>
        <p className="text-xs text-muted-foreground">Latest invoices across all units</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left pb-2 font-medium text-muted-foreground">Invoice #</th>
              <th className="text-left pb-2 font-medium text-muted-foreground">Client</th>
              <th className="text-left pb-2 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
              <th className="text-right pb-2 font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedInvoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5">
                  <Link
                    href={`/dashboard/invoices/${invoice.id}`}
                    className="font-mono text-xs font-semibold underline"
                  >
                    {invoice.invoice_number}
                  </Link>
                </td>
                <td className="max-w-35 truncate py-2.5 text-muted-foreground">
                  {invoice.client_name}
                </td>
                <td className="py-2.5 hidden sm:table-cell">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      STATUS_COLORS[invoice.status]
                    )}
                  >
                    {STATUS_LABELS[invoice.status]}
                  </span>
                </td>
                <td className="py-2.5 text-right font-semibold tabular-nums">
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