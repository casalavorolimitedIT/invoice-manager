import { createActionClient } from "@/lib/supabase/action";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = await createActionClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}