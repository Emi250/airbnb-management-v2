// Backfill de un solo uso: sube al calendario de Notion las reservas activas
// (confirmadas o pendientes, con check-out de hoy en adelante) que todavía no
// tienen página asociada. Idempotente: filtra por notion_page_id is null, así
// que re-correrlo no duplica entradas.
//
// Uso (desde la raíz del repo):
//   npx tsx scripts/backfill-notion.ts
//
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// NOTION_TOKEN y NOTION_DATABASE_ID.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createNotionReservation } from "../lib/notion/reservations";

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
      "id, check_in, check_out, num_guests, total_amount_ars, notion_page_id, property:properties(name), guest:guests(name, phone)"
    )
    .in("status", ["confirmed", "pending"])
    .gte("check_out", today)
    .is("notion_page_id", null)
    .order("check_in");
  if (error) throw new Error(`Error leyendo reservas: ${error.message}`);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    check_in: string;
    check_out: string;
    num_guests: number;
    total_amount_ars: number;
    property: { name: string } | null;
    guest: { name: string; phone: string | null } | null;
  }>;

  console.log(`Reservas activas sin página de Notion: ${rows.length}`);
  let created = 0;
  let failed = 0;

  for (const row of rows) {
    const label = `${row.guest?.name ?? "(sin huésped)"} · ${row.property?.name ?? "(sin propiedad)"} · ${row.check_in} → ${row.check_out}`;
    const result = await createNotionReservation({
      guestName: row.guest?.name ?? null,
      guestPhone: row.guest?.phone ?? null,
      propertyName: row.property?.name ?? null,
      checkIn: row.check_in,
      checkOut: row.check_out,
      numGuests: row.num_guests,
      totalAmountArs: row.total_amount_ars,
    });

    if (!result.ok) {
      failed++;
      console.error(`✗ ${label}: ${result.error}`);
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

  console.log(`\nListo: ${created} creadas, ${failed} con error.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
