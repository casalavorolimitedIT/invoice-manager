"use server";

import { createActionClient } from "@/lib/supabase/action";
import {
  BUSINESS_UNIT_MEMBER_ROLES,
  businessUnitSchema,
  type BusinessUnitMemberRole,
} from "@/lib/types/invoice";
import { z } from "zod";

export interface BusinessUnitActionState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  redirectTo?: string;
}

interface ActionError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

type ProfileLookupResult = {
  id: string;
  email: string;
  full_name: string | null;
  avatar: string | null;
};

const inviteBusinessUnitMemberSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.enum(BUSINESS_UNIT_MEMBER_ROLES).default("viewer"),
});

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

function getBusinessUnitActionError(error?: ActionError | null) {
  if (!error) return undefined;

  const details = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasLinkedInvoices =
    error.code === "23503" &&
    details.includes("invoices_business_unit_id_fkey");

  if (hasLinkedInvoices) {
    return "This business unit cannot be deleted because invoices are still linked to it. Move those invoices to another business unit or delete them first.";
  }

  return error.message;
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

  const { data: businessUnit, error } = await supabase
    .from("business_units")
    .insert({
      ...result.data,
      code: result.data.code.toUpperCase().trim(),
      user_id: user.id,
    })
    .select("id")
    .single();

  if (error || !businessUnit) return { error: getBusinessUnitActionError(error) };

  const { error: membershipError } = await supabase.from("business_unit_members").insert({
    business_unit_id: businessUnit.id,
    user_id: user.id,
    role: "owner",
    invited_by: user.id,
  });

  if (membershipError) {
    await supabase.from("business_units").delete().eq("id", businessUnit.id).eq("user_id", user.id);
    return { error: membershipError.message };
  }

  return { redirectTo: "/dashboard/business-units" };
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
    .eq("id", id);

  if (error) return { error: getBusinessUnitActionError(error) };

  return { redirectTo: "/dashboard/business-units" };
}

export async function archiveBusinessUnit(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("business_units")
    .update({ is_archived: true })
    .eq("id", id);

  return { error: getBusinessUnitActionError(error) };
}

export async function unarchiveBusinessUnit(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("business_units")
    .update({ is_archived: false })
    .eq("id", id);

  return { error: getBusinessUnitActionError(error) };
}

export async function deleteBusinessUnit(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("business_units")
    .delete()
    .eq("id", id);

  return { error: getBusinessUnitActionError(error) };
}

export async function inviteBusinessUnitMember(
  businessUnitId: string,
  payload: { email: string; role: BusinessUnitMemberRole }
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const result = inviteBusinessUnitMemberSchema.safeParse({
    email: payload.email.trim().toLowerCase(),
    role: payload.role,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid invite payload" };
  }

  const { data: businessUnit } = await supabase
    .from("business_units")
    .select("id, user_id, name")
    .eq("id", businessUnitId)
    .eq("user_id", user.id)
    .single();

  if (!businessUnit) {
    return { error: "Only the business-unit owner can invite members." };
  }

  const { data: profile } = await supabase
    .rpc("get_profile_by_email", { p_email: result.data.email })
    .single<ProfileLookupResult>();

  if (!profile?.id) {
    return { error: "No existing user was found with that email address." };
  }

  if (profile.id === user.id) {
    return { error: "The business-unit owner already has access." };
  }

  const { error } = await supabase.from("business_unit_members").insert({
    business_unit_id: businessUnitId,
    user_id: profile.id,
    role: result.data.role,
    invited_by: user.id,
  });

  if (error?.code === "23505") {
    return { error: "That user already has access to this business unit." };
  }

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function removeBusinessUnitMember(
  businessUnitId: string,
  memberUserId: string
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { data: businessUnit } = await supabase
    .from("business_units")
    .select("id, user_id")
    .eq("id", businessUnitId)
    .eq("user_id", user.id)
    .single();

  if (!businessUnit) {
    return { error: "Only the business-unit owner can remove members." };
  }

  if (memberUserId === user.id) {
    return { error: "The owner cannot remove themselves from the business unit." };
  }

  const { error } = await supabase
    .from("business_unit_members")
    .delete()
    .eq("business_unit_id", businessUnitId)
    .eq("user_id", memberUserId);

  if (error) {
    return { error: error.message };
  }

  return {};
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
