import { NextResponse } from "next/server";
import { createActionClient } from "@/lib/supabase/action";
import { clientSchema } from "@/lib/types/invoice";

export async function POST(request: Request) {
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = clientSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Please fix the errors below.", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  let sourceGuestMetadata: Record<string, string> | undefined;
  const sourceGuestId = typeof body?.source_guest_id === "string" ? body.source_guest_id : undefined;

  if (sourceGuestId) {
    const { data: sourceGuest } = await supabase
      .from("guests")
      .select("id, first_name, last_name, business_unit_id")
      .eq("id", sourceGuestId)
      .eq("is_archived", false)
      .maybeSingle();

    if (!sourceGuest || sourceGuest.business_unit_id !== result.data.business_unit_id) {
      return NextResponse.json({ error: "Selected guest could not be imported into this business unit." }, { status: 400 });
    }

    sourceGuestMetadata = {
      source_guest_id: sourceGuest.id,
      source_guest_name: [sourceGuest.first_name, sourceGuest.last_name].filter(Boolean).join(" "),
    };
  }

  const { error } = await supabase.from("clients").insert({
    ...result.data,
    ...(sourceGuestMetadata ? { metadata: sourceGuestMetadata } : {}),
    user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}