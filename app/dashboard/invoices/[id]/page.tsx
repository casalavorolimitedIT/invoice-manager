import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/supabase/invoices";
import { getBusinessUnit } from "@/lib/supabase/business-units";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { InvoiceTemplate } from "@/components/invoices/invoice-template";
import { ResponsiveInvoiceFrame } from "@/components/invoices/responsive-invoice-frame";
import { InvoiceActions } from "../_components/invoice-actions";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { STATUS_COLORS, STATUS_LABELS, formatCurrency, invoiceToPreviewPayload, type InvoiceStatus } from "@/lib/types/invoice";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

async function getStatusHistory(invoiceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoice_status_history")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("changed_at", { ascending: true });
  return data ?? [];
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [invoice, history] = await Promise.all([
    getInvoice(id),
    getStatusHistory(id),
  ]);

  if (!invoice) notFound();

  const businessUnit = await getBusinessUnit(invoice.business_unit_id);
  const canManageInvoice = Boolean(user && businessUnit?.current_user_can_manage);

  const payload = invoiceToPreviewPayload(invoice);
  const invoiceExportElementId = "invoice-document-export";
  const invoiceDesktopElementId = "invoice-document-desktop";
  const invoiceMobileElementId = "invoice-document-mobile";

  return (
    <>
      <SiteHeader title={invoice.invoice_number} />

      <div className="space-y-6 p-4 md:p-6 print:space-y-0 print:p-0">
        <div className="flex flex-col gap-4 print:hidden lg:flex-row lg:items-start lg:justify-between">
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to Invoices
          </Link>

          <div className="w-full lg:w-auto lg:max-w-[calc(100%-12rem)]">
            {canManageInvoice ? (
              <InvoiceActions
                id={invoice.id}
                invoiceNumber={invoice.invoice_number}
                currentStatus={invoice.status}
                exportElementIds={[
                  invoiceExportElementId,
                  invoiceDesktopElementId,
                  invoiceMobileElementId,
                ]}
              />
            ) : null}
          </div>
        </div>

        <div
          className="pointer-events-none fixed top-0 -z-10 w-205 -left-2499.75"
          aria-hidden="true"
        >
          <InvoiceTemplate payload={payload} variant="print" elementId={invoiceExportElementId} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_300px] print:block">
          {/* Invoice template */}
          <div className="min-w-0">
            <div className="hidden md:block">
              <InvoiceTemplate payload={payload} variant="print" elementId={invoiceDesktopElementId} />
            </div>
            <div className="md:hidden">
              <ResponsiveInvoiceFrame>
                <InvoiceTemplate payload={payload} variant="print" elementId={invoiceMobileElementId} />
              </ResponsiveInvoiceFrame>
            </div>
          </div>

          {/* Sidebar: summary + history */}
          <div className="space-y-4 print:hidden min-w-0">
            {/* Summary card */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span
                    className={cn(
                      "inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium",
                      STATUS_COLORS[invoice.status]
                    )}
                  >
                    {STATUS_LABELS[invoice.status]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </span>
                </div>
                {payload.paidAmount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid Amount</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(payload.paidAmount, invoice.currency)}
                    </span>
                  </div>
                ) : null}
                {payload.paidAmount > 0 || invoice.payment_terms === "Balance Due" ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance Due</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(payload.balanceDue, invoice.currency)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-mono text-xs">{invoice.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Business Unit</span>
                  <span className="max-w-40 text-right text-xs wrap-break-word">{invoice.bu_name}</span>
                </div>
              </div>
            </div>

            {/* Status history */}
            {history.length > 0 && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold">History</h3>
                <ol className="relative border-l border-muted ml-2 space-y-4">
                  {history.map((entry) => (
                    <li key={entry.id} className="ml-4">
                      <span className="absolute -left-1.5 mt-1 flex size-3 items-center justify-center rounded-full border bg-background" />
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(entry.changed_at)}
                      </div>
                      <div className="text-sm mt-0.5">
                        {entry.from_status ? (
                          <>
                            <span
                              className={cn(
                                "inline-flex items-center whitespace-nowrap px-1.5 py-0.5 rounded text-xs font-medium",
                                STATUS_COLORS[entry.from_status as InvoiceStatus]
                              )}
                            >
                              {STATUS_LABELS[entry.from_status as InvoiceStatus]}
                            </span>
                            {" → "}
                          </>
                        ) : (
                          "Created as "
                        )}
                        <span
                          className={cn(
                            "inline-flex items-center whitespace-nowrap px-1.5 py-0.5 rounded text-xs font-medium",
                            STATUS_COLORS[entry.to_status as InvoiceStatus]
                          )}
                        >
                          {STATUS_LABELS[entry.to_status as InvoiceStatus]}
                        </span>
                      </div>
                      {entry.notes && (
                        <div className="mt-0.5 text-xs text-muted-foreground wrap-break-word">{entry.notes}</div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
