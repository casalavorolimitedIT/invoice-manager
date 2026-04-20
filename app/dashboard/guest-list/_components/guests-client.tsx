"use client";

import { useMemo, useState } from "react";
import type { BusinessUnit, GuestWithImageUrl } from "@/lib/types/invoice";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/custom/search-input";
import { TablePagination } from "@/components/custom/table-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GuestActions } from "./guest-actions";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 15;

const genderLabels: Record<string, string> = {
  female: "Female",
  male: "Male",
  "non-binary": "Non-binary",
  "prefer-not-to-say": "Prefer not to say",
};

const identificationLabels: Record<string, string> = {
  passport: "Passport",
  "drivers-license": "Driver's License",
  "national-id": "National ID",
  "voters-card": "Voter's Card",
  "residence-permit": "Residence Permit",
  other: "Other",
};

const genderItems = [
  { value: "all", label: "All genders" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

const identificationItems = [
  { value: "all", label: "All IDs" },
  { value: "none", label: "Not provided" },
  { value: "passport", label: "Passport" },
  { value: "drivers-license", label: "Driver's License" },
  { value: "national-id", label: "National ID" },
  { value: "voters-card", label: "Voter's Card" },
  { value: "residence-permit", label: "Residence Permit" },
  { value: "other", label: "Other" },
];

export function GuestsClient({
  guests,
  businessUnits,
  initialBusinessUnitFilter = "all",
}: {
  guests: GuestWithImageUrl[];
  businessUnits: BusinessUnit[];
  initialBusinessUnitFilter?: string;
}) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [identificationFilter, setIdentificationFilter] = useState("all");
  const [businessUnitFilter, setBusinessUnitFilter] = useState(initialBusinessUnitFilter);

  const businessUnitMap = useMemo(
    () => Object.fromEntries(businessUnits.map((businessUnit) => [businessUnit.id, businessUnit])),
    [businessUnits]
  );

  const businessUnitItems = useMemo(
    () => [
      { value: "all", label: "All business units" },
      ...businessUnits.map((bu) => ({ value: bu.id, label: bu.name })),
    ],
    [businessUnits]
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    genderFilter !== "all" ||
    identificationFilter !== "all" ||
    businessUnitFilter !== "all";

  function clearFilters() {
    setPage(0);
    setSearch("");
    setGenderFilter("all");
    setIdentificationFilter("all");
    setBusinessUnitFilter("all");
  }

  const filteredGuests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return guests.filter((guest) => {
      const businessUnit = businessUnitMap[guest.business_unit_id];

      if (genderFilter !== "all" && guest.gender !== genderFilter) return false;
      if (identificationFilter !== "all" && (guest.identification_type ?? "none") !== identificationFilter) {
        return false;
      }
      if (businessUnitFilter !== "all" && guest.business_unit_id !== businessUnitFilter) return false;

      if (!query) return true;

      const haystack = [
        guest.first_name,
        guest.last_name,
        guest.phone_number,
        guest.email,
        guest.nationality,
        guest.identification_number,
        guest.identification_type ? identificationLabels[guest.identification_type] ?? guest.identification_type : "",
        businessUnit?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [businessUnitFilter, businessUnitMap, genderFilter, guests, identificationFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredGuests.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedGuests = filteredGuests.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_12rem_14rem_12rem] xl:items-end">
          <div className="space-y-1.5 lg:bottom-1.5 relative">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</p>
            <SearchInput
              value={search}
              onChange={(value) => {
                setPage(0);
                setSearch(value);
              }}
              placeholder="Search guest, email, phone..."
              isClearable
              delay={250}
              className="w-full h-11!"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gender</p>
            <Select value={genderFilter} onValueChange={(value: string) => { setPage(0); setGenderFilter(value); }} items={genderItems}>
              <SelectTrigger className="h-11! w-full"><SelectValue placeholder="All genders" /></SelectTrigger>
              <SelectContent>
                {genderItems.map(({ value, label }) => (
                  <SelectItem key={value} value={value} label={label}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Identification</p>
            <Select value={identificationFilter} onValueChange={(value: string) => { setPage(0); setIdentificationFilter(value); }} items={identificationItems}>
              <SelectTrigger className="h-11! w-full"><SelectValue placeholder="All IDs" /></SelectTrigger>
              <SelectContent>
                {identificationItems.map(({ value, label }) => (
                  <SelectItem key={value} value={value} label={label}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Business Unit</p>
            <Select value={businessUnitFilter} onValueChange={(value: string) => { setPage(0); setBusinessUnitFilter(value); }} items={businessUnitItems}>
              <SelectTrigger className="h-11! w-full"><SelectValue placeholder="All business units" /></SelectTrigger>
              <SelectContent>
                {businessUnitItems.map(({ value, label }) => (
                  <SelectItem key={value} value={value} label={label}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {hasActiveFilters ? (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground hover:text-foreground">
              {/* X icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>

      {filteredGuests.length > 0 ? (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Guest</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Means of Identification</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Business Unit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedGuests.map((guest) => {
                const businessUnit = businessUnitMap[guest.business_unit_id];
                const canManage = businessUnit?.current_user_can_manage ?? false;

                return (
                  <tr key={guest.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{guest.first_name} {guest.last_name}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{genderLabels[guest.gender] ?? guest.gender}</span>
                        <span>•</span>
                        <span>{guest.nationality}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>{guest.email}</div>
                        <div>{guest.phone_number}</div>
                        <div>Emergency: {guest.emergency_contact}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="space-y-1">
                        <Badge variant="outline">
                          {guest.identification_type ? identificationLabels[guest.identification_type] ?? guest.identification_type : "Not provided"}
                        </Badge>
                        {guest.identification_number ? (
                          <div className="text-xs text-muted-foreground">{guest.identification_number}</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {businessUnit ? <Badge variant="secondary">{businessUnit.name}</Badge> : null}
                    </td>
                    <td className="px-4 py-3">
                      <GuestActions guest={guest} businessUnits={businessUnits} canManage={canManage} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
          <p className="font-medium text-sm">No guests match your filters</p>
          <p className="text-xs text-muted-foreground">Try a different business unit, identification type, or search term.</p>
        </div>
      )}

      {filteredGuests.length > PAGE_SIZE ? (
        <TablePagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filteredGuests.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}