"use server";

import { createActionClient } from "@/lib/supabase/action";
import { invoiceSchema, type InvoiceInput, type InvoiceStatus } from "@/lib/types/invoice";
import { redirect } from "next/navigation";

async function getAuthUser() {
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createInvoice(
  data: InvoiceInput
): Promise<{ error: string } | null> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const result = invoiceSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid data" };
  }

  const input = result.data;

  // Fetch business unit for snapshot + authoritative tax rate
  const { data: bu, error: buError } = await supabase
    .from("business_units")
    .select("*")
    .eq("id", input.business_unit_id)
    .single();

  if (buError || !bu) return { error: "Business unit not found" };

  // Server-side authoritative totals
  const subtotal = input.items.reduce(
    (s, i) => s + i.quantity * i.unit_price,
    0
  );
  const discountAmount =
    input.discount_type === "percentage"
      ? (subtotal * input.discount_value) / 100
      : Math.min(input.discount_value, subtotal);
  const taxBase = subtotal - discountAmount;
  const taxAmount = (taxBase * bu.default_tax_rate) / 100;
  const total = taxBase + taxAmount;
  const paidAmount = Math.min(input.paid_amount ?? 0, total);

  // Atomic invoice number
  const year = new Date().getFullYear();
  const { data: seqNum, error: seqError } = await supabase.rpc(
    "next_invoice_number",
    { p_business_unit_id: input.business_unit_id, p_year: year }
  );
  if (seqError) return { error: "Failed to generate invoice number" };

  const invoiceNumber = `${bu.code}-${year}-${String(seqNum).padStart(3, "0")}`;

  // Insert invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      business_unit_id: input.business_unit_id,
      client_id: input.client_id ?? null,
      invoice_number: invoiceNumber,
      issue_date: input.issue_date,
      due_date: input.due_date,
      status: "draft",
      client_name: input.client_name,
      client_company: input.client_company ?? null,
      client_email: input.client_email ?? null,
      client_address: input.client_address ?? null,
      subtotal,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      discount_amount: discountAmount,
      tax_rate: bu.default_tax_rate,
      tax_label: bu.tax_label,
      tax_amount: taxAmount,
      total,
      currency: bu.default_currency,
      notes: input.notes ?? null,
      payment_terms: input.payment_terms,
      bu_name: bu.name,
      bu_address: bu.address ?? null,
      bu_email: bu.email ?? null,
      bu_phone: bu.phone ?? null,
      bu_tax_id: bu.tax_id ?? null,
      bu_bank_name: bu.bank_name ?? null,
      bu_account_holder_name: bu.account_holder_name ?? null,
      bu_bank_account_number: bu.bank_account_number ?? null,
      bu_bank_swift: bu.bank_swift ?? null,
      bu_bank_iban: bu.bank_iban ?? null,
      bu_footer_legal_text: bu.footer_legal_text ?? null,
      bu_logo_url: bu.logo_url ?? null,
      bu_brand_color: bu.brand_color ?? null,
      bu_tax_label: bu.tax_label,
      metadata: {
        ...(input.metadata ?? {}),
        paid_amount: paidAmount,
      },
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    return { error: invoiceError?.message ?? "Failed to create invoice" };
  }

  // Insert line items
  const { error: itemsError } = await supabase.from("invoice_items").insert(
    input.items.map((item, i) => ({
      invoice_id: invoice.id,
      sort_order: i,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }))
  );
  if (itemsError) return { error: itemsError.message };

  // Status history
  await supabase.from("invoice_status_history").insert({
    invoice_id: invoice.id,
    from_status: null,
    to_status: "draft",
  });

  redirect(`/dashboard/invoices/${invoice.id}`);
}

export async function updateInvoiceStatus(
  id: string,
  newStatus: InvoiceStatus,
  notes?: string
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  // Get current status
  const { data: current } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .single();

  if (!current) return { error: "Invoice not found" };

  const { error } = await supabase
    .from("invoices")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) return { error: error.message };

  await supabase.from("invoice_status_history").insert({
    invoice_id: id,
    from_status: current.status,
    to_status: newStatus,
    notes: notes ?? null,
  });

  return {};
}

export async function deleteInvoice(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  redirect("/dashboard/invoices");
}
