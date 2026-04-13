import { NextResponse } from "next/server";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { INVOICE_STATUSES } from "@/lib/types/invoice";

const updateInvoiceStatusSchema = z.object({
  newStatus: z.enum(INVOICE_STATUSES),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const result = updateInvoiceStatusSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid status update." }, { status: 400 });
  }

  const { data: current } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .single();

  if (!current) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("invoices")
    .update({ status: result.data.newStatus })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("invoice_status_history").insert({
    invoice_id: id,
    from_status: current.status,
    to_status: result.data.newStatus,
    notes: null,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ redirectTo: "/dashboard/invoices" });
}