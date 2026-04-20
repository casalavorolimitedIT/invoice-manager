import { createClient } from "@/lib/supabase/server";
import { getUserOrNull } from "@/lib/supabase/auth";
import type {
  BusinessUnit,
  BusinessUnitMemberRole,
  PublicGuestFormBusinessUnit,
} from "@/lib/types/invoice";

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

async function getAccessibleBusinessUnits(includeArchived: boolean) {
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_accessible_business_units", {
    p_include_archived: includeArchived,
  });

  return (data as BusinessUnit[]) ?? [];
}

async function getAccessibleBusinessUnit(id: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("get_accessible_business_unit", {
      p_business_unit_id: id,
    })
    .maybeSingle();

  return (data as BusinessUnit | null) ?? null;
}

export async function getBusinessUnits(): Promise<BusinessUnit[]> {
  const supabase = await createClient();
  const user = await getUserOrNull(supabase);
  if (!user) return [];

  const memberships = await getCurrentUserMemberships(user.id);

  const data = await getAccessibleBusinessUnits(false);

  return withCurrentUserAccess((data as BusinessUnit[]) ?? [], user.id, memberships);
}

export async function getAllBusinessUnits(): Promise<BusinessUnit[]> {
  const supabase = await createClient();
  const user = await getUserOrNull(supabase);
  if (!user) return [];

  const memberships = await getCurrentUserMemberships(user.id);

  const data = await getAccessibleBusinessUnits(true);

  return withCurrentUserAccess((data as BusinessUnit[]) ?? [], user.id, memberships);
}

export async function getBusinessUnit(id: string): Promise<BusinessUnit | null> {
  const supabase = await createClient();
  const user = await getUserOrNull(supabase);
  if (!user) return null;

  const memberships = await getCurrentUserMemberships(user.id);

  const businessUnit = await getAccessibleBusinessUnit(id);

  if (!businessUnit) {
    return null;
  }

  return withCurrentUserAccess([businessUnit], user.id, memberships)[0] ?? null;
}

export async function getOwnedBusinessUnit(id: string): Promise<BusinessUnit | null> {
  const supabase = await createClient();
  const user = await getUserOrNull(supabase);
  if (!user) return null;

  const memberships = await getCurrentUserMemberships(user.id);

  const businessUnit = await getAccessibleBusinessUnit(id);

  if (!businessUnit) {
    return null;
  }

  const businessUnitWithAccess = withCurrentUserAccess([businessUnit], user.id, memberships)[0] ?? null;

  if (!businessUnitWithAccess?.current_user_can_manage) {
    return null;
  }

  return businessUnitWithAccess;
}

export async function getPublicGuestFormBusinessUnit(
  slug: string
): Promise<PublicGuestFormBusinessUnit | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("get_public_guest_form_business_unit", {
      p_slug: slug,
    })
    .maybeSingle();

  return (data as PublicGuestFormBusinessUnit | null) ?? null;
}
