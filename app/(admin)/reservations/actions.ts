"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reservationSchema, type ReservationInput } from "@/lib/schemas";

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (data?.role !== "admin") throw new Error("Acceso restringido");
  return supabase;
}

export type ActionResult = { success: true; id?: string } | { success: false; error: string };

export async function createReservationAction(input: ReservationInput): Promise<ActionResult> {
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    const supabase = await ensureAdmin();
    let guestId = parsed.data.guest_id ?? null;

    if (!guestId && parsed.data.new_guest_name) {
      const { data: newGuest, error: gErr } = await supabase
        .from("guests")
        .insert({
          name: parsed.data.new_guest_name,
          phone: parsed.data.new_guest_phone || null,
          email: parsed.data.new_guest_email || null,
          country: parsed.data.new_guest_country || null,
        })
        .select("id")
        .single();
      if (gErr) return { success: false, error: gErr.message };
      guestId = newGuest.id;
    }

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        property_id: parsed.data.property_id,
        guest_id: guestId,
        check_in: parsed.data.check_in,
        check_out: parsed.data.check_out,
        num_guests: parsed.data.num_guests,
        total_amount_ars: parsed.data.total_amount_ars,
        amount_paid_ars: parsed.data.amount_paid_ars,
        source: parsed.data.source,
        platform_fee_ars: parsed.data.platform_fee_ars,
        cleaning_fee_ars: parsed.data.cleaning_fee_ars,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: friendlyError(error.message) };

    revalidatePath("/reservations");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { success: true, id: data.id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateReservationAction(
  id: string,
  input: ReservationInput
): Promise<ActionResult> {
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    const supabase = await ensureAdmin();
    let guestId = parsed.data.guest_id ?? null;

    if (!guestId && parsed.data.new_guest_name) {
      const { data: newGuest, error: gErr } = await supabase
        .from("guests")
        .insert({
          name: parsed.data.new_guest_name,
          phone: parsed.data.new_guest_phone || null,
          email: parsed.data.new_guest_email || null,
          country: parsed.data.new_guest_country || null,
        })
        .select("id")
        .single();
      if (gErr) return { success: false, error: gErr.message };
      guestId = newGuest.id;
    }

    const { error } = await supabase
      .from("reservations")
      .update({
        property_id: parsed.data.property_id,
        guest_id: guestId,
        check_in: parsed.data.check_in,
        check_out: parsed.data.check_out,
        num_guests: parsed.data.num_guests,
        total_amount_ars: parsed.data.total_amount_ars,
        amount_paid_ars: parsed.data.amount_paid_ars,
        source: parsed.data.source,
        platform_fee_ars: parsed.data.platform_fee_ars,
        cleaning_fee_ars: parsed.data.cleaning_fee_ars,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
      })
      .eq("id", id);

    if (error) return { success: false, error: friendlyError(error.message) };

    revalidatePath("/reservations");
    revalidatePath(`/reservations/${id}`);
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { success: true, id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function cancelReservationAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await ensureAdmin();
    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/reservations");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { success: true, id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

function friendlyError(msg: string) {
  if (msg.includes("Conflicto de fechas") || msg.includes("overlap"))
    return "Conflicto de fechas: ya existe una reserva activa en esta propiedad para el rango indicado.";
  if (msg.includes("check_dates"))
    return "Las fechas son inválidas (check-out debe ser posterior a check-in).";
  return msg;
}

export async function redirectToReservation(id: string) {
  redirect(`/reservations/${id}`);
}
