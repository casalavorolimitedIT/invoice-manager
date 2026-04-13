import { createClient } from "@/lib/supabase/server";
import type { BusinessUnit, BusinessUnitMemberRole } from "@/lib/types/invoice";

type BusinessUnitMembershipRow = {
  business_unit_id: string;
  role: BusinessUnitMemberRole;
};

function withCurrentUserAccess(
  businessUnits: BusinessUnit[],
  userId: string,
  memberships: BusinessUnitMembershipRow[]
) {
  const membershipMap = new Map(
    memberships.map((membership) => [membership.business_unit_id, membership.role])
  );

  return businessUnits.map((businessUnit) => {
    const currentUserRole =
      businessUnit.user_id === userId ? "owner" : membershipMap.get(businessUnit.id) ?? null;

    return {
      ...businessUnit,
      current_user_role: currentUserRole,
      current_user_can_manage: currentUserRole === "owner",
    } satisfies BusinessUnit;
  });
}

async function getCurrentUserMemberships(userId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("business_unit_members")
    .select("business_unit_id, role")
    .eq("user_id", userId);

  return (data as BusinessUnitMembershipRow[]) ?? [];
}

export async function getBusinessUnits(): Promise<BusinessUnit[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const memberships = await getCurrentUserMemberships(user.id);

  const { data } = await supabase
    .from("business_units")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  return withCurrentUserAccess((data as BusinessUnit[]) ?? [], user.id, memberships);
}

export async function getAllBusinessUnits(): Promise<BusinessUnit[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const memberships = await getCurrentUserMemberships(user.id);

  const { data } = await supabase
    .from("business_units")
    .select("*")
    .order("is_archived", { ascending: true })
    .order("created_at", { ascending: false });

  return withCurrentUserAccess((data as BusinessUnit[]) ?? [], user.id, memberships);
}

export async function getBusinessUnit(id: string): Promise<BusinessUnit | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const memberships = await getCurrentUserMemberships(user.id);

  const { data } = await supabase
    .from("business_units")
    .select("*")
    .eq("id", id)
    .single();

  const businessUnit = (data as BusinessUnit | null) ?? null;

  if (!businessUnit) {
    return null;
  }

  return withCurrentUserAccess([businessUnit], user.id, memberships)[0] ?? null;
}

export async function getOwnedBusinessUnit(id: string): Promise<BusinessUnit | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const memberships = await getCurrentUserMemberships(user.id);

  const { data } = await supabase
    .from("business_units")
    .select("*")
    .eq("id", id)
    .single();

  const businessUnit = (data as BusinessUnit | null) ?? null;

  if (!businessUnit) {
    return null;
  }

  const businessUnitWithAccess = withCurrentUserAccess([businessUnit], user.id, memberships)[0] ?? null;

  if (!businessUnitWithAccess?.current_user_can_manage) {
    return null;
  }

  return businessUnitWithAccess;
}
