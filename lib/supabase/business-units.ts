import { createClient } from "@/lib/supabase/server";
import type { BusinessUnit } from "@/lib/types/invoice";

export async function getBusinessUnits(): Promise<BusinessUnit[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("business_units")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  return (data as BusinessUnit[]) ?? [];
}

export async function getAllBusinessUnits(): Promise<BusinessUnit[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("business_units")
    .select("*")
    .eq("user_id", user.id)
    .order("is_archived", { ascending: true })
    .order("created_at", { ascending: false });

  return (data as BusinessUnit[]) ?? [];
}

export async function getBusinessUnit(id: string): Promise<BusinessUnit | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("business_units")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  return (data as BusinessUnit) ?? null;
}
