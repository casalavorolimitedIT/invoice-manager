import { notFound } from "next/navigation";
import { getClient } from "@/lib/supabase/clients";
import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { ClientForm } from "../../_components/client-form";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [client, businessUnits] = await Promise.all([
    getClient(id),
    getBusinessUnitScope().then((scope) => scope.businessUnits),
  ]);
  const canManageClient = businessUnits.some(
    (businessUnit) => businessUnit.id === client?.business_unit_id && businessUnit.current_user_can_manage
  );

  if (!client || !user || !canManageClient) notFound();

  return (
    <>
      <SiteHeader title={`Edit — ${client.name}`} />
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
          <ClientForm id={id} defaultValues={client} businessUnits={businessUnits} />
        </div>
      </div>
    </>
  );
}
