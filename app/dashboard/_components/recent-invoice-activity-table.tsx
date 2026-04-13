"use client";

import { useState } from "react";
import Link from "next/link";
import { TablePagination } from "@/components/custom/table-pagination";
import { cn } from "@/lib/utils";
import { formatCurrency, STATUS_COLORS, STATUS_LABELS } from "@/lib/types/invoice";

const PAGE_SIZE = 6;

type RecentInvoiceRow = {
  id: string;
  invoice_number: string;
  client_name: string;
  status: keyof typeof STATUS_LABELS;
  total: number;
  currency: string;
  created_at: string;
};

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function RecentInvoiceActivityTable({
  invoices,
}: {
  invoices: RecentInvoiceRow[];
}) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const rows = invoices.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  if (invoices.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-zinc-200 bg-white/70 p-10 text-center">
        <p className="text-sm font-medium text-zinc-900">No invoices yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create your first invoice to start tracking activity here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-[24px] border border-white/80 bg-white/88 shadow-[0_16px_40px_rgba(24,18,9,0.04)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/70">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice #</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
              <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Status</th>
              <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Created</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((invoice) => (
              <tr key={invoice.id} className="transition-colors hover:bg-zinc-50/80">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/invoices/${invoice.id}`}
                    className="font-mono text-xs font-semibold text-zinc-900 underline-offset-4 transition-colors hover:text-primary hover:underline"
                  >
                    {invoice.invoice_number}
                  </Link>
                </td>
                <td className="max-w-44 truncate px-4 py-3 text-muted-foreground">
                  {invoice.client_name}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                      STATUS_COLORS[invoice.status],
                    )}
                  >
                    {STATUS_LABELS[invoice.status]}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                  {formatDateLabel(invoice.created_at)}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-950">
                  {formatCurrency(invoice.total, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invoices.length > PAGE_SIZE ? (
        <TablePagination
          page={safePage}
          totalPages={totalPages}
          totalItems={invoices.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}