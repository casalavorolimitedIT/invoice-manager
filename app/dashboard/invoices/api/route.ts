import { NextResponse } from "next/server";
import { createActionClient } from "@/lib/supabase/action";
import { getOwnedBusinessUnit } from "@/lib/supabase/business-units";
import { invoiceSchema } from "@/lib/types/invoice";

export async function POST(request: Request) {
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const result = invoiceSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const input = result.data;
  const bu = await getOwnedBusinessUnit(input.business_unit_id);

  if (!bu) {
    return NextResponse.json({ error: "Business unit not found" }, { status: 404 });
  }

  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discountAmount =
    input.discount_type === "percentage"
      ? (subtotal * input.discount_value) / 100
      : Math.min(input.discount_value, subtotal);
  const taxBase = subtotal - discountAmount;
  const taxAmount = (taxBase * bu.default_tax_rate) / 100;
  const total = taxBase + taxAmount;
  const paidAmount = Math.min(input.paid_amount ?? 0, total);

  const year = new Date().getFullYear();
  const { data: seqNum, error: seqError } = await supabase.rpc("next_invoice_number", {
    p_business_unit_id: input.business_unit_id,
    p_year: year,
  });

  if (seqError) {
    return NextResponse.json({ error: "Failed to generate invoice number" }, { status: 400 });
  }

  const invoiceNumber = `${bu.code}-${year}-${String(seqNum).padStart(3, "0")}`;
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
    return NextResponse.json(
      { error: invoiceError?.message ?? "Failed to create invoice" },
      { status: 400 }
    );
  }

  const { error: itemsError } = await supabase.from("invoice_items").insert(
    input.items.map((item, index) => ({
      invoice_id: invoice.id,
      sort_order: index,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }))
  );

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  await supabase.from("invoice_status_history").insert({
    invoice_id: invoice.id,
    from_status: null,
    to_status: "draft",
  });

  return NextResponse.json({ id: invoice.id });
}