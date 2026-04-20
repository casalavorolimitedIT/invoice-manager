import { createClient } from "@/lib/supabase/server";
import { GUEST_IDENTIFICATION_BUCKET } from "@/lib/upload/images";
import type { Guest, GuestWithImageUrl } from "@/lib/types/invoice";

async function getSignedIdentificationImageUrl(path?: string | null) {
  if (!path) return null;

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(GUEST_IDENTIFICATION_BUCKET)
    .createSignedUrl(path, 60 * 60);

  return data?.signedUrl ?? null;
}

export async function getGuests(businessUnitId?: string): Promise<GuestWithImageUrl[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("guests")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (businessUnitId) {
    query = query.eq("business_unit_id", businessUnitId);
  }

  const { data } = await query;
  const guests = (data as Guest[]) ?? [];

  return Promise.all(
    guests.map(async (guest) => ({
      ...guest,
      identification_image_url: await getSignedIdentificationImageUrl(guest.identification_image_path),
    }))
  );
}

export async function getGuest(id: string): Promise<GuestWithImageUrl | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase.from("guests").select("*").eq("id", id).maybeSingle();
  const guest = (data as Guest | null) ?? null;

  if (!guest) return null;

  return {
    ...guest,
    identification_image_url: await getSignedIdentificationImageUrl(guest.identification_image_path),
  };
}