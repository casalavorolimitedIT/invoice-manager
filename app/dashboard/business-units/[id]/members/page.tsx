import { notFound } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { SiteHeader } from "@/components/site-header";
import { getOwnedBusinessUnit } from "@/lib/supabase/business-units";
import { getBusinessUnitMembers } from "@/lib/supabase/business-unit-members";
import { BusinessUnitMembersPanel } from "../../_components/business-unit-members-panel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BusinessUnitMembersPage({ params }: Props) {
  const { id } = await params;
  const [businessUnit, members] = await Promise.all([
    getOwnedBusinessUnit(id),
    getBusinessUnitMembers(id),
  ]);

  if (!businessUnit) {
    notFound();
  }

  return (
    <>
      <SiteHeader title={`Access — ${businessUnit.name}`} />
      <div className="flex w-full flex-col items-center justify-center p-4 md:p-6">
        <div className="mb-6 w-full max-w-4xl">
          <Link
            href="/dashboard/business-units"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to Business Units
          </Link>
        </div>
        <div className="w-full max-w-4xl">
          <BusinessUnitMembersPanel
            businessUnitId={businessUnit.id}
            businessUnitName={businessUnit.name}
            members={members}
          />
        </div>
      </div>
    </>
  );
}