import { createClient } from "@/lib/supabase/server";
import type { Invoice, InvoiceStatus } from "@/lib/types/invoice";

export async function getInvoices(opts?: {
  businessUnitId?: string;
  status?: InvoiceStatus;
}): Promise<Invoice[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (opts?.businessUnitId) {
    query = query.eq("business_unit_id", opts.businessUnitId);
  }
  if (opts?.status) {
    query = query.eq("status", opts.status);
  }

  const { data } = await query;
  return (data as Invoice[]) ?? [];
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("invoices")
    .select("*, items:invoice_items(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .order("sort_order", { referencedTable: "invoice_items", ascending: true })
    .single();

  return (data as Invoice) ?? null;
}

export async function getInvoiceStats(businessUnitId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from("invoices")
    .select("status, total")
    .eq("user_id", user.id);

  if (businessUnitId) {
    query = query.eq("business_unit_id", businessUnitId);
  }

  const { data } = await query;
  if (!data) return null;

  const stats = {
    // monetary totals
    total: 0, paid: 0, outstanding: 0, overdue: 0, draft: 0,
    // counts
    count: 0, paidCount: 0, outstandingCount: 0, overdueCount: 0, draftCount: 0,
  };
  for (const inv of data) {
    stats.total += inv.total ?? 0;
    stats.count += 1;
    if (inv.status === "paid") { stats.paid += inv.total ?? 0; stats.paidCount += 1; }
    if (inv.status === "sent") { stats.outstanding += inv.total ?? 0; stats.outstandingCount += 1; }
    if (inv.status === "overdue") { stats.overdue += inv.total ?? 0; stats.overdueCount += 1; }
    if (inv.status === "draft") { stats.draft += inv.total ?? 0; stats.draftCount += 1; }
  }
  return stats;
}
