"use server";

import { cookies } from "next/headers";
import { ACTIVE_BUSINESS_UNIT_COOKIE } from "@/lib/business-unit-scope";
import { getBusinessUnit } from "@/lib/supabase/business-units";

export async function setActiveBusinessUnitScope(businessUnitId: string) {
  const businessUnit = await getBusinessUnit(businessUnitId);

  if (!businessUnit || businessUnit.is_archived) {
    return { error: "Business unit not found." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_BUSINESS_UNIT_COOKIE, businessUnitId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { error: undefined };
}