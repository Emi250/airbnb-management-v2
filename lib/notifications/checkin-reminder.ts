import { createAdminClient } from "@/lib/supabase/admin";
import { escapeTelegramHtml, sendTelegramMessage } from "@/lib/notifications/telegram";
import { buildWhatsAppLink, normalizeArPhone } from "@/lib/notifications/whatsapp";

const ARG_TZ = "America/Argentina/Cordoba";

// Devuelve YYYY-MM-DD para "hoy + offsetDays" en hora Argentina, sin importar
// cuándo se invoque desde UTC.
export function targetDateInAr(offsetDays: number, now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARG_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  // Construir un Date en UTC con esa fecha y desplazar días — evita drift.
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildWhatsAppText(guestName: string, totalAmountArs: number): string {
  return `Hola ${guestName}, ¿cómo estás? Soy Emilio del alojamiento de Capilla del Monte, te escribo para enviarte ahora la info del check in asi no te molesto durante estos días:

- Con respecto al check in, el *ingreso a partir de las 14:00hs*, si desean llegar antes pueden dejar las valijas y pasear mientras se termina la limpieza, no hay problema!

- Te voy a pasar el número de *Whatsapp de Daniela, la dueña del lugar,* quién será la persona que les brindará las llaves, presentarles el lugar y estar para todo lo que necesiten durante la estadía:

*WHATSAPP DANIELA: 3548571164*
Link de acceso a Whatsapp: https://walink.co/04379c

- El check out es *hasta las 10 AM*

- La *dirección exacta* del alojamiento es:
- Río Negro 64
- Link Google Maps: https://maps.app.goo.gl/dBXSBnFM7tUFfNRX7

- Te brindo también un link donde tenemos *más info sobre cómo llegar y recomendaciones extras* para su viaje, como números de taxi, terminal de ómnibus, entre otros: https://refugio-del-corazon-info.lovable.app

- El *monto a abonar* es de ${formatArs(totalAmountArs)} y puede abonarse por transferencia o efectivo cuando lleguen!

Muchas gracias y por cualquier consulta quedo siempre a disposición!`;
}

function buildTelegramMessage(opts: {
  guestName: string;
  nights: number;
  numGuests: number;
  totalAmountArs: number;
  rawPhone: string | null;
  waLink: string | null;
}): string {
  const safeName = escapeTelegramHtml(opts.guestName);
  const phoneDisplay = opts.rawPhone ? escapeTelegramHtml(opts.rawPhone) : "—";
  const totalDisplay = escapeTelegramHtml(formatArs(opts.totalAmountArs));

  const lines = [
    "🛎️ <b>Recordatorio de Check-in en 3 días</b>",
    `👤 <b>Huésped:</b> ${safeName}`,
    `🌙 <b>Noches:</b> ${opts.nights}`,
    `👥 <b>Pax:</b> ${opts.numGuests}`,
    `💰 <b>MONTO A PAGAR:</b> ${totalDisplay}`,
    `📱 <b>Teléfono:</b> ${phoneDisplay}`,
  ];

  if (opts.waLink) {
    // El URL ya viene de encodeURIComponent y no contiene <, >, & o ".
    // Igual lo pasamos por escapeTelegramHtml por defensa.
    const safeHref = escapeTelegramHtml(opts.waLink);
    lines.push("");
    lines.push(`👉 <a href="${safeHref}">Hacer clic aquí para enviar mensaje de bienvenida</a>`);
  }

  return lines.join("\n");
}

type ReminderResult = {
  processed: number;
  sent: number;
  skipped_no_phone: number;
  errors: { reservationId: string; error: string }[];
};

export async function runCheckinReminders(): Promise<ReminderResult> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) throw new Error("Missing TELEGRAM_CHAT_ID");

  const supabase = createAdminClient();
  const targetDate = targetDateInAr(3);

  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id, check_in, num_guests, nights, total_amount_ars, amount_paid_ars, guests:guest_id(name, phone)"
    )
    .eq("status", "confirmed")
    .eq("check_in", targetDate)
    .is("checkin_reminder_sent_at", null);

  if (error) throw new Error(`Supabase query failed: ${error.message}`);

  const result: ReminderResult = { processed: 0, sent: 0, skipped_no_phone: 0, errors: [] };

  for (const row of data ?? []) {
    result.processed += 1;

    // Supabase typing returns the joined relation as object | array depending
    // on the FK shape. Normalizar a un único objeto.
    const guest = Array.isArray(row.guests) ? row.guests[0] : row.guests;
    const guestName = guest?.name ?? "Sin nombre";
    const rawPhone = guest?.phone ?? null;
    const normalized = normalizeArPhone(rawPhone);

    const balanceArs = Number(row.total_amount_ars) - Number(row.amount_paid_ars);

    let waLink: string | null = null;
    if (normalized) {
      const waText = buildWhatsAppText(guestName, balanceArs);
      waLink = buildWhatsAppLink(normalized, waText);
    } else {
      result.skipped_no_phone += 1;
    }

    const text = buildTelegramMessage({
      guestName,
      nights: row.nights,
      numGuests: row.num_guests,
      totalAmountArs: balanceArs,
      rawPhone,
      waLink,
    });

    const send = await sendTelegramMessage({ chatId, text, parseMode: "HTML" });
    if (!send.ok) {
      result.errors.push({ reservationId: row.id, error: send.error });
      continue;
    }

    const { error: updateErr } = await supabase
      .from("reservations")
      .update({ checkin_reminder_sent_at: new Date().toISOString() })
      .eq("id", row.id);

    if (updateErr) {
      result.errors.push({
        reservationId: row.id,
        error: `Sent OK but failed to mark notified: ${updateErr.message}`,
      });
      continue;
    }

    result.sent += 1;
  }

  return result;
}
