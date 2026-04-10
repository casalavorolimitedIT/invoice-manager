import { cookies } from "next/headers";
import { getAllBusinessUnits, getBusinessUnits } from "@/lib/supabase/business-units";
import type { BusinessUnit } from "@/lib/types/invoice";

export const ACTIVE_BUSINESS_UNIT_COOKIE = "active_business_unit_id";

function isSelectableBusinessUnit(businessUnit: BusinessUnit) {
  return !businessUnit.is_archived;
}

export async function getStoredActiveBusinessUnitId() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_BUSINESS_UNIT_COOKIE)?.value ?? null;
}

export function resolveActiveBusinessUnit(
  businessUnits: BusinessUnit[],
  requestedBusinessUnitId?: string | null
) {
  const selectableBusinessUnits = businessUnits.filter(isSelectableBusinessUnit);
  const activeBusinessUnit =
    selectableBusinessUnits.find((businessUnit) => businessUnit.id === requestedBusinessUnitId) ??
    selectableBusinessUnits[0] ??
    null;

  return {
    selectableBusinessUnits,
    activeBusinessUnit,
    activeBusinessUnitId: activeBusinessUnit?.id ?? null,
  };
}

export async function getBusinessUnitScope(options?: { includeArchived?: boolean }) {
  const businessUnits = options?.includeArchived
    ? await getAllBusinessUnits()
    : await getBusinessUnits();
  const requestedBusinessUnitId = await getStoredActiveBusinessUnitId();

  return {
    businessUnits,
    ...resolveActiveBusinessUnit(businessUnits, requestedBusinessUnitId),
  };
}