"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BusinessUnit } from "@/lib/types/invoice";
import { setActiveBusinessUnitScope } from "@/app/dashboard/actions/business-unit-scope";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/custom/search-input";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

interface BusinessUnitScopeSwitcherProps {
  businessUnits: BusinessUnit[];
  activeBusinessUnitId: string | null;
  activeBusinessUnitName?: string | null;
  closeMobileSidebar?: () => void;
}

export function BusinessUnitScopeSwitcher({
  businessUnits,
  activeBusinessUnitId,
  activeBusinessUnitName,
  closeMobileSidebar
}: BusinessUnitScopeSwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredBusinessUnits = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return businessUnits;

    return businessUnits.filter((businessUnit) =>
      [businessUnit.name, businessUnit.code, businessUnit.category ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [businessUnits, search]);

  function handleSelectBusinessUnit(businessUnitId: string) {
    startTransition(async () => {
      const result = await setActiveBusinessUnitScope(businessUnitId);

      if (!result?.error) {
        setIsOpen(false);
        router.refresh();
      }
      closeMobileSidebar?.();
    });
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-auto w-full cursor-pointer justify-start gap-3 rounded-xl px-3 py-3 text-left"
        onClick={() => {
            setIsOpen(true);
        }}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={Building01Icon} strokeWidth={2} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Active Business Unit
          </div>
          <div className="truncate text-sm font-semibold">
            {activeBusinessUnitName ?? "Choose a business unit"}
          </div>
        </div>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl! p-0 overflow-hidden">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>Switch Business Unit</DialogTitle>
            <DialogDescription>
              Choose the business unit that should drive your dashboard data, reports, and defaults.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            <SearchInput
              value={search}
              onChange={setSearch}
              delay={150}
              isClearable
              placeholder="Search business units by name, code, or category"
              className="w-full"
            />

            <div className="grid max-h-[55vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredBusinessUnits.map((businessUnit) => {
                const isActive = businessUnit.id === activeBusinessUnitId;
                const isArchived = businessUnit.is_archived;

                return (
                  <button
                    key={businessUnit.id}
                    type="button"
                    disabled={isPending || isArchived}
                    onClick={() => handleSelectBusinessUnit(businessUnit.id)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-muted/40"
                    } ${isArchived ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{businessUnit.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{businessUnit.code}</div>
                      </div>
                      {isActive ? (
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.4} className="size-3.5" />
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {businessUnit.category ? (
                        <Badge variant="outline" className="text-[11px]">
                          {businessUnit.category}
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className="text-[11px]">
                        {businessUnit.default_currency}
                      </Badge>
                      {isArchived ? (
                        <Badge variant="secondary" className="text-[11px]">
                          Archived
                        </Badge>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredBusinessUnits.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No business units match your search.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}