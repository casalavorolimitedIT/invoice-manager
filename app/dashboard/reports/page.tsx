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

function StatRow({
  label,
  value,
  count,
  accent,
}: {
  label: string;
  value: string;
  count: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-0">
      <div className={cn("w-2 h-8 rounded-full shrink-0", accent)} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">
          {count} {count === 1 ? "invoice" : "invoices"}
        </div>
      </div>
      <div className="text-sm font-bold tabular-nums text-right">{value}</div>
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

  return (
    <>
      <SiteHeader title="Reports" actions={<ReportsInfoButton />} />

      <div className="p-4 md:p-6 space-y-6">
        {/* Header metric */}
        <div className="rounded-xl border bg-card p-6 space-y-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Total Invoiced
          </div>
          <div className="text-4xl font-bold tracking-tight">
            {stats ? formatCurrency(stats.total, currency) : "—"}
          </div>
          <div className="text-sm text-muted-foreground">
            across {stats?.count ?? 0} invoices · {collectionRate}% collected
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Status breakdown */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-1">By Status</h3>
            <p className="text-xs text-muted-foreground mb-4">Revenue grouped by invoice lifecycle stage</p>
            <div>
              <StatRow
                label="Paid"
                value={formatCurrency(stats?.paid ?? 0, currency)}
                count={stats?.paidCount ?? 0}
                accent="bg-emerald-500"
              />
              <StatRow
                label="Outstanding (Sent)"
                value={formatCurrency(stats?.outstanding ?? 0, currency)}
                count={stats?.outstandingCount ?? 0}
                accent="bg-blue-500"
              />
              <StatRow
                label="Overdue"
                value={formatCurrency(stats?.overdue ?? 0, currency)}
                count={stats?.overdueCount ?? 0}
                accent="bg-red-500"
              />
              <StatRow
                label="Draft"
                value={formatCurrency(stats?.draft ?? 0, currency)}
                count={stats?.draftCount ?? 0}
                accent="bg-zinc-400"
              />
            </div>
          </div>

          {/* Per business unit */}
          <ReportsBusinessUnitsSection
            businessUnits={buList}
            currency={currency}
          />
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
