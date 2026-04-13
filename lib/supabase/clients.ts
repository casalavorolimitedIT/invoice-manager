import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types/invoice";

export async function getClients(businessUnitId?: string): Promise<Client[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("clients")
    .select("*")
    .eq("is_archived", false)
    .order("name", { ascending: true });

  if (businessUnitId) {
    query = query.eq("business_unit_id", businessUnitId);
  }

  const { data } = await query;
  return (data as Client[]) ?? [];
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  return (data as Client) ?? null;
}
