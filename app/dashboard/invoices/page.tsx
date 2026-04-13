import { getInvoices } from "@/lib/supabase/invoices";
import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignCircleIcon,
  Invoice01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import {
  STATUS_LABELS,
  type InvoiceStatus,
} from "@/lib/types/invoice";
import { cn } from "@/lib/utils";
import { InvoicesInfoButton } from "./_components/invoices-info-button";
import { InvoicesClient } from "./_components/invoices-client";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function InvoicesPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const { businessUnits, activeBusinessUnitId } = await getBusinessUnitScope();
  const canCreateInvoice = businessUnits.some((businessUnit) => businessUnit.current_user_can_manage);

  const invoices = await getInvoices(
    {
      businessUnitId: activeBusinessUnitId ?? undefined,
      status: status && ["draft", "sent", "paid", "overdue"].includes(status)
        ? (status as InvoiceStatus)
        : undefined,
    }
  );
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
            {canCreateInvoice ? (
              <Button size="sm" render={<Link href="/dashboard/invoices/new" className="gap-1.5" />}>
                <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} className="size-4" />
                New Invoice
              </Button>
            ) : null}
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
            {canCreateInvoice ? (
              <Button size="sm" render={<Link href="/dashboard/invoices/new" />}>New Invoice</Button>
            ) : null}
          </div>
        ) : (
          <InvoicesClient invoices={invoices} businessUnits={businessUnits} />
        )}
      </div>
    </>
  );
}
