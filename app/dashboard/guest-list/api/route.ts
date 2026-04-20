import { NextResponse } from "next/server";
import { createActionClient } from "@/lib/supabase/action";
import { guestSchema } from "@/lib/types/invoice";

export async function POST(request: Request) {
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = guestSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Please fix the errors below.", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("guests").insert({
    ...result.data,
    user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}