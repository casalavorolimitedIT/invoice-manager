import { NextResponse } from "next/server";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import {
  BUSINESS_UNIT_MEMBER_ROLES,
  type BusinessUnitMemberRole,
} from "@/lib/types/invoice";

const inviteBusinessUnitMemberSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.enum(BUSINESS_UNIT_MEMBER_ROLES).default("viewer"),
});

const removeBusinessUnitMemberSchema = z.object({
  memberUserId: z.string().uuid("Invalid member identifier"),
});

const updateBusinessUnitMemberSchema = z.object({
  memberUserId: z.string().uuid("Invalid member identifier"),
  role: z.enum(BUSINESS_UNIT_MEMBER_ROLES),
});

type ProfileLookupResult = {
  id: string;
  email: string;
  full_name: string | null;
  avatar: string | null;
};

async function getAuthContext() {
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

async function getOwnedBusinessUnit(supabase: Awaited<ReturnType<typeof createActionClient>>, businessUnitId: string, userId: string) {
  const { data } = await supabase
    .from("business_units")
    .select("id, user_id, name")
    .eq("id", businessUnitId)
    .single();

  if (!data) {
    return null;
  }

  const { data: membership } = await supabase
    .from("business_unit_members")
    .select("role")
    .eq("business_unit_id", businessUnitId)
    .eq("user_id", userId)
    .maybeSingle();

  const isOwner = data.user_id === userId || membership?.role === "owner";

  return isOwner ? data : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const result = inviteBusinessUnitMemberSchema.safeParse({
    email: typeof json?.email === "string" ? json.email.trim().toLowerCase() : json?.email,
    role: json?.role as BusinessUnitMemberRole | undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Invalid invite payload" },
      { status: 400 }
    );
  }

  const businessUnit = await getOwnedBusinessUnit(supabase, id, user.id);

  if (!businessUnit) {
    return NextResponse.json(
      { error: "Only the business-unit owner can invite members." },
      { status: 403 }
    );
  }

  const { data: profile } = await supabase
    .rpc("get_profile_by_email", { p_email: result.data.email })
    .single<ProfileLookupResult>();

  if (!profile?.id) {
    return NextResponse.json(
      { error: "No existing user was found with that email address." },
      { status: 404 }
    );
  }

  if (profile.id === user.id) {
    return NextResponse.json(
      { error: "The business-unit owner already has access." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("business_unit_members").insert({
    business_unit_id: id,
    user_id: profile.id,
    role: result.data.role,
    invited_by: user.id,
  });

  if (error?.code === "23505") {
    return NextResponse.json(
      { error: "That user already has access to this business unit." },
      { status: 409 }
    );
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const result = removeBusinessUnitMemberSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Invalid member payload" },
      { status: 400 }
    );
  }

  const businessUnit = await getOwnedBusinessUnit(supabase, id, user.id);

  if (!businessUnit) {
    return NextResponse.json(
      { error: "Only the business-unit owner can remove members." },
      { status: 403 }
    );
  }

  if (result.data.memberUserId === user.id) {
    return NextResponse.json(
      { error: "The owner cannot remove themselves from the business unit." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("business_unit_members")
    .delete()
    .eq("business_unit_id", id)
    .eq("user_id", result.data.memberUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const result = updateBusinessUnitMemberSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Invalid role update payload" },
      { status: 400 }
    );
  }

  const businessUnit = await getOwnedBusinessUnit(supabase, id, user.id);

  if (!businessUnit) {
    return NextResponse.json(
      { error: "Only business-unit owners can update member roles." },
      { status: 403 }
    );
  }

  if (result.data.memberUserId === user.id) {
    return NextResponse.json(
      { error: "You cannot change your own owner role from this screen." },
      { status: 400 }
    );
  }

  const { data: existingMember } = await supabase
    .from("business_unit_members")
    .select("user_id, role")
    .eq("business_unit_id", id)
    .eq("user_id", result.data.memberUserId)
    .single();

  if (!existingMember) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("business_unit_members")
    .update({ role: result.data.role })
    .eq("business_unit_id", id)
    .eq("user_id", result.data.memberUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}