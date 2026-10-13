"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scheduleNotionSync } from "@/lib/notion/schedule";
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

export type ActionResult = { success: true; id?: string; warning?: string } | { success: false; error: string };

async function saveReservation(id: string | null, input: ReservationInput): Promise<ActionResult> {
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  try {
    const supabase = await ensureAdmin();
    const { data, error } = await supabase.rpc("save_reservation", {
      p_id: id,
      p_input: parsed.data,
    });
    if (error) return { success: false, error: friendlyError(error.message) };
    if (!data) return { success: false, error: "No se pudo guardar la reserva" };
    scheduleNotionSync(data);
    revalidatePath("/", "layout");
    return { success: true, id: data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function createReservationAction(input: ReservationInput): Promise<ActionResult> {
  return saveReservation(null, input);
}

export async function updateReservationAction(id: string, input: ReservationInput): Promise<ActionResult> {
  return saveReservation(id, input);
}

export async function cancelReservationAction(id: string, version: number): Promise<ActionResult> {
  try {
    const supabase = await ensureAdmin();
    const { data, error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", id).eq("version",version).select("id").maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "La reserva cambió o ya no está disponible. Recargá la página." };

    scheduleNotionSync(id);
    revalidatePath("/", "layout");
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
