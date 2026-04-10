"use client";

import { useMemo, useState } from "react";
import type { BusinessUnit, Client } from "@/lib/types/invoice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/custom/table-pagination";
import { ClientActions } from "./client-actions";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, Invoice01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

const PAGE_SIZE = 15;

interface ClientsClientProps {
  clients: Client[];
  businessUnits: BusinessUnit[];
}

export function ClientsClient({ clients, businessUnits }: ClientsClientProps) {
  const [page, setPage] = useState(0);

  const businessUnitMap = useMemo(
    () => Object.fromEntries(businessUnits.map((businessUnit) => [businessUnit.id, businessUnit])),
    [businessUnits]
  );

  const totalPages = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedClients = clients.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
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
            {paginatedClients.map((client) => {
              const businessUnit = businessUnitMap[client.business_unit_id];

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
                    {businessUnit && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-primary/40" />
                        {businessUnit.name}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs"
                        render={<Link href={`/dashboard/invoices/new?clientId=${client.id}`} />}
                      >
                        <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-3.5" />
                        Invoice
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs"
                        render={<Link href={`/dashboard/clients/${client.id}/edit`} />}
                      >
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

      {clients.length > PAGE_SIZE && (
        <TablePagination
          page={safePage}
          totalPages={totalPages}
          totalItems={clients.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}