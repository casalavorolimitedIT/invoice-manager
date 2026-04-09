import { getBusinessUnits } from "@/lib/supabase/business-units";
import { SiteHeader } from "@/components/site-header";
import { ClientForm } from "../_components/client-form";
import { createClient } from "../actions";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { redirect } from "next/navigation";

export default async function NewClientPage() {
  const businessUnits = await getBusinessUnits();

  if (businessUnits.length === 0) {
    redirect("/dashboard/business-units/new");
  }

  return (
    <>
      <SiteHeader title="New Client" />
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to Clients
          </Link>
        </div>
        <ClientForm action={createClient} businessUnits={businessUnits} />
      </div>
    </>
  );
}
