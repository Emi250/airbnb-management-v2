// Limpieza puntual de duplicados en el calendario de Notion.
//
// Para cada reserva activa, la BD guarda el notion_page_id "canónico". Si en
// Notion hay OTRAS páginas con el mismo huésped + check-in + check-out (creadas
// a mano o por una recreación previa), este script las archiva y deja solo la
// canónica. No toca páginas que no coincidan con ninguna reserva activa.
//
// Uso: npx tsx scripts/dedupe-notion.ts        (dry-run, solo lista)
//      npx tsx scripts/dedupe-notion.ts --apply (archiva los duplicados)

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { archiveNotionReservation } from "../lib/notion/reservations";

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
const key = (guest: string, ci: string, co: string) =>
  `${(guest || "").trim().toLowerCase()}|${ci}|${co}`;

async function main() {
  loadEnvLocal();
  const apply = process.argv.includes("--apply");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const token = process.env.NOTION_TOKEN!;
  const databaseId = process.env.NOTION_DATABASE_ID!;
  if (!url || !serviceKey || !token || !databaseId)
    throw new Error("Faltan variables en .env.local");

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Canónicas: page_id que la BD reconoce, indexado por huésped+fechas.
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("reservations")
    .select("check_in, check_out, notion_page_id, guest:guests(name)")
    .in("status", ["confirmed", "pending"])
    .gte("check_out", today);
  if (error) throw new Error(error.message);

  const canonical = new Map<string, string>(); // key -> page_id canónico
  for (const r of (data ?? []) as unknown as Array<{
    check_in: string;
    check_out: string;
    notion_page_id: string | null;
    guest: { name: string } | null;
  }>) {
    if (r.notion_page_id && r.guest?.name)
      canonical.set(key(r.guest.name, r.check_in, r.check_out), r.notion_page_id);
  }

  // Todas las páginas visibles (no archivadas) de la base.
  const pages: Array<{ id: string; k: string; label: string }> = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Notion query: ${JSON.stringify(json).slice(0, 300)}`);
    for (const p of json.results as Array<Record<string, any>>) {
      const pr = p.properties;
      const guest = (pr["Huésped"]?.title ?? []).map((t: any) => t.plain_text).join("");
      const ci = pr["Check-in"]?.date?.start ?? "";
      const co = pr["Check-out"]?.date?.start ?? "";
      pages.push({ id: p.id, k: key(guest, ci, co), label: `${guest} · ${ci} → ${co}` });
    }
    cursor = json.has_more ? json.next_cursor : undefined;
    await sleep(200);
  } while (cursor);

  // Duplicados: páginas cuyo (huésped+fechas) coincide con una reserva activa
  // pero cuyo id NO es el canónico.
  const toArchive = pages.filter((p) => {
    const canon = canonical.get(p.k);
    return canon && p.id !== canon;
  });

  console.log(`Páginas en Notion: ${pages.length} | reservas activas: ${canonical.size}`);
  if (toArchive.length === 0) {
    console.log("No hay duplicados que coincidan con reservas activas.");
    return;
  }
  console.log(`Duplicados a archivar: ${toArchive.length}`);
  for (const p of toArchive) console.log(`  ${apply ? "archivar" : "[dry-run]"} → ${p.label} (${p.id})`);

  if (!apply) {
    console.log("\nDry-run. Volvé a correr con --apply para archivarlos.");
    return;
  }

  let archived = 0;
  let failed = 0;
  for (const p of toArchive) {
    const r = await archiveNotionReservation(p.id);
    if (r.ok) {
      archived++;
      console.log(`✓ archivado ${p.label}`);
    } else {
      failed++;
      console.error(`✗ ${p.label}: ${r.error}`);
    }
    await sleep(350);
  }
  console.log(`\nListo: ${archived} archivados, ${failed} con error.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
