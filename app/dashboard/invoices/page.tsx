import { getInvoices } from "@/lib/supabase/invoices";
import { getBusinessUnits } from "@/lib/supabase/business-units";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignCircleIcon,
  Invoice01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  formatCurrency,
  type InvoiceStatus,
} from "@/lib/types/invoice";
import { cn } from "@/lib/utils";
import { InvoicesInfoButton } from "./_components/invoices-info-button";

interface Props {
  searchParams: Promise<{ status?: string }>;
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

export default async function InvoicesPage({ searchParams }: Props) {
  const { status } = await searchParams;

  const [invoices, businessUnits] = await Promise.all([
    getInvoices(
      status && ["draft", "sent", "paid", "overdue"].includes(status)
        ? { status: status as InvoiceStatus }
        : undefined
    ),
    getBusinessUnits(),
  ]);

  const buMap = Object.fromEntries(businessUnits.map((bu) => [bu.id, bu]));

  const STATUS_FILTER_TABS: { label: string; value: string }[] = [
    { label: "All", value: "" },
    { label: "Draft", value: "draft" },
    { label: "Sent", value: "sent" },
    { label: "Paid", value: "paid" },
    { label: "Overdue", value: "overdue" },
  ];

  return (
    <>
      <SiteHeader
        title="Invoices"
        actions={
          <>
            <InvoicesInfoButton />
            <Button size="sm" render={<Link href="/dashboard/invoices/new" className="gap-1.5" />}>
              <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} className="size-4" />
              New Invoice
            </Button>
          </>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1 border-b pb-0">
          {STATUS_FILTER_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value ? `/dashboard/invoices?status=${tab.value}` : "/dashboard/invoices"}
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                (status ?? "") === tab.value
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
            <HugeiconsIcon
              icon={Invoice01Icon}
              strokeWidth={1.5}
              className="mx-auto size-10 text-muted-foreground"
            />
            <p className="font-medium text-sm">
              {status ? `No ${STATUS_LABELS[status as InvoiceStatus]?.toLowerCase()} invoices` : "No invoices yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              Create your first invoice to get started.
            </p>
            <Button size="sm" render={<Link href="/dashboard/invoices/new" />}>New Invoice</Button>
          </div>
        ) : (
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
                {invoices.map((inv) => {
                  const bu = buMap[inv.business_unit_id];
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="font-mono text-xs font-semibold hover:underline"
                        >
                          {inv.invoice_number}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(inv.issue_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="font-medium text-sm">{inv.client_name}</div>
                        {inv.client_company && (
                          <div className="text-xs text-muted-foreground">{inv.client_company}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {bu && (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-block w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: bu.brand_color ?? "#000" }}
                            />
                            <span className="text-sm">{bu.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            STATUS_COLORS[inv.status]
                          )}
                        >
                          {STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
