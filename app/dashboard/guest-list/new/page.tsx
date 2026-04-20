import Link from "next/link";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { SiteHeader } from "@/components/site-header";
import { GuestForm } from "@/components/guests/guest-form";
import { getBusinessUnitScope } from "@/lib/business-unit-scope";

export default async function NewGuestPage() {
  const { businessUnits, activeBusinessUnitId } = await getBusinessUnitScope();
  const writableBusinessUnits = businessUnits.filter((businessUnit) => businessUnit.current_user_can_manage);
  const writableActiveBusinessUnitId = writableBusinessUnits.some((businessUnit) => businessUnit.id === activeBusinessUnitId)
    ? activeBusinessUnitId
    : writableBusinessUnits[0]?.id;

  if (businessUnits.length === 0) {
    redirect("/dashboard/business-units/new");
  }

  if (writableBusinessUnits.length === 0) {
    redirect("/dashboard/guest-list");
  }

  return (
    <>
      <SiteHeader title="New Guest" />
      <div className="p-4 md:p-6 flex flex-col justify-center items-center">
        <div className="mb-6 max-w-4xl w-full">
          <Link href="/dashboard/guest-list" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to Guest List
          </Link>
        </div>
        <div className="max-w-4xl w-full">
          <GuestForm mode="dashboard" businessUnits={writableBusinessUnits} initialBusinessUnitId={writableActiveBusinessUnitId ?? undefined} />
        </div>
      </div>
    </>
  );
}