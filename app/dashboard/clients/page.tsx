import { getClients } from "@/lib/supabase/clients";
import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  PlusSignCircleIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { ClientsInfoButton } from "./_components/clients-info-button";
import { ClientsClient } from "./_components/clients-client";

export default async function ClientsPage() {
  const { businessUnits, activeBusinessUnitId } = await getBusinessUnitScope();
  const clients = await getClients(activeBusinessUnitId ?? undefined);

  return (
    <>
      <SiteHeader
        title="Clients"
        actions={
          <>
            <ClientsInfoButton />
            <Button size="sm" render={<Link href="/dashboard/clients/new" className="gap-1.5" />}>
              <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} className="size-4" />
              New Client
            </Button>
          </>
        }
      />

      <div className="p-4 md:p-6">
        {clients.length === 0 ? (
          <EmptyState />
        ) : (
          <ClientsClient clients={clients} businessUnits={businessUnits} />
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="rounded-full bg-muted p-4">
        <HugeiconsIcon icon={UserGroupIcon} strokeWidth={1.5} className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="font-semibold">No clients yet</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Add clients to your directory so you can quickly select them when creating invoices.
        </p>
      </div>
      <Button render={<Link href="/dashboard/clients/new" className="gap-1.5" />}>
        <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} className="size-4" />
        Add Client
      </Button>
    </div>
  );
}
