import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { SiteHeader } from "@/components/site-header";
import { GuestForm } from "@/components/guests/guest-form";
import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { getGuest } from "@/lib/supabase/guests";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditGuestPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [guest, scope] = await Promise.all([getGuest(id), getBusinessUnitScope()]);
  const canManageGuest = scope.businessUnits.some(
    (businessUnit) => businessUnit.id === guest?.business_unit_id && businessUnit.current_user_can_manage
  );

  if (!guest || !user || !canManageGuest) notFound();

  return (
    <>
      <SiteHeader title={`Edit — ${guest.first_name} ${guest.last_name}`} />
      <div className="p-4 md:p-6 flex flex-col justify-center items-center">
        <div className="mb-6 max-w-4xl w-full">
          <Link href="/dashboard/guest-list" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to Guest List
          </Link>
        </div>
        <div className="max-w-4xl w-full">
          <GuestForm mode="dashboard" id={id} defaultValues={guest} businessUnits={scope.businessUnits} />
        </div>
      </div>
    </>
  );
}