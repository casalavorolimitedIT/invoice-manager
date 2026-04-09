import { SiteHeader } from "@/components/site-header";
import { getInvoiceStats } from "@/lib/supabase/invoices";
import { getBusinessUnits } from "@/lib/supabase/business-units";
import { getClients } from "@/lib/supabase/clients";
import { formatCurrency } from "@/lib/types/invoice";
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
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { cn } from "@/lib/utils";

function StatCard({
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
    <div className="rounded-xl border bg-card p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn("flex items-center justify-center size-8 rounded-lg", accent ?? "bg-muted")}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function QuickLink({
  href,
  label,
  count,
  icon,
}: {
  href: string;
  label: string;
  count: number;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="flex items-center justify-center size-9 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{count} total</div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const [stats, businessUnits, clients] = await Promise.all([
    getInvoiceStats(),
    getBusinessUnits(),
    getClients(),
  ]);

  const currency = businessUnits[0]?.default_currency ?? "NGN";

  return (
    <>
      <SiteHeader
        title="Dashboard"
        actions={
          <Button size="sm" render={<Link href="/dashboard/invoices/new" className="gap-1.5" />}>
            <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} className="size-4" />
            New Invoice
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Revenue stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={stats ? formatCurrency(stats.total, currency) : "—"}
            sub={`${stats?.count ?? 0} invoices`}
            icon={<HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-4 text-foreground" />}
            accent="bg-muted"
          />
          <StatCard
            title="Paid"
            value={stats ? formatCurrency(stats.paid, currency) : "—"}
            sub={`${stats?.paidCount ?? 0} invoices`}
            icon={<HugeiconsIcon icon={MoneyReceive02Icon} strokeWidth={2} className="size-4 text-emerald-600" />}
            accent="bg-emerald-100 dark:bg-emerald-900/30"
          />
          <StatCard
            title="Outstanding"
            value={stats ? formatCurrency(stats.outstanding, currency) : "—"}
            sub={`${stats?.outstandingCount ?? 0} sent`}
            icon={<HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4 text-blue-600" />}
            accent="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatCard
            title="Overdue"
            value={stats ? formatCurrency(stats.overdue, currency) : "—"}
            sub={`${stats?.overdueCount ?? 0} invoices`}
            icon={<HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4 text-red-600" />}
            accent="bg-red-100 dark:bg-red-900/30"
          />
        </div>

        {/* Quick navigation */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Quick Access
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <QuickLink
              href="/dashboard/invoices"
              label="Invoices"
              count={stats?.count ?? 0}
              icon={<HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />}
            />
            <QuickLink
              href="/dashboard/clients"
              label="Clients"
              count={clients.length}
              icon={<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4 text-muted-foreground" />}
            />
            <QuickLink
              href="/dashboard/business-units"
              label="Business Units"
              count={businessUnits.length}
              icon={<HugeiconsIcon icon={Building01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />}
            />
          </div>
        </div>

        {/* Draft / overdue callouts */}
        {stats && (stats.draftCount > 0 || stats.overdueCount > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.draftCount > 0 && (
              <Link
                href="/dashboard/invoices?status=draft"
                className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3 hover:bg-muted/70 transition-colors"
              >
                <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  <strong>{stats.draftCount}</strong> draft {stats.draftCount === 1 ? "invoice" : "invoices"} — ready to send
                </span>
              </Link>
            )}
            {stats.overdueCount > 0 && (
              <Link
                href="/dashboard/invoices?status=overdue"
                className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 px-4 py-3 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
              >
                <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4 text-red-600 shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-400">
                  <strong>{stats.overdueCount}</strong> overdue {stats.overdueCount === 1 ? "invoice" : "invoices"} — follow up
                </span>
              </Link>
            )}
          </div>
        )}

        {/* Empty state */}
        {businessUnits.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center space-y-3">
            <HugeiconsIcon icon={Building01Icon} strokeWidth={1.5} className="mx-auto size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No business units yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Set up your first business unit to start creating invoices.
            </p>
            <Button size="sm" render={<Link href="/dashboard/business-units/new" />}>Create Business Unit</Button>
          </div>
        )}
      </div>
    </>
  );
}
