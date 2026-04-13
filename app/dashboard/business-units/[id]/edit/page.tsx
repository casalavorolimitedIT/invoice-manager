import { notFound } from "next/navigation";
import { getOwnedBusinessUnit } from "@/lib/supabase/business-units";
import { getBusinessUnitMembers } from "@/lib/supabase/business-unit-members";
import { SiteHeader } from "@/components/site-header";
import { BusinessUnitForm } from "../../_components/business-unit-form";
import { BusinessUnitMembersPanel } from "../../_components/business-unit-members-panel";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBusinessUnitPage({ params }: Props) {
  const { id } = await params;
  const [bu, members] = await Promise.all([
    getOwnedBusinessUnit(id),
    getBusinessUnitMembers(id),
  ]);
  if (!bu) notFound();

  return (
    <>
      <SiteHeader
        title={`Edit — ${bu.name}`}
        actions={
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/dashboard/business-units/${bu.id}/members`} className="gap-1.5" />}
          >
            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4" />
            Manage Access
          </Button>
        }
      />
      <div className="p-4 md:p-6 w-full flex flex-col items-center justify-center">
        <div className="mb-6 w-full max-w-4xl">
          <Link
            href="/dashboard/business-units"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to Business Units
          </Link>
        </div>
        <div className="w-full max-w-4xl">
          <BusinessUnitForm id={bu.id} defaultValues={bu} />
        </div>
        {/* <div className="mt-8 w-full max-w-4xl">
          <BusinessUnitMembersPanel businessUnitId={bu.id} businessUnitName={bu.name} members={members} />
        </div> */}
      </div>
    </>
  );
}
