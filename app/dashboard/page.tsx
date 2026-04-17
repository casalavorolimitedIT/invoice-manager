import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { getInvoices } from "@/lib/supabase/invoices";
import { getClients } from "@/lib/supabase/clients";
import { DashboardOverviewClient } from "./_components/dashboard-overview-client";

export default async function DashboardPage() {
  const { businessUnits, activeBusinessUnit, activeBusinessUnitId } = await getBusinessUnitScope();
  const [clients, recentInvoices] = await Promise.all([
    getClients(activeBusinessUnitId ?? undefined),
    getInvoices({ businessUnitId: activeBusinessUnitId ?? undefined }),
  ]);

  const currency = activeBusinessUnit?.default_currency ?? businessUnits[0]?.default_currency ?? "NGN";
  const scopeLabel = activeBusinessUnit ? activeBusinessUnit.name : "All business units";
  const canCreateInvoice = businessUnits.some((businessUnit) => businessUnit.current_user_can_manage);

  return (
    <DashboardOverviewClient
      businessUnits={businessUnits}
      invoices={recentInvoices}
      clientsCount={clients.length}
      currency={currency}
      scopeLabel={scopeLabel}
      canCreateInvoice={canCreateInvoice}
    />
  );
}
