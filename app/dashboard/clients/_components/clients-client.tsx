/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import type { BusinessUnit, Client } from "@/lib/types/invoice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/custom/table-pagination";
import { SearchInput } from "@/components/custom/search-input";
import { ClientActions } from "./client-actions";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, Invoice01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 15;

interface ClientsClientProps {
  clients: Client[];
  businessUnits: BusinessUnit[];
}

export function ClientsClient({ clients, businessUnits }: ClientsClientProps) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [businessUnitFilter, setBusinessUnitFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState<"all" | "manageable" | "view-only">("all");

  const businessUnitMap = useMemo(
    () => Object.fromEntries(businessUnits.map((businessUnit) => [businessUnit.id, businessUnit])),
    [businessUnits]
  );

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clients.filter((client) => {
      const businessUnit = businessUnitMap[client.business_unit_id];
      const canManage = businessUnit?.current_user_can_manage ?? false;

      if (businessUnitFilter !== "all" && client.business_unit_id !== businessUnitFilter) {
        return false;
      }

      if (accessFilter === "manageable" && !canManage) return false;
      if (accessFilter === "view-only" && canManage) return false;

      if (!query) return true;

      const haystack = [
        client.name,
        client.company,
        client.email,
        client.phone,
        client.address,
        businessUnit?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [clients, businessUnitFilter, accessFilter, search, businessUnitMap]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedClients = filteredClients.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_12rem_12rem] xl:items-end">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</p>
            <SearchInput
              value={search}
              onChange={(value) => {
                setPage(0);
                setSearch(value);
              }}
              placeholder="Search client, company, email..."
              isClearable
              delay={250}
              className="w-full h-11!"
            />
          </div>
          <div className="space-y-1.5 relative lg:top-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Business Unit</p>
            <Select value={businessUnitFilter} onValueChange={(value: any) => {
              setPage(0);
              setBusinessUnitFilter(value as any);
            }} items={businessUnits.map((businessUnit) => ({ value: businessUnit.id, label: businessUnit.name }))}>
              <SelectTrigger className="h-11! w-full">
                <SelectValue placeholder="All business units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="All business units">All business units</SelectItem>
                {businessUnits.map((businessUnit) => (
                  <SelectItem key={businessUnit.id} value={businessUnit.id} label={businessUnit.name}>
                    {businessUnit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 relative lg:top-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Access</p>
            <Select value={accessFilter} onValueChange={(value: string) => {
              setPage(0);
              setAccessFilter(value as "all" | "manageable" | "view-only");
            }} items={[
              { value: "all", label: "All access" },
              { value: "manageable", label: "Manageable" },
              { value: "view-only", label: "View only" },
            ]}>
              <SelectTrigger className="h-11! w-full">
                <SelectValue placeholder="All access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="All access">All access</SelectItem>
                <SelectItem value="manageable" label="Manageable">Manageable</SelectItem>
                <SelectItem value="view-only" label="View only">View only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredClients.length > 0 ? (
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
                const canManage = businessUnit?.current_user_can_manage ?? false;

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
                        {canManage ? (
                          <>
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
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs text-sky-700 border-sky-200 bg-sky-50">
                            View only
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
          <p className="font-medium text-sm">No clients match your filters</p>
          <p className="text-xs text-muted-foreground">Try a different business unit, access mode, or search term.</p>
        </div>
      )}

      {filteredClients.length > PAGE_SIZE && (
        <TablePagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filteredClients.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}