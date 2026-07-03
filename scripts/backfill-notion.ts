// Sincroniza al calendario de Notion las reservas activas (confirmadas o
// pendientes, con check-out de hoy en adelante):
//   - las que no tienen página → las crea y guarda el notion_page_id;
//   - las que ya tienen página → las actualiza (útil para reflejar cambios de
//     mapeo, p. ej. el "Monto a pagar" como saldo pendiente).
// Idempotente: re-correrlo no duplica; solo actualiza.
//
// Uso (desde la raíz del repo):
//   npx tsx scripts/backfill-notion.ts
//
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// NOTION_TOKEN y NOTION_DATABASE_ID.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  createNotionReservation,
  updateNotionReservation,
  type NotionReservationData,
} from "../lib/notion/reservations";

// Carga .env.local sin depender de dotenv. No pisa variables ya definidas.
function loadEnvLocal() {
  let content: string;
  try {
    content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || line.trim().startsWith("#")) continue;
    const [, key, value] = match;
    if (!(key in process.env)) process.env[key] = value;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
  if (!serviceKey)
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local (Supabase dashboard → Settings → API keys)"
    );

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id, check_in, check_out, num_guests, total_amount_ars, amount_paid_ars, notion_page_id, property:properties(name), guest:guests(name, phone)"
    )
    .in("status", ["confirmed", "pending"])
    .gte("check_out", today)
    .order("check_in");
  if (error) throw new Error(`Error leyendo reservas: ${error.message}`);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    check_in: string;
    check_out: string;
    num_guests: number;
    total_amount_ars: number;
    amount_paid_ars: number;
    notion_page_id: string | null;
    property: { name: string } | null;
    guest: { name: string; phone: string | null } | null;
  }>;

  console.log(`Reservas activas a sincronizar: ${rows.length}`);
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    const label = `${row.guest?.name ?? "(sin huésped)"} · ${row.property?.name ?? "(sin propiedad)"} · ${row.check_in} → ${row.check_out}`;
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

    // Si ya tiene página, intentar actualizarla. Si la página fue archivada o
    // borrada a mano en Notion, el update falla: se recrea (igual que la app).
    if (row.notion_page_id) {
      const result = await updateNotionReservation(row.notion_page_id, notionData);
      if (result.ok) {
        updated++;
        console.log(`↻ ${label}`);
        await sleep(350);
        continue;
      }
      console.error(`… ${label}: no se pudo actualizar (${result.error}); se recrea`);
    }

    const result = await createNotionReservation(notionData);
    if (!result.ok) {
      failed++;
      console.error(`✗ ${label} (create): ${result.error}`);
    } else {
      const { error: upErr } = await supabase
        .from("reservations")
        .update({ notion_page_id: result.pageId })
        .eq("id", row.id);
      if (upErr) {
        failed++;
        console.error(`✗ ${label}: página creada pero no se pudo guardar el id (${upErr.message})`);
      } else {
        created++;
        console.log(`✓ ${label}`);
      }
    }

    // Notion limita a ~3 requests/segundo.
    await sleep(350);
  }

  console.log(`\nListo: ${created} creadas, ${updated} actualizadas, ${failed} con error.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
