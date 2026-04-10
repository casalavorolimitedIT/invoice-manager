import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";

export type ProfileRole = "admin" | "staff";

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar: string | null;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
};

export type CurrentUserProfile = {
  user: User | null;
  profile: UserProfile | null;
};

const profileColumns = "id,email,full_name,avatar,role,created_at,updated_at";

function mapAuthUserToProfileSeed(user: User) {
  return {
    id: user.id,
    email: user.email ?? "",
    full_name:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : null,
    avatar:
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null,
  };
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error: upsertError } = await supabase
    .from("profiles")
    .upsert(mapAuthUserToProfileSeed(user), { onConflict: "id" })
    .select(profileColumns)
    .single();

  if (!upsertError) {
    return { user, profile: profile as UserProfile };
  }

  const { data: fallbackProfile } = await supabase
    .from("profiles")
    .select(profileColumns)
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: (fallbackProfile as UserProfile | null) ?? null };
}
