import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { getUserOrNull } from "../supabase/auth";

export async function redirectIfNotAuthenticated(path = "/login") {
  const supabase = await createClient();
  const user = await getUserOrNull(supabase);

  if (!user) {
    redirect(path);
  }
}
