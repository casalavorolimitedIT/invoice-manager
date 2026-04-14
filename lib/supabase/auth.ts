import type { User } from "@supabase/supabase-js";

type SupabaseWithAuth = {
  auth: {
    getUser(): Promise<{ data: { user: User | null } }>;
  };
};

function hasErrorCode(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && typeof (error as { code: unknown }).code === "string";
}

export function isInvalidRefreshTokenError(error: unknown) {
  return hasErrorCode(error) && error.code === "refresh_token_not_found";
}

export async function getUserOrNull(supabase: SupabaseWithAuth) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      return null;
    }

    throw error;
  }
}