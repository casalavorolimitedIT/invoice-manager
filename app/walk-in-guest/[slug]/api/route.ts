import { NextResponse } from "next/server";
import { z } from "zod";
import { guestSchema } from "@/lib/types/invoice";
import { createActionClient } from "@/lib/supabase/action";

const publicGuestSchema = guestSchema.omit({ business_unit_id: true }).extend({
  // email is optional on the public walk-in form (nullable in DB)
  email: z.string().email("Enter a valid email address").optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createActionClient();
  const body = await request.json().catch(() => null);
  const result = publicGuestSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Please fix the errors below.", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const payload = result.data;
  const { error } = await supabase.rpc("submit_public_guest", {
    p_slug: slug,
    p_first_name: payload.first_name,
    p_last_name: payload.last_name,
    p_phone_number: payload.phone_number,
    p_email: payload.email,
    p_birthday: payload.birthday,
    p_gender: payload.gender,
    p_nationality: payload.nationality,
    p_identification_type: payload.identification_type ?? null,
    p_identification_number: payload.identification_number ?? null,
    p_identification_image_path: payload.identification_image_path ?? null,
    p_emergency_contact: payload.emergency_contact,
    p_notes: null,
    p_metadata: {},
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}