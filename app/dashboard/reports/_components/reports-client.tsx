"use client";

import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { formatCurrency, type BusinessUnit, type Invoice } from "@/lib/types/invoice";
import { cn } from "@/lib/utils";
import { ReportsInfoButton } from "./reports-info-button";
import {
  ReportsBusinessUnitsSection,
  ReportsRecentInvoicesSection,
} from "./reports-paginated-sections";
import { InvoiceActivityFilters } from "@/app/dashboard/_components/invoice-activity-filters";
import {
  buildBusinessUnitRevenue,
  filterInvoices,
  summarizeInvoices,
  type InvoiceFilterState,
} from "@/lib/invoice-reporting";

function formatPercent(value: number) {
  return `${value}%`;
}

function getMeterWidthClass(value: number, hasValue = value > 0) {
  if (!hasValue || value <= 0) return "w-0";
  if (value <= 20) return "w-1/5 min-w-6";
  if (value <= 40) return "w-2/5";
  if (value <= 60) return "w-3/5";
  if (value <= 80) return "w-4/5";
  return "w-full";
}

function MetricCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border p-5 shadow-[0_20px_50px_rgba(26,20,12,0.06)]",
        tone === "success" && "border-emerald-200/70 bg-emerald-50/80",
        tone === "warning" && "border-blue-200/70 bg-blue-50/80",
        tone === "danger" && "border-red-200/70 bg-red-50/80",
        tone === "default" && "border-white/80 bg-white/88",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
        {value}
      </p>
      <p className="mt-2 text-sm text-zinc-600">{detail}</p>
    </div>
  );
}

