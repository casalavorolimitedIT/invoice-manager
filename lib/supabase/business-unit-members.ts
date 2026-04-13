import { createClient } from "@/lib/supabase/server";
import type { BusinessUnitMember } from "@/lib/types/invoice";

export async function getBusinessUnitMembers(
  businessUnitId: string
): Promise<BusinessUnitMember[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase.rpc("get_business_unit_members", {
    p_business_unit_id: businessUnitId,
  });

  return (data as BusinessUnitMember[]) ?? [];
}