import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignCircleIcon, User02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { getGuests } from "@/lib/supabase/guests";
import { GuestsClient } from "./_components/guests-client";

export default async function GuestListPage() {
  const { businessUnits, activeBusinessUnitId } = await getBusinessUnitScope();
  const guests = await getGuests();
  const canCreateGuest = businessUnits.some((businessUnit) => businessUnit.current_user_can_manage);

  return (
    <>
      <SiteHeader
        title="Guest List"
        actions={
          canCreateGuest ? (
            <Button size="sm" render={<Link href="/dashboard/guest-list/new" className="gap-1.5" />}>
              <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} className="size-4" />
              New Guest
            </Button>
          ) : null
        }
      />

      <div className="p-4 md:p-6">
        {guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <HugeiconsIcon icon={User02Icon} strokeWidth={1.5} className="size-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">No guests yet</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Capture walk-in guests or create guest profiles manually from the dashboard.
              </p>
            </div>
            {canCreateGuest ? (
              <Button render={<Link href="/dashboard/guest-list/new" className="gap-1.5" />}>
                <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} className="size-4" />
                Add Guest
              </Button>
            ) : null}
          </div>
        ) : (
          <GuestsClient guests={guests} businessUnits={businessUnits} initialBusinessUnitFilter={activeBusinessUnitId ?? "all"} />
        )}
      </div>
    </>
  );
}