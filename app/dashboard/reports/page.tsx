import { getInvoiceStats } from "@/lib/supabase/invoices";
import { getBusinessUnits } from "@/lib/supabase/business-units";
import { getInvoices } from "@/lib/supabase/invoices";
import { SiteHeader } from "@/components/site-header";
import { formatCurrency, STATUS_COLORS, STATUS_LABELS, type InvoiceStatus } from "@/lib/types/invoice";
import { cn } from "@/lib/utils";
import { ReportsInfoButton } from "./_components/reports-info-button";

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
  const [stats, businessUnits, allInvoices] = await Promise.all([
    getInvoiceStats(),
    getBusinessUnits(),
    getInvoices(),
  ]);

  const currency = businessUnits[0]?.default_currency ?? "NGN";

  // Revenue per business unit
  const buRevenue: Record<string, { name: string; color: string; total: number; count: number }> = {};
  for (const bu of businessUnits) {
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
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-1">By Business Unit</h3>
            <p className="text-xs text-muted-foreground mb-4">Total invoiced per unit (all statuses)</p>
            {buList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No business units yet.</p>
            ) : (
              <div>
                {buList.map((bu) => (
                  <div
                    key={bu.name}
                    className="flex items-center gap-4 py-3 border-b last:border-0"
                  >
                    <div
                      className="w-2 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: bu.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{bu.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {bu.count} {bu.count === 1 ? "invoice" : "invoices"}
                      </div>
                    </div>
                    <div className="text-sm font-bold tabular-nums text-right">
                      {formatCurrency(bu.total, currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent invoices snapshot */}
        {allInvoices.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-1">Recent Invoices</h3>
            <p className="text-xs text-muted-foreground mb-4">Last 10 invoices across all units</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2 font-medium text-muted-foreground">Invoice #</th>
                    <th className="text-left pb-2 font-medium text-muted-foreground">Client</th>
                    <th className="text-left pb-2 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allInvoices.slice(0, 10).map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5">
                        <a
                          href={`/dashboard/invoices/${inv.id}`}
                          className="font-mono text-xs font-semibold hover:underline"
                        >
                          {inv.invoice_number}
                        </a>
                      </td>
                      <td className="py-2.5 text-muted-foreground truncate max-w-[140px]">
                        {inv.client_name}
                      </td>
                      <td className="py-2.5 hidden sm:table-cell">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            STATUS_COLORS[inv.status as InvoiceStatus]
                          )}
                        >
                          {STATUS_LABELS[inv.status as InvoiceStatus]}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
