import { NextResponse } from "next/server";
import { ACTIVE_BUSINESS_UNIT_COOKIE } from "@/lib/business-unit-scope";
import { getUserOrNull } from "@/lib/supabase/auth";
import { createActionClient } from "@/lib/supabase/action";
import { getBusinessUnit } from "@/lib/supabase/business-units";

export async function POST(request: Request) {
  const supabase = await createActionClient();
  const user = await getUserOrNull(supabase);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { businessUnitId?: string } | null;
  const businessUnitId = body?.businessUnitId;

  if (!businessUnitId) {
    return NextResponse.json({ error: "Business unit is required." }, { status: 400 });
  }

  const businessUnit = await getBusinessUnit(businessUnitId);

  if (!businessUnit || businessUnit.is_archived) {
    return NextResponse.json({ error: "Business unit not found." }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTIVE_BUSINESS_UNIT_COOKIE, businessUnitId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}