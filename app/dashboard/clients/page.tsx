import { getClients } from "@/lib/supabase/clients";
import { getBusinessUnits } from "@/lib/supabase/business-units";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  PlusSignCircleIcon,
  Edit01Icon,
  Invoice01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { ClientsInfoButton } from "./_components/clients-info-button";
import { ClientActions } from "./_components/client-actions";

export default async function ClientsPage() {
  const [clients, businessUnits] = await Promise.all([
    getClients(),
    getBusinessUnits(),
  ]);

  const buMap = Object.fromEntries(businessUnits.map((bu) => [bu.id, bu]));

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
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Business Unit</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((client) => {
                  const bu = buMap[client.business_unit_id];
                  return (
                    <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{client.name}</div>
                        {client.company && (
                          <div className="text-xs text-muted-foreground">{client.company}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {client.email && <div>{client.email}</div>}
                          {client.phone && <div>{client.phone}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {bu && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ backgroundColor: bu.brand_color ?? "#000" }}
                            />
                            {bu.name}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" render={<Link href={`/dashboard/invoices/new?clientId=${client.id}`} />}>
                            <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-3.5" />
                            Invoice
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" render={<Link href={`/dashboard/clients/${client.id}/edit`} />}>
                            <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} className="size-3.5" />
                            Edit
                          </Button>
                          <ClientActions id={client.id} name={client.name} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
