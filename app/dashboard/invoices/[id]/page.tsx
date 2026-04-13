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
import type { InvoicePreviewPayload, InvoiceStatus } from "@/lib/types/invoice";
import { STATUS_COLORS, STATUS_LABELS, formatCurrency } from "@/lib/types/invoice";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function invoiceToPayload(inv: NonNullable<Awaited<ReturnType<typeof getInvoice>>>): InvoicePreviewPayload {
  return {
    invoiceNumber: inv.invoice_number,
    issueDate: inv.issue_date,
    dueDate: inv.due_date,
    status: inv.status,
    business: {
      name: inv.bu_name,
      address: inv.bu_address,
      city: null,
      state: null,
      country: null,
      phone: inv.bu_phone,
      email: inv.bu_email,
      taxId: inv.bu_tax_id,
      bankName: inv.bu_bank_name,
      bankAccount: inv.bu_bank_account_number,
      bankSwift: inv.bu_bank_swift,
      bankIban: inv.bu_bank_iban,
      logoUrl: inv.bu_logo_url,
      brandColor: inv.bu_brand_color ?? "#000000",
      taxLabel: inv.bu_tax_label ?? "Tax",
      footerLegalText: inv.bu_footer_legal_text,
    },
    client: {
      name: inv.client_name,
      company: inv.client_company,
      email: inv.client_email,
      address: inv.client_address,
    },
    items: (inv.items ?? []).map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      total: Number(item.total),
    })),
    subtotal: Number(inv.subtotal),
    discountType: inv.discount_type,
    discountValue: Number(inv.discount_value),
    discountAmount: Number(inv.discount_amount),
    taxRate: Number(inv.tax_rate),
    taxLabel: inv.tax_label,
    taxAmount: Number(inv.tax_amount),
    total: Number(inv.total),
    currency: inv.currency,
    notes: inv.notes,
    paymentTerms: inv.payment_terms,
  };
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

  const payload = invoiceToPayload(invoice);
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
