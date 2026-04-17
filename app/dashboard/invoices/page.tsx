import { getInvoices } from "@/lib/supabase/invoices";
import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignCircleIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { type InvoiceStatus } from "@/lib/types/invoice";
import { InvoicesInfoButton } from "./_components/invoices-info-button";
import { InvoicesClient } from "./_components/invoices-client";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function InvoicesPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const { businessUnits, activeBusinessUnitId } = await getBusinessUnitScope();
  const canCreateInvoice = businessUnits.some((businessUnit) => businessUnit.current_user_can_manage);

  const invoices = await getInvoices({ businessUnitId: activeBusinessUnitId ?? undefined });
  const initialStatus =
    status && ["draft", "sent", "paid", "overdue"].includes(status)
      ? (status as InvoiceStatus)
      : "all";

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
        <InvoicesClient invoices={invoices} businessUnits={businessUnits} initialStatus={initialStatus} />
      </div>
    </>
  );
}
