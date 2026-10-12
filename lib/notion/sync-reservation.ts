import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  archiveNotionReservation, createNotionReservation, updateNotionReservation,
  type NotionReservationData,
} from "./reservations";

// Sincronización best-effort con el calendario de Notion: corre después de
// escribir la reserva en la BD y nunca hace fallar la acción — si Notion no
// responde, la web sigue funcionando y el error queda en el log del server.
export async function syncReservationToNotion(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<string | undefined> {
  if (!process.env.NOTION_TOKEN && !process.env.NOTION_DATABASE_ID) return;
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select(
        "check_in, check_out, num_guests, total_amount_ars, amount_paid_ars, status, bed_setup, notion_page_id, property:properties(name), guest:guests(name, phone)"
      )
      .eq("id", id)
      .maybeSingle();
    if (error || !data) {
      if (error) console.error("[notion] no se pudo leer la reserva:", error.message);
      return "La reserva se guardó, pero no se pudo leer para sincronizar con Notion.";
    }
    const row = data as unknown as {
      check_in: string;
      check_out: string;
      num_guests: number;
      total_amount_ars: number;
      amount_paid_ars: number;
      status: string;
      bed_setup: "together" | "separate" | null;
      notion_page_id: string | null;
      property: { name: string } | null;
      guest: { name: string; phone: string | null } | null;
    };

    if (row.status === "cancelled") {
      if (!row.notion_page_id) return;
      const archived = await archiveNotionReservation(row.notion_page_id);
      if (!archived.ok) {
        console.error(`[notion] no se pudo archivar la página de la reserva ${id}:`, archived.error);
        return "La reserva se canceló, pero no se pudo archivar en Notion. Volvé a guardar para reintentar.";
      }
      const { error: unlinkError } = await supabase.from("reservations").update({ notion_page_id: null }).eq("id", id);
      if (unlinkError) throw unlinkError;
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
      bedSetup: row.bed_setup,
    };

    if (row.notion_page_id) {
      const updated = await updateNotionReservation(row.notion_page_id, notionData);
      if (updated.ok) return;
      // Un fallo de actualización no demuestra que la página haya desaparecido.
      // Conservar el vínculo evita duplicarla ante timeouts o errores temporales.
      console.error(
        `[notion] fallo al actualizar la página de la reserva ${id}: ${updated.error}`
      );
      return "La reserva se guardó, pero Notion no se actualizó. Volvé a guardar para reintentar.";
    }

    const created = await createNotionReservation(notionData);
    if (!created.ok) {
      console.error(`[notion] no se pudo crear la página de la reserva ${id}:`, created.error);
      return "La reserva se guardó, pero no se pudo crear en Notion. Revisá la integración antes de reintentar.";
    }
    const { error: linkError } = await supabase.from("reservations").update({ notion_page_id: created.pageId }).eq("id", id);
    if (linkError) throw linkError;
  } catch (err) {
    console.error("[notion] error inesperado al sincronizar:", err);
    return "La reserva se guardó, pero hubo un error de sincronización con Notion.";
  }
}
