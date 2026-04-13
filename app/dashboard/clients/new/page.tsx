import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { SiteHeader } from "@/components/site-header";
import { ClientForm } from "../_components/client-form";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { redirect } from "next/navigation";

export default async function NewClientPage() {
  const { businessUnits, activeBusinessUnitId } = await getBusinessUnitScope();
  const writableBusinessUnits = businessUnits.filter((businessUnit) => businessUnit.current_user_can_manage);
  const writableActiveBusinessUnitId = writableBusinessUnits.some(
    (businessUnit) => businessUnit.id === activeBusinessUnitId
  )
    ? activeBusinessUnitId
    : writableBusinessUnits[0]?.id;

  if (businessUnits.length === 0) {
    redirect("/dashboard/business-units/new");
  }

  if (writableBusinessUnits.length === 0) {
    redirect("/dashboard/clients");
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
            businessUnits={writableBusinessUnits}
            initialBusinessUnitId={writableActiveBusinessUnitId ?? undefined}
          />
        </div>
      </div>
    </>
  );
}
