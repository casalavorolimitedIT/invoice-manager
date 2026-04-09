import { getAllBusinessUnits } from "@/lib/supabase/business-units";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignCircleIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { BusinessUnitsInfoButton } from "./_components/business-units-info-button";
import { BusinessUnitsClient } from "./_components/business-units-client";

export default async function BusinessUnitsPage() {
  const units = await getAllBusinessUnits();

  return (
    <>
      <SiteHeader
        title="Business Units"
        actions={
          <>
            <BusinessUnitsInfoButton />
            <Button size="sm" render={<Link href="/dashboard/business-units/new" className="gap-1.5" />}>
              <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} className="size-4" />
              New Unit
            </Button>
          </>
        }
      />

      <div className="p-4 md:p-6">
        <BusinessUnitsClient units={units} />
      </div>
    </>
  );
}
