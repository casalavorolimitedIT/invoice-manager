import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { getClients } from "@/lib/supabase/clients";
import { InvoiceBuilder } from "@/components/invoices/invoice-builder";
import { SiteHeader } from "@/components/site-header";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { redirect } from "next/navigation";

interface NewInvoicePageProps {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  const { clientId } = await searchParams;
  const { businessUnits, activeBusinessUnitId } = await getBusinessUnitScope();
  const clients = await getClients();
  const writableBusinessUnits = businessUnits.filter((businessUnit) => businessUnit.current_user_can_manage);
  const writableBusinessUnitIds = new Set(writableBusinessUnits.map((businessUnit) => businessUnit.id));
  const writableClients = clients.filter((client) => writableBusinessUnitIds.has(client.business_unit_id));
  const initialClient = clientId
    ? writableClients.find((client) => client.id === clientId)
    : undefined;
  const writableActiveBusinessUnitId = writableBusinessUnits.some(
    (businessUnit) => businessUnit.id === activeBusinessUnitId
  )
    ? activeBusinessUnitId
    : writableBusinessUnits[0]?.id;
  const initialBusinessUnitId = initialClient?.business_unit_id ?? writableActiveBusinessUnitId ?? undefined;

  if (businessUnits.length === 0) {
    redirect("/dashboard/business-units/new");
  }

  if (writableBusinessUnits.length === 0) {
    redirect("/dashboard/invoices");
  }

  return (
    <>
      <SiteHeader title="New Invoice" />
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to Invoices
          </Link>
        </div>
        <InvoiceBuilder
          businessUnits={writableBusinessUnits}
          allClients={writableClients}
          initialBusinessUnitId={initialBusinessUnitId}
          initialClientId={initialClient?.id}
        />
      </div>
    </>
  );
}
