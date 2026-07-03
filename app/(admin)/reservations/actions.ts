"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reservationSchema, type ReservationInput } from "@/lib/schemas";
import {
  archiveNotionReservation,
  createNotionReservation,
  updateNotionReservation,
  type NotionReservationData,
} from "@/lib/notion/reservations";

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

// Sincronización best-effort con el calendario de Notion: corre después de
// escribir la reserva en la BD y nunca hace fallar la acción — si Notion no
// responde, la web sigue funcionando y el error queda en el log del server.
async function syncReservationToNotion(
  supabase: Awaited<ReturnType<typeof ensureAdmin>>,
  id: string
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select(
        "check_in, check_out, num_guests, total_amount_ars, amount_paid_ars, status, notion_page_id, property:properties(name), guest:guests(name, phone)"
      )
      .eq("id", id)
      .maybeSingle();
    if (error || !data) {
      if (error) console.error("[notion] no se pudo leer la reserva:", error.message);
      return;
    }
    const row = data as unknown as {
      check_in: string;
      check_out: string;
      num_guests: number;
      total_amount_ars: number;
      amount_paid_ars: number;
      status: string;
      notion_page_id: string | null;
      property: { name: string } | null;
      guest: { name: string; phone: string | null } | null;
    };

    if (row.status === "cancelled") {
      if (!row.notion_page_id) return;
      const archived = await archiveNotionReservation(row.notion_page_id);
      if (!archived.ok) {
        console.error(`[notion] no se pudo archivar la página de la reserva ${id}:`, archived.error);
        return;
      }
      await supabase.from("reservations").update({ notion_page_id: null }).eq("id", id);
      return;
    }

    const notionData: NotionReservationData = {
      guestName: row.guest?.name ?? null,
      guestPhone: row.guest?.phone ?? null,
      propertyName: row.property?.name ?? null,
      checkIn: row.check_in,
      checkOut: row.check_out,
      numGuests: row.num_guests,
      totalAmountArs: row.total_amount_ars,
      amountPaidArs: row.amount_paid_ars,
    };

    if (row.notion_page_id) {
      const updated = await updateNotionReservation(row.notion_page_id, notionData);
      if (updated.ok) return;
      // La página pudo borrarse a mano en Notion: se intenta recrear abajo.
      console.error(
        `[notion] fallo al actualizar la página de la reserva ${id} (${updated.error}); se recrea`
      );
    }

    const created = await createNotionReservation(notionData);
    if (!created.ok) {
      console.error(`[notion] no se pudo crear la página de la reserva ${id}:`, created.error);
      return;
    }
    await supabase.from("reservations").update({ notion_page_id: created.pageId }).eq("id", id);
  } catch (err) {
    console.error("[notion] error inesperado al sincronizar:", err);
  }
}

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

    await syncReservationToNotion(supabase, data.id);

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

    await syncReservationToNotion(supabase, id);

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

    await syncReservationToNotion(supabase, id);

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
