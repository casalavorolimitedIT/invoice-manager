"use client";

import { useMemo, useState } from "react";
import type { BusinessUnit, Invoice, InvoiceStatus } from "@/lib/types/invoice";
import { STATUS_COLORS, STATUS_LABELS, formatCurrency } from "@/lib/types/invoice";
import { TablePagination } from "@/components/custom/table-pagination";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { InvoiceActivityFilters } from "@/app/dashboard/_components/invoice-activity-filters";
import { filterInvoices, type InvoiceFilterState } from "@/lib/invoice-reporting";

const PAGE_SIZE = 15;

interface InvoicesClientProps {
  invoices: Invoice[];
  businessUnits: BusinessUnit[];
  initialStatus?: InvoiceStatus | "all";
}

function formatDate(iso: string) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function InvoicesClient({ invoices, businessUnits, initialStatus = "all" }: InvoicesClientProps) {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<InvoiceFilterState>({
    query: "",
    status: initialStatus,
    dateFrom: "",
    dateTo: "",
  });

  const businessUnitMap = useMemo(
    () => Object.fromEntries(businessUnits.map((businessUnit) => [businessUnit.id, businessUnit])),
    [businessUnits]
  );

  const filteredInvoices = useMemo(() => filterInvoices(invoices, filters), [invoices, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedInvoices = filteredInvoices.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <InvoiceActivityFilters
        query={filters.query}
        status={filters.status}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        resultLabel={`${filteredInvoices.length} matching invoices`}
        onQueryChange={(value) => {
          setPage(0);
          setFilters((current) => ({ ...current, query: value }));
        }}
        onStatusChange={(value) => {
          setPage(0);
          setFilters((current) => ({ ...current, status: value }));
        }}
        onDateFromChange={(value) => {
          setPage(0);
          setFilters((current) => ({
            ...current,
            dateFrom: value,
            dateTo: current.dateTo && value && current.dateTo < value ? value : current.dateTo,
          }));
        }}
        onDateToChange={(value) => {
          setPage(0);
          setFilters((current) => ({ ...current, dateTo: value }));
        }}
        onReset={() => {
          setPage(0);
          setFilters({ query: "", status: "all", dateFrom: "", dateTo: "" });
        }}
      />

      {filteredInvoices.length > 0 ? (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Business Unit</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Due</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedInvoices.map((invoice) => {
                const businessUnit = businessUnitMap[invoice.business_unit_id];

                return (
                  <tr key={invoice.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="font-mono text-xs font-semibold underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(invoice.issue_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="font-medium text-sm">{invoice.client_name}</div>
                      {invoice.client_company && (
                        <div className="text-xs text-muted-foreground">{invoice.client_company}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {businessUnit && (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-primary/40" />
                          <span className="text-sm">{businessUnit.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-muted-foreground">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          STATUS_COLORS[invoice.status]
                        )}
                      >
                        {STATUS_LABELS[invoice.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
          <p className="font-medium text-sm">No invoices match your filters</p>
          <p className="text-xs text-muted-foreground">Try a different status, date range, or search term.</p>
        </div>
      )}

      {filteredInvoices.length > PAGE_SIZE && (
        <TablePagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filteredInvoices.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}