// Sincroniza reservas con el calendario de Notion "Reservas Airbnb".
// Sigue el patrón de lib/notifications/telegram.ts: fetch directo sin SDK y
// resultados { ok } en vez de excepciones — un fallo de Notion nunca debe
// tumbar la operación principal sobre la reserva.
//
// Import relativo (no alias @/) para que el script scripts/backfill-notion.ts
// pueda reutilizar este módulo fuera del bundler de Next.
import { normalizeArPhone } from "../notifications/whatsapp";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export type NotionReservationData = {
  guestName: string | null;
  guestPhone: string | null;
  propertyName: string | null;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  numGuests: number;
  totalAmountArs: number;
};

export type NotionSyncResult = { ok: true; pageId: string } | { ok: false; error: string };

function getConfig(): { token: string; databaseId: string } | { error: string } {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!token) return { error: "Missing NOTION_TOKEN" };
  if (!databaseId) return { error: "Missing NOTION_DATABASE_ID" };
  return { token, databaseId };
}

async function notionFetch(
  token: string,
  path: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>
): Promise<{ ok: true; json: { id: string } } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${NOTION_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: { id?: string; message?: string } = {};
    try {
      json = JSON.parse(text);
    } catch {
      // body no es JSON
    }
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} ${json.message ?? text.slice(0, 300)}` };
    }
    return { ok: true, json: json as { id: string } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// El teléfono en Notion se espera con código de país (+54...). Si la
// heurística argentina no lo puede normalizar, se manda tal cual está cargado.
function toNotionPhone(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const normalized = normalizeArPhone(raw);
  return normalized ? `+${normalized}` : raw.trim();
}

// Arma el objeto `properties` de la página. Los campos sin dato se mandan con
// su valor de borrado (title: [], select/phone: null): al crear quedan vacíos
// y al actualizar limpian lo que hubiera. "Noches" no se escribe porque es una
// fórmula calculada en Notion.
function buildProperties(data: NotionReservationData): Record<string, unknown> {
  const phone = toNotionPhone(data.guestPhone);
  return {
    "Huésped": {
      title: data.guestName ? [{ text: { content: data.guestName } }] : [],
    },
    "Propiedad": {
      select: data.propertyName ? { name: data.propertyName } : null,
    },
    "Check-in": { date: { start: data.checkIn } },
    "Check-out": { date: { start: data.checkOut } },
    "Huéspedes": { number: data.numGuests },
    "Teléfono": { phone_number: phone },
    "Monto a pagar": { number: data.totalAmountArs },
  };
}

export async function createNotionReservation(
  data: NotionReservationData
): Promise<NotionSyncResult> {
  const config = getConfig();
  if ("error" in config) return { ok: false, error: config.error };

  const result = await notionFetch(config.token, "/pages", "POST", {
    parent: { database_id: config.databaseId },
    properties: buildProperties(data),
  });
  if (!result.ok) return result;
  return { ok: true, pageId: result.json.id };
}

export async function updateNotionReservation(
  pageId: string,
  data: NotionReservationData
): Promise<NotionSyncResult> {
  const config = getConfig();
  if ("error" in config) return { ok: false, error: config.error };

  const result = await notionFetch(config.token, `/pages/${pageId}`, "PATCH", {
    properties: buildProperties(data),
  });
  if (!result.ok) return result;
  return { ok: true, pageId };
}

// "Borrar" vía API = archivar: la página va a la papelera de Notion y
// desaparece del calendario (recuperable desde la papelera si hiciera falta).
export async function archiveNotionReservation(
  pageId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getConfig();
  if ("error" in config) return { ok: false, error: config.error };

  const result = await notionFetch(config.token, `/pages/${pageId}`, "PATCH", {
    archived: true,
  });
  if (!result.ok) return result;
  return { ok: true };
}
