"use client";

import { useMemo, useState } from "react";
import type { BusinessUnit } from "@/lib/types/invoice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/custom/search-input";
import { TablePagination } from "@/components/custom/table-pagination";
import { BusinessUnitActions } from "./business-unit-actions";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building01Icon,
  PlusSignCircleIcon,
  Edit01Icon,
  GridViewIcon,
  GridTableIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";

const CARD_PAGE_SIZE = 12;
const TABLE_PAGE_SIZE = 20;

type FilterTab = "all" | "active" | "archived";
type ViewMode = "card" | "table";

export function BusinessUnitsClient({ units }: { units: BusinessUnit[] }) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [view, setView] = useState<ViewMode>("card");

  const pageSize = view === "card" ? CARD_PAGE_SIZE : TABLE_PAGE_SIZE;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter((u) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !u.is_archived) ||
        (filter === "archived" && u.is_archived);
      if (!matchesFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        (u.category ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [units, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const counts = useMemo(
    () => ({
      all: units.length,
      active: units.filter((u) => !u.is_archived).length,
      archived: units.filter((u) => u.is_archived).length,
    }),
    [units]
  );

  function handleFilterChange(f: FilterTab) {
    setFilter(f);
    setPage(0);
  }

  function handleSearch(val: string) {
    setSearch(val);
    setPage(0);
  }

  const isEmpty = units.length === 0;
  const noResults = !isEmpty && filtered.length === 0;

  return (
    <div className="space-y-5">
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search by name, code, category…"
          isClearable
          className="w-full sm:w-90"
        />

        {/* Filter tabs + view toggle */}
        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            {(["all", "active", "archived"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleFilterChange(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                  filter === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-mono ${
                    filter === tab
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {counts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              onClick={() => setView("card")}
              className={`p-1.5 rounded-md transition-colors ${
                view === "card"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Card view"
            >
              <HugeiconsIcon icon={GridViewIcon} strokeWidth={2} className="size-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-1.5 rounded-md transition-colors ${
                view === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table view"
            >
              <HugeiconsIcon icon={GridTableIcon} strokeWidth={2} className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      {isEmpty ? (
        <EmptyState />
      ) : noResults ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <p className="text-sm font-medium">No results found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your search or filter.
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : view === "card" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paginated.map((bu) => (
            <UnitCard key={bu.id} bu={bu} />
          ))}
        </div>
      ) : (
        <TableView units={paginated} />
      )}

      {/* ── Pagination ──────────────────────────────────────── */}
      {filtered.length > pageSize && (
        <TablePagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

// ── Card view ────────────────────────────────────────────────────────────────

function UnitCard({ bu }: { bu: BusinessUnit }) {
  const archived = bu.is_archived;
  const isOwner = bu.current_user_role === "owner";

  return (
    <div
      className={`relative rounded-xl border bg-card overflow-hidden shadow-sm transition-shadow ${
        archived ? "opacity-60 hover:opacity-80" : "hover:shadow-md"
      }`}
    >
       {!isOwner && (
                <span className="text-[10px] absolute -top-1 z-30 font-medium border rounded px-1 py-0.5 text-sky-700 border-sky-200 bg-sky-50">
                  Shared
                </span>
              )}
      {/* Brand color accent */}
      <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-sm flex items-center gap-1.5">
              {bu.name}
              
              {archived && (
                <span className="text-[10px] font-medium border rounded px-1 py-0.5 text-muted-foreground border-muted-foreground/30">
                  Archived
                </span>
              )}
            </div>
           
            <div className="text-xs text-muted-foreground font-mono mt-0.5">{bu.code}</div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {bu.category ?? "General"}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground space-y-0.5">
          {bu.email && <div>{bu.email}</div>}
          {bu.phone && <div>{bu.phone}</div>}
          {bu.address && <div>{bu.address}</div>}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="bg-muted rounded px-1.5 py-0.5 font-mono">{bu.default_currency}</span>
          <span className="bg-muted rounded px-1.5 py-0.5">
            {bu.tax_label} {bu.default_tax_rate}%
          </span>
        </div>

        <div className={`flex items-center gap-2 pt-1 ${isOwner ? "border-t" : ""}`}>
          {isOwner ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              render={<a href={`/dashboard/business-units/${bu.id}/members`} title="Manage access" />}
            >
              <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3.5" />
              Access
            </Button>
          ) : null}
          {!archived && isOwner && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              render={<Link href={`/dashboard/business-units/${bu.id}/edit`} />}
            >
              <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} className="size-3.5" />
              Edit
            </Button>
          )}
          {isOwner ? <BusinessUnitActions id={bu.id} name={bu.name} isArchived={archived} /> : null}
        </div>
      </div>
    </div>
  );
}

// ── Table view ───────────────────────────────────────────────────────────────

function TableView({ units }: { units: BusinessUnit[] }) {
  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full min-w-200 text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Code</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs hidden md:table-cell">
              Category
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs hidden lg:table-cell">
              Currency
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs hidden lg:table-cell">
              Tax
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs hidden xl:table-cell">
              Payment Terms
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">
              Status
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {units.map((bu, i) => (
            <tr
              key={bu.id}
              className={`border-b border-border last:border-0 transition-colors hover:bg-muted/30  ${
                bu.is_archived ? "opacity-60" : ""
              } ${i % 2 === 0 ? "" : "bg-muted/10"}`}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full shrink-0 bg-primary/40" />
                  <span className="font-medium">{bu.name}</span>
                  {bu.current_user_role !== "owner" ? (
                    <Badge variant="outline" className="text-[10px] text-sky-700 border-sky-200 bg-sky-50">
                      Shared
                    </Badge>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{bu.code}</td>
              <td className="px-4 py-3 hidden md:table-cell">
                <Badge variant="outline" className="text-xs">
                  {bu.category ?? "General"}
                </Badge>
              </td>
              <td className="px-4 py-3 font-mono text-xs hidden lg:table-cell">
                {bu.default_currency}
              </td>
              <td className="px-4 py-3 text-xs hidden lg:table-cell">
                {bu.tax_label} {bu.default_tax_rate}%
              </td>
              <td className="px-4 py-3 text-xs hidden xl:table-cell">{bu.payment_terms}</td>
              <td className="px-4 py-3">
                {bu.is_archived ? (
                  <Badge variant="secondary" className="text-xs">
                    Archived
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  >
                    Active
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {bu.current_user_role === "owner" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs"
                      render={<a href={`/dashboard/business-units/${bu.id}/members`} title="Manage access" />}
                    >
                      <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3.5" />
                      Access
                    </Button>
                  ) : null}
                  {!bu.is_archived && bu.current_user_role === "owner" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs"
                      render={<Link href={`/dashboard/business-units/${bu.id}/edit`} />}
                    >
                      <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} className="size-3.5" />
                      Edit
                    </Button>
                  )}
                  {bu.current_user_role === "owner" ? (
                    <BusinessUnitActions id={bu.id} name={bu.name} isArchived={bu.is_archived} />
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="rounded-full bg-muted p-4">
        <HugeiconsIcon icon={Building01Icon} strokeWidth={1.5} className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="font-semibold">No business units yet</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Create your first business unit to start generating invoices. Each unit can have its own
          branding, tax settings, and bank details.
        </p>
      </div>
      <Button render={<Link href="/dashboard/business-units/new" className="gap-1.5" />}>
        <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} className="size-4" />
        Create Business Unit
      </Button>
    </div>
  );
}
