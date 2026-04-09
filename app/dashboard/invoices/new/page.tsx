import { getBusinessUnits } from "@/lib/supabase/business-units";
import { getClients } from "@/lib/supabase/clients";
import { InvoiceBuilder } from "@/components/invoices/invoice-builder";
import { SiteHeader } from "@/components/site-header";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewInvoicePage() {
  const [businessUnits, clients] = await Promise.all([
    getBusinessUnits(),
    getClients(),
  ]);

  if (businessUnits.length === 0) {
    redirect("/dashboard/business-units/new");
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
        <InvoiceBuilder businessUnits={businessUnits} allClients={clients} />
      </div>
    </>
  );
}
