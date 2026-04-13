import { NextResponse } from "next/server";
import { createActionClient } from "@/lib/supabase/action";
import { businessUnitSchema } from "@/lib/types/invoice";

interface ActionError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

function getError(error?: ActionError | null) {
  if (!error) return undefined;
  const details = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (error.code === "23503" && details.includes("invoices_business_unit_id_fkey")) {
    return "This business unit cannot be deleted because invoices are still linked to it.";
  }
  return error.message;
}

export async function POST(request: Request) {
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = businessUnitSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Please fix the errors below.", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data: businessUnit, error } = await supabase
    .from("business_units")
    .insert({
      ...result.data,
      code: result.data.code.toUpperCase().trim(),
      user_id: user.id,
    })
    .select("id")
    .single();

  if (error || !businessUnit) {
    return NextResponse.json({ error: getError(error) ?? "Failed to create business unit" }, { status: 400 });
  }

  const { error: membershipError } = await supabase.from("business_unit_members").insert({
    business_unit_id: businessUnit.id,
    user_id: user.id,
    role: "owner",
    invited_by: user.id,
  });

  if (membershipError) {
    await supabase.from("business_units").delete().eq("id", businessUnit.id).eq("user_id", user.id);
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