function StatRow({
  label,
  value,
  count,
  accent,
  share,
}: {
  label: string;
  value: string;
  count: number;
  accent: string;
  share: number;
}) {
  return (
    <div className="rounded-[22px] border border-white/70 bg-white/72 p-4 shadow-[0_18px_40px_rgba(24,18,9,0.05)]">
      <div className="flex items-start gap-4">
        <div className={cn("mt-1 h-10 w-2 shrink-0 rounded-full", accent)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-zinc-900">{label}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {count} {count === 1 ? "invoice" : "invoices"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold tabular-nums text-zinc-950">{value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{formatPercent(share)}</div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={cn(
                "h-full rounded-full",
                getMeterWidthClass(share, count > 0),
                accent,
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReportsClientProps {
  businessUnits: BusinessUnit[];
  invoices: Invoice[];
  currency: string;
  scopeLabel: string;
}

const DEFAULT_FILTERS: InvoiceFilterState = {
  query: "",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

export function ReportsClient({ businessUnits, invoices, currency, scopeLabel }: ReportsClientProps) {
  const [filters, setFilters] = useState<InvoiceFilterState>(DEFAULT_FILTERS);
  const filteredInvoices = useMemo(() => filterInvoices(invoices, filters), [invoices, filters]);
  const stats = useMemo(() => summarizeInvoices(filteredInvoices), [filteredInvoices]);
  const buList = useMemo(
    () => buildBusinessUnitRevenue(filteredInvoices, businessUnits),
    [filteredInvoices, businessUnits]
  );

  const collectionRate = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;
  const outstandingRate = stats.total > 0 ? Math.round((stats.outstanding / stats.total) * 100) : 0;
  const overdueRate = stats.total > 0 ? Math.round((stats.overdue / stats.total) * 100) : 0;
  const draftRate = stats.total > 0 ? Math.round((stats.draft / stats.total) * 100) : 0;
  const averageInvoiceValue = stats.count > 0 ? stats.total / stats.count : 0;

  const statusRows = [
    {
      label: "Paid",
      value: formatCurrency(stats.paid, currency),
      count: stats.paidCount,
      accent: "bg-emerald-500",
      share: collectionRate,
    },
    {
      label: "Outstanding",
      value: formatCurrency(stats.outstanding, currency),
      count: stats.outstandingCount,
      accent: "bg-blue-500",
      share: outstandingRate,
    },
    {
      label: "Overdue",
      value: formatCurrency(stats.overdue, currency),
      count: stats.overdueCount,
      accent: "bg-red-500",
      share: overdueRate,
    },
    {
      label: "Draft",
      value: formatCurrency(stats.draft, currency),
      count: stats.draftCount,
      accent: "bg-zinc-400",
      share: draftRate,
    },
  ];

  return (
    <>
      <SiteHeader title="Reports" actions={<ReportsInfoButton />} />

      <div className="space-y-6 p-4 md:p-6">
        <InvoiceActivityFilters
          query={filters.query}
          status={filters.status}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          resultLabel={`${filteredInvoices.length} matching invoices`}
          onQueryChange={(value) => setFilters((current) => ({ ...current, query: value }))}
          onStatusChange={(value) => setFilters((current) => ({ ...current, status: value }))}
          onDateFromChange={(value) => setFilters((current) => ({ ...current, dateFrom: value, dateTo: current.dateTo && value && current.dateTo < value ? value : current.dateTo }))}
          onDateToChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />

        <section className="relative overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(255,246,238,0.92)_46%,rgba(255,255,255,0.9)_100%)] p-6 shadow-[0_28px_90px_rgba(34,22,11,0.08)] md:p-7">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[-4%] top-[-8%] h-40 w-40 rounded-full bg-orange-200/35 blur-3xl" />
            <div className="absolute bottom-[-10%] right-[8%] h-44 w-44 rounded-full bg-amber-200/35 blur-3xl" />
            <div className="absolute inset-y-0 right-[28%] hidden w-px bg-linear-to-b from-transparent via-orange-200/70 to-transparent lg:block" />
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-700 shadow-sm">
                Revenue overview
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-600">{scopeLabel}</p>
                <h2 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 md:text-5xl">
                  {formatCurrency(stats.total, currency)}
                </h2>
                <p className="max-w-xl text-sm leading-6 text-zinc-600 md:text-base">
                  {stats.count} invoices tracked with {collectionRate}% already collected.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Collected"
                value={formatPercent(collectionRate)}
                detail={formatCurrency(stats.paid, currency)}
                tone="success"
              />
              <MetricCard
                label="Average invoice"
                value={formatCurrency(averageInvoiceValue, currency)}
                detail={`${stats.count} total invoices`}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Paid revenue"
            value={formatCurrency(stats.paid, currency)}
            detail={`${stats.paidCount} paid invoices`}
            tone="success"
          />
          <MetricCard
            label="Outstanding"
            value={formatCurrency(stats.outstanding, currency)}
            detail={`${stats.outstandingCount} sent invoices`}
            tone="warning"
          />
          <MetricCard
            label="Overdue"
            value={formatCurrency(stats.overdue, currency)}
            detail={`${stats.overdueCount} overdue invoices`}
            tone="danger"
          />
          <MetricCard
            label="Draft value"
            value={formatCurrency(stats.draft, currency)}
            detail={`${stats.draftCount} draft invoices`}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(250,250,249,0.92)_100%)] p-5 shadow-[0_22px_70px_rgba(24,18,9,0.06)] md:p-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-zinc-950">
                  Status performance
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  Revenue split by invoice stage.
                </p>
              </div>
              <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                Live snapshot
              </div>
            </div>
            <div className="grid gap-3">
              {statusRows.map((row) => (
                <StatRow key={row.label} {...row} />
              ))}
            </div>
          </section>

          <div className="min-w-0">
            <ReportsBusinessUnitsSection businessUnits={buList} currency={currency} />
          </div>
        </div>

        <ReportsRecentInvoicesSection
          recentInvoices={filteredInvoices.map((invoice) => ({
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            client_name: invoice.client_name,
            status: invoice.status,
            total: invoice.total,
            currency: invoice.currency,
          }))}
        />

        {filteredInvoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No report data matches the current filters.</p>
        ) : null}
      </div>
    </>
  );
}
