import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { SiteHeader } from "@/components/site-header";
import { ClientForm } from "../_components/client-form";
import { createClient } from "../actions";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { redirect } from "next/navigation";

export default async function NewClientPage() {
  const { businessUnits, activeBusinessUnitId } = await getBusinessUnitScope();

  if (businessUnits.length === 0) {
    redirect("/dashboard/business-units/new");
  }

  return (
    <>
      <SiteHeader title="New Client" />
      <div className="p-4 md:p-6 flex flex-col justify-center items-center">
        <div className="mb-6 max-w-4xl w-full">
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to Clients
          </Link>
        </div>
        <div className="max-w-4xl w-full">
          <ClientForm
          action={createClient}
          businessUnits={businessUnits}
          initialBusinessUnitId={activeBusinessUnitId ?? undefined}
        />
        </div>
      </div>
    </>
  );
}
