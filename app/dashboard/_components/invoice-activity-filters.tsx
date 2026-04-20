"use client";

import { SearchInput } from "@/components/custom/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoiceStatusFilter } from "@/lib/invoice-reporting";
import { STATUS_LABELS } from "@/lib/types/invoice";

const STATUS_OPTIONS: { value: InvoiceStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: STATUS_LABELS.draft },
  { value: "sent", label: STATUS_LABELS.sent },
  { value: "paid", label: STATUS_LABELS.paid },
  { value: "overdue", label: STATUS_LABELS.overdue },
];

interface InvoiceActivityFiltersProps {
  query: string;
  status: InvoiceStatusFilter;
  dateFrom: string;
  dateTo: string;
  resultLabel: string;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: InvoiceStatusFilter) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onReset: () => void;
}

export function InvoiceActivityFilters({
  query,
  status,
  dateFrom,
  dateTo,
  resultLabel,
  onQueryChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onReset,
}: InvoiceActivityFiltersProps) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/88 p-4 shadow-[0_16px_40px_rgba(24,18,9,0.05)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_11rem_11rem_11rem] xl:items-end">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</p>
            <SearchInput
              value={query}
              onChange={onQueryChange}
              placeholder="Search invoice, client, business unit..."
              isClearable
              delay={250}
              className="w-full h-11!"
            />
          </div>

          <div className="space-y-1.5 relative lg:top-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
            <Select value={status} onValueChange={(value: string) => onStatusChange(value as InvoiceStatusFilter)} items={STATUS_OPTIONS}>
              <SelectTrigger className="h-11! w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} label={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invoice-date-from" className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Date From
            </label>
            <Input
              id="invoice-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => onDateFromChange(event.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invoice-date-to" className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Date To
            </label>
            <Input
              id="invoice-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => onDateToChange(event.target.value)}
              className="h-11"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{resultLabel}</p>
          <Button type="button" variant="outline" size="sm" className={'h-11'} onClick={onReset}>
            Clear filters
          </Button>
        </div>
      </div>
    </div>
  );
}