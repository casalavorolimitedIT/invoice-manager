"use server";

import { createActionClient } from "@/lib/supabase/action";
import { businessUnitSchema } from "@/lib/types/invoice";
import { redirect } from "next/navigation";

export interface BusinessUnitActionState {
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

export async function createBusinessUnit(
  _prevState: BusinessUnitActionState,
  formData: FormData
): Promise<BusinessUnitActionState> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const result = businessUnitSchema.safeParse(cleanFormData(formData));
  if (!result.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase.from("business_units").insert({
    ...result.data,
    code: result.data.code.toUpperCase().trim(),
    user_id: user.id,
  });

  if (error) return { error: error.message };

  redirect("/dashboard/business-units");
}

export async function updateBusinessUnit(
  id: string,
  _prevState: BusinessUnitActionState,
  formData: FormData
): Promise<BusinessUnitActionState> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const result = businessUnitSchema.safeParse(cleanFormData(formData));
  if (!result.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase
    .from("business_units")
    .update({
      ...result.data,
      code: result.data.code.toUpperCase().trim(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  redirect("/dashboard/business-units");
}

export async function archiveBusinessUnit(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("business_units")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message };
}

export async function unarchiveBusinessUnit(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("business_units")
    .update({ is_archived: false })
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message };
}

export async function deleteBusinessUnit(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("business_units")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message };
}

/**
 * Uploads a logo file to the `logos` Supabase storage bucket.
 * Files are stored under `logos/{user_id}/{uuid}.{ext}` and the bucket is
 * public, so the returned URL can be used directly in img tags.
 *
 * Accepts a FormData containing:
 *   - "file"     : the image File to upload
 *   - "oldPath"  : (optional) existing storage path to delete before uploading
 */
export async function uploadLogo(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file provided" };
  }

  // Optional: delete the previous logo before uploading the new one.
  const oldPath = formData.get("oldPath");
  if (typeof oldPath === "string" && oldPath.trim()) {
    await supabase.storage.from("logos").remove([oldPath.trim()]);
  }

  const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(path);

  return { url: publicUrl };
}
