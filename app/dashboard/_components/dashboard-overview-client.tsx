/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Invoice01Icon,
  UserGroupIcon,
  Building01Icon,
  MoneyReceive02Icon,
  AlertCircleIcon,
  Clock01Icon,
  PlusSignCircleIcon,
  ChartHistogramIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency, type BusinessUnit, type Invoice } from "@/lib/types/invoice";
import { DashboardInfoButton } from "./dashboard-info-button";
import { RecentInvoiceActivityTable } from "./recent-invoice-activity-table";
import { InvoiceActivityFilters } from "./invoice-activity-filters";
import {
  filterInvoices,
  hasActiveInvoiceFilters,
  summarizeInvoices,
  type InvoiceFilterState,
} from "@/lib/invoice-reporting";

function formatPercent(value: number) {
  return `${value}%`;
}

function OverviewCard({
  title,
  value,
  sub,
  icon,
  accent,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/88 p-5 shadow-[0_18px_50px_rgba(24,18,9,0.06)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn("flex size-10 items-center justify-center rounded-2xl", accent ?? "bg-muted")}>
          {icon}
        </div>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">{value}</div>
      {sub && <div className="mt-2 text-sm text-zinc-600">{sub}</div>}
    </div>
  );
}

function ActionTile({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-[22px] border border-white/80 bg-white/88 px-4 py-4 shadow-[0_16px_40px_rgba(24,18,9,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(24,18,9,0.08)]"
    >
      <div className="flex size-11 items-center justify-center rounded-2xl bg-zinc-100 transition-colors group-hover:bg-orange-50">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-zinc-950">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      </div>
      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 text-zinc-400 transition-colors group-hover:text-primary" />
    </Link>
  );
}

function FocusItem({
  href,
  label,
  detail,
  icon,
  tone,
}: {
  href: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
  tone: "neutral" | "danger" | "success";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-4xl border px-4 py-3.5 transition-colors",
        tone === "danger" && "border-red-200 bg-red-50 hover:bg-red-100/80",
        tone === "success" && "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80",
        tone === "neutral" && "border-zinc-200 bg-zinc-50 hover:bg-zinc-100/80",
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-zinc-900">{label}</div>
        <div className="mt-1 text-xs text-zinc-600">{detail}</div>
      </div>
    </Link>
  );
}

interface DashboardOverviewClientProps {
  businessUnits: BusinessUnit[];
  invoices: Invoice[];
  clientsCount: number;
  currency: string;
  scopeLabel: string;
  canCreateInvoice: boolean;
}

const DEFAULT_FILTERS: InvoiceFilterState = {
  query: "",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

export function DashboardOverviewClient({
  businessUnits,
  invoices,
  clientsCount,
  currency,
  scopeLabel,
  canCreateInvoice,
}: DashboardOverviewClientProps) {
  const [filters, setFilters] = useState<InvoiceFilterState>(DEFAULT_FILTERS);

  const filteredInvoices = useMemo(() => filterInvoices(invoices, filters), [invoices, filters]);
  const stats = useMemo(() => summarizeInvoices(filteredInvoices), [filteredInvoices]);
  const hasFilters = hasActiveInvoiceFilters(filters);
  const collectionRate = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;
  const averageInvoiceValue = stats.count > 0 ? stats.total / stats.count : 0;

  const priorityItems = [
    stats.overdueCount > 0
      ? {
          href: "/dashboard/invoices?status=overdue",
          label: `${stats.overdueCount} overdue ${stats.overdueCount === 1 ? "invoice" : "invoices"}`,
          detail: "Follow up on unpaid balances.",
          icon: <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4 text-red-600" />,
          tone: "danger" as const,
        }
      : null,
    stats.draftCount > 0
      ? {
          href: "/dashboard/invoices?status=draft",
          label: `${stats.draftCount} draft ${stats.draftCount === 1 ? "invoice" : "invoices"}`,
          detail: "Finish and send pending drafts.",
          icon: <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-4 text-zinc-700" />,
          tone: "neutral" as const,
        }
      : null,
    {
      href: "/dashboard/reports",
      label: `${formatPercent(collectionRate)} collected`,
      detail: "Open reports for a deeper breakdown.",
      icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4 text-emerald-600" />,
      tone: "success" as const,
    },
  ].filter(Boolean);

  return (
    <>
      <SiteHeader
        title="Dashboard"
        actions={
          <>
            <DashboardInfoButton />
            {canCreateInvoice ? (
              <Button size="sm" className="shadow-sm" render={<Link href="/dashboard/invoices/new" className="gap-1.5" />}>
                <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} className="size-4" />
                New Invoice
              </Button>
            ) : null}
          </>
        }
      />

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

        <section className="relative overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,246,238,0.92)_50%,rgba(255,255,255,0.94)_100%)] p-6 shadow-[0_28px_90px_rgba(26,20,12,0.08)] md:p-7">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[-4%] top-[-12%] h-40 w-40 rounded-full bg-orange-200/35 blur-3xl" />
            <div className="absolute bottom-[-10%] right-[6%] h-44 w-44 rounded-full bg-amber-200/35 blur-3xl" />
          </div>
          <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/75 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-700 shadow-sm">
                Workspace overview
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-600">{scopeLabel}</p>
                <h2 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 md:text-5xl">
                  {formatCurrency(stats.total, currency)}
                </h2>
                <p className="max-w-xl text-sm leading-6 text-zinc-600 md:text-base">
                  {stats.count} invoices, {clientsCount} clients, and {formatPercent(collectionRate)} collected.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {canCreateInvoice ? <Button render={<Link href="/dashboard/invoices/new" />}>Create invoice</Button> : null}
                <Button variant="outline" render={<Link href="/dashboard/reports" />}>Open reports</Button>
                <Button variant="outline" render={<Link href="/dashboard/clients" />}>Manage clients</Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <OverviewCard
                title="Collected"
                value={formatPercent(collectionRate)}
                sub={formatCurrency(stats.paid, currency)}
                icon={<HugeiconsIcon icon={MoneyReceive02Icon} strokeWidth={2} className="size-4 text-emerald-600" />}
                accent="bg-emerald-100 dark:bg-emerald-900/30"
              />
              <OverviewCard
                title="Average Invoice"
                value={formatCurrency(averageInvoiceValue, currency)}
                sub={`${stats.count} total invoices`}
                icon={<HugeiconsIcon icon={ChartHistogramIcon} strokeWidth={2} className="size-4 text-zinc-700" />}
                accent="bg-zinc-100"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            title="Total Revenue"
            value={formatCurrency(stats.total, currency)}
            sub={`${stats.count} invoices`}
            icon={<HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-4 text-foreground" />}
            accent="bg-zinc-100"
          />
          <OverviewCard
            title="Paid"
            value={formatCurrency(stats.paid, currency)}
            sub={`${stats.paidCount} invoices`}
            icon={<HugeiconsIcon icon={MoneyReceive02Icon} strokeWidth={2} className="size-4 text-emerald-600" />}
            accent="bg-emerald-100 dark:bg-emerald-900/30"
          />
          <OverviewCard
            title="Outstanding"
            value={formatCurrency(stats.outstanding, currency)}
            sub={`${stats.outstandingCount} sent`}
            icon={<HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4 text-blue-600" />}
            accent="bg-blue-100 dark:bg-blue-900/30"
          />
          <OverviewCard
            title="Overdue"
            value={formatCurrency(stats.overdue, currency)}
            sub={`${stats.overdueCount} invoices`}
            icon={<HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4 text-red-600" />}
            accent="bg-red-100 dark:bg-red-900/30"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,249,245,0.9)_100%)] p-5 shadow-[0_22px_70px_rgba(24,18,9,0.06)] md:p-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-zinc-950">Focus now</h3>
                <p className="mt-1 text-sm text-zinc-600">The most useful next actions for this workspace.</p>
              </div>
              <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
                Live priorities
              </div>
            </div>

            <div className="grid gap-3">
              {priorityItems.map((item:any) => (
                <FocusItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  detail={item.detail}
                  icon={item.icon}
                  tone={item.tone}
                />
              ))}
            </div>

            <div className="mt-5 rounded-[22px] border border-zinc-200 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Workspace snapshot</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Active scope</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-950">{scopeLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-950">{currency}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Draft invoices</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-950">{stats.draftCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Business units</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-950">{businessUnits.length}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(252,250,247,0.9)_100%)] p-5 shadow-[0_22px_70px_rgba(24,18,9,0.06)] md:p-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-zinc-950">Quick access</h3>
                <p className="mt-1 text-sm text-zinc-600">Move between the core parts of the app faster.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ActionTile
                href="/dashboard/invoices"
                label="Invoices"
                description={`${stats.count} matching invoices`}
                icon={<HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />}
              />
              <ActionTile
                href="/dashboard/clients"
                label="Clients"
                description={`${clientsCount} active clients`}
                icon={<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4 text-muted-foreground" />}
              />
              <ActionTile
                href="/dashboard/business-units"
                label="Business Units"
                description={`${businessUnits.length} units configured`}
                icon={<HugeiconsIcon icon={Building01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />}
              />
              <ActionTile
                href="/dashboard/reports"
                label="Reports"
                description="Revenue and collection insights"
                icon={<HugeiconsIcon icon={ChartHistogramIcon} strokeWidth={2} className="size-4 text-muted-foreground" />}
              />
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(252,249,246,0.9)_100%)] p-5 shadow-[0_22px_70px_rgba(24,18,9,0.06)] md:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.03em] text-zinc-950">Recent invoice activity</h3>
              <p className="mt-1 text-sm text-zinc-600">Latest invoices in the current scope.</p>
            </div>
            <Button variant="outline" size="sm" render={<Link href="/dashboard/invoices" />}>View all</Button>
          </div>

          <RecentInvoiceActivityTable
            invoices={filteredInvoices.map((invoice) => ({
              id: invoice.id,
              invoice_number: invoice.invoice_number,
              client_name: invoice.client_name,
              status: invoice.status,
              total: invoice.total,
              currency: invoice.currency,
              created_at: invoice.created_at,
            }))}
          />

          {hasFilters && filteredInvoices.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No invoice activity matches the current filters.</p>
          ) : null}
        </section>

        {businessUnits.length === 0 && (
          <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/70 p-10 text-center shadow-[0_12px_40px_rgba(24,18,9,0.03)]">
            <HugeiconsIcon icon={Building01Icon} strokeWidth={1.5} className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No business units yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
              Set up your first business unit to start creating invoices.
            </p>
            <Button className="mt-4" size="sm" render={<Link href="/dashboard/business-units/new" />}>Create Business Unit</Button>
          </div>
        )}
      </div>
    </>
  );
}
