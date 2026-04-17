import { getInvoices } from "@/lib/supabase/invoices";
import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { ReportsClient } from "./_components/reports-client";

export default async function ReportsPage() {
  const { businessUnits, activeBusinessUnit, activeBusinessUnitId } = await getBusinessUnitScope();
  const reportBusinessUnits = activeBusinessUnit ? [activeBusinessUnit] : businessUnits;
  const allInvoices = await getInvoices({ businessUnitId: activeBusinessUnitId ?? undefined });

  const currency = activeBusinessUnit?.default_currency ?? businessUnits[0]?.default_currency ?? "NGN";

  return (
    <ReportsClient
      businessUnits={reportBusinessUnits}
      invoices={allInvoices}
      currency={currency}
      scopeLabel={activeBusinessUnit ? activeBusinessUnit.name : "All business units"}
    />
  );
}
