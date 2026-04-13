"use server";

import { createActionClient } from "@/lib/supabase/action";
import { clientSchema } from "@/lib/types/invoice";
import { redirect } from "next/navigation";

export interface ClientActionState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

async function getAuthUser() {
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function cleanFormData(formData: FormData) {
  const raw: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") raw[key] = value;
  });
  return raw;
}

export async function createClient(
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const result = clientSchema.safeParse(cleanFormData(formData));
  if (!result.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase.from("clients").insert({
    ...result.data,
    user_id: user.id,
  });

  if (error) return { error: error.message };

  redirect("/dashboard/clients");
}

export async function updateClient(
  id: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const result = clientSchema.safeParse(cleanFormData(formData));
  if (!result.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase
    .from("clients")
    .update(result.data)
    .eq("id", id);

  if (error) return { error: error.message };

  redirect("/dashboard/clients");
}

export async function archiveClient(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("clients")
    .update({ is_archived: true })
    .eq("id", id);

  return { error: error?.message };
}

export async function deleteClient(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id);

  return { error: error?.message };
}
