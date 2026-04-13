import { getInvoiceStats } from "@/lib/supabase/invoices";
import { getInvoices } from "@/lib/supabase/invoices";
import { SiteHeader } from "@/components/site-header";
import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { formatCurrency } from "@/lib/types/invoice";
import { cn } from "@/lib/utils";
import { ReportsInfoButton } from "./_components/reports-info-button";
import {
  ReportsBusinessUnitsSection,
  ReportsRecentInvoicesSection,
} from "./_components/reports-paginated-sections";

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
        <div className={cn("mt-1 h-10 w-2 rounded-full shrink-0", accent)} />
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

export default async function ReportsPage() {
  const { businessUnits, activeBusinessUnit, activeBusinessUnitId } = await getBusinessUnitScope();
  const reportBusinessUnits = activeBusinessUnit ? [activeBusinessUnit] : businessUnits;
  const [stats, allInvoices] = await Promise.all([
    getInvoiceStats(activeBusinessUnitId ?? undefined),
    getInvoices({ businessUnitId: activeBusinessUnitId ?? undefined }),
  ]);

  const currency = activeBusinessUnit?.default_currency ?? businessUnits[0]?.default_currency ?? "NGN";

  // Revenue per business unit
  const buRevenue: Record<string, { name: string; color: string; total: number; count: number }> = {};
  for (const bu of reportBusinessUnits) {
    buRevenue[bu.id] = { name: bu.name, color: bu.brand_color ?? "#000", total: 0, count: 0 };
  }
  for (const inv of allInvoices) {
    if (buRevenue[inv.business_unit_id]) {
      buRevenue[inv.business_unit_id].total += Number(inv.total);
      buRevenue[inv.business_unit_id].count += 1;
    }
  }
  const buList = Object.values(buRevenue).sort((a, b) => b.total - a.total);

  // Collection rate
  const collectionRate =
    stats && stats.total > 0
      ? Math.round((stats.paid / stats.total) * 100)
      : 0;

  const outstandingRate =
    stats && stats.total > 0
      ? Math.round((stats.outstanding / stats.total) * 100)
      : 0;

  const overdueRate =
    stats && stats.total > 0
      ? Math.round((stats.overdue / stats.total) * 100)
      : 0;

  const draftRate =
    stats && stats.total > 0
      ? Math.round((stats.draft / stats.total) * 100)
      : 0;

  const averageInvoiceValue =
    stats && stats.count > 0 ? stats.total / stats.count : 0;

  const statusRows = [
    {
      label: "Paid",
      value: formatCurrency(stats?.paid ?? 0, currency),
      count: stats?.paidCount ?? 0,
      accent: "bg-emerald-500",
      share: collectionRate,
    },
    {
      label: "Outstanding",
      value: formatCurrency(stats?.outstanding ?? 0, currency),
      count: stats?.outstandingCount ?? 0,
      accent: "bg-blue-500",
      share: outstandingRate,
    },
    {
      label: "Overdue",
      value: formatCurrency(stats?.overdue ?? 0, currency),
      count: stats?.overdueCount ?? 0,
      accent: "bg-red-500",
      share: overdueRate,
    },
    {
      label: "Draft",
      value: formatCurrency(stats?.draft ?? 0, currency),
      count: stats?.draftCount ?? 0,
      accent: "bg-zinc-400",
      share: draftRate,
    },
  ];

  return (
    <>
      <SiteHeader title="Reports" actions={<ReportsInfoButton />} />

      <div className="space-y-6 p-4 md:p-6">
        <section className="relative overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(135deg,_rgba(255,255,255,0.94),_rgba(255,246,238,0.92)_46%,_rgba(255,255,255,0.9)_100%)] p-6 shadow-[0_28px_90px_rgba(34,22,11,0.08)] md:p-7">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[-4%] top-[-8%] h-40 w-40 rounded-full bg-orange-200/35 blur-3xl" />
            <div className="absolute bottom-[-10%] right-[8%] h-44 w-44 rounded-full bg-amber-200/35 blur-3xl" />
            <div className="absolute inset-y-0 right-[28%] w-px bg-gradient-to-b from-transparent via-orange-200/70 to-transparent hidden lg:block" />
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-700 shadow-sm">
                Revenue overview
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-600">
                  {activeBusinessUnit ? activeBusinessUnit.name : "All business units"}
                </p>
                <h2 className="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 md:text-5xl">
                  {stats ? formatCurrency(stats.total, currency) : "—"}
                </h2>
                <p className="max-w-xl text-sm leading-6 text-zinc-600 md:text-base">
                  {stats?.count ?? 0} invoices tracked with {collectionRate}% already collected.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Collected"
                value={formatPercent(collectionRate)}
                detail={formatCurrency(stats?.paid ?? 0, currency)}
                tone="success"
              />
              <MetricCard
                label="Average invoice"
                value={formatCurrency(averageInvoiceValue, currency)}
                detail={`${stats?.count ?? 0} total invoices`}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Paid revenue"
            value={formatCurrency(stats?.paid ?? 0, currency)}
            detail={`${stats?.paidCount ?? 0} paid invoices`}
            tone="success"
          />
          <MetricCard
            label="Outstanding"
            value={formatCurrency(stats?.outstanding ?? 0, currency)}
            detail={`${stats?.outstandingCount ?? 0} sent invoices`}
            tone="warning"
          />
          <MetricCard
            label="Overdue"
            value={formatCurrency(stats?.overdue ?? 0, currency)}
            detail={`${stats?.overdueCount ?? 0} overdue invoices`}
            tone="danger"
          />
          <MetricCard
            label="Draft value"
            value={formatCurrency(stats?.draft ?? 0, currency)}
            detail={`${stats?.draftCount ?? 0} draft invoices`}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.94),_rgba(250,250,249,0.92)_100%)] p-5 shadow-[0_22px_70px_rgba(24,18,9,0.06)] md:p-6">
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
          <ReportsBusinessUnitsSection
            businessUnits={buList}
            currency={currency}
          />
          </div>
        </div>

        <ReportsRecentInvoicesSection
          recentInvoices={allInvoices.map((invoice) => ({
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            client_name: invoice.client_name,
            status: invoice.status,
            total: invoice.total,
            currency: invoice.currency,
          }))}
        />
      </div>
    </>
  );
}
