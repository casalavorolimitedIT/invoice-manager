import { notFound } from "next/navigation";
import { getClient } from "@/lib/supabase/clients";
import { getBusinessUnits } from "@/lib/supabase/business-units";
import { SiteHeader } from "@/components/site-header";
import { ClientForm } from "../../_components/client-form";
import { updateClient } from "../../actions";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params;
  const [client, businessUnits] = await Promise.all([
    getClient(id),
    getBusinessUnits(),
  ]);
  if (!client) notFound();

  const boundAction = updateClient.bind(null, id);

  return (
    <>
      <SiteHeader title={`Edit — ${client.name}`} />
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
        <ClientForm action={boundAction} defaultValues={client} businessUnits={businessUnits} />
      </div>
    </>
  );
}
