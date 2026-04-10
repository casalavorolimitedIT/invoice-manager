import { notFound } from "next/navigation";
import { getBusinessUnit } from "@/lib/supabase/business-units";
import { SiteHeader } from "@/components/site-header";
import { BusinessUnitForm } from "../../_components/business-unit-form";
import { updateBusinessUnit } from "../../actions";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBusinessUnitPage({ params }: Props) {
  const { id } = await params;
  const bu = await getBusinessUnit(id);
  if (!bu) notFound();

  // Bind the id so the form action receives it
  const boundAction = updateBusinessUnit.bind(null, id);

  return (
    <>
      <SiteHeader title={`Edit — ${bu.name}`} />
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
          <BusinessUnitForm action={boundAction} defaultValues={bu} />
        </div>
      </div>
    </>
  );
}
