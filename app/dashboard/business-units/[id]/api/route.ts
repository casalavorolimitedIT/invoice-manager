import { NextResponse } from "next/server";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";

interface ActionError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

const businessUnitStateSchema = z.object({
  isArchived: z.boolean(),
});

function getBusinessUnitActionError(error?: ActionError | null) {
  if (!error) return undefined;

  const details = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasLinkedInvoices =
    error.code === "23503" && details.includes("invoices_business_unit_id_fkey");

  if (hasLinkedInvoices) {
    return "This business unit cannot be deleted because invoices are still linked to it. Move those invoices to another business unit or delete them first.";
  }

  return error.message;
}

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
  const result = businessUnitStateSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid business unit update." }, { status: 400 });
  }

  const { error } = await supabase
    .from("business_units")
    .update({ is_archived: result.data.isArchived })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: getBusinessUnitActionError(error) }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(
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

  const { businessUnitSchema } = await import("@/lib/types/invoice");

  const body = await request.json().catch(() => null);
  const result = businessUnitSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Please fix the errors below." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("business_units")
    .update({
      ...result.data,
      code: result.data.code.toUpperCase().trim(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: getBusinessUnitActionError(error) }, { status: 400 });
  }

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
    .from("business_units")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: getBusinessUnitActionError(error) }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}