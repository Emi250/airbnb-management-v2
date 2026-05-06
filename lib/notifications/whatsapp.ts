// Normaliza un teléfono argentino al formato que espera wa.me: solo dígitos,
// con código de país 54 al inicio y el "9" de móvil cuando corresponde.
//
// Casos cubiertos:
//   "+54 9 3548 40-6347"   → "5493548406347"
//   "03548406347"          → "5493548406347"   (formato local con 0 inicial)
//   "3548406347"           → "5493548406347"   (móvil sin código)
//   "+54 11 4444-5555"     → "5491144445555"   (CABA, también recibe 9 — lo
//                                                pide WhatsApp para móviles)
//   "00 54 9 351 1234567"  → "5493511234567"
//
// Nota: la columna `guests.phone` es texto libre. La heurística asume que
// cualquier número argentino sin prefijo internacional es móvil. Si llegara
// un fijo CABA real (11 + 8 dígitos), también va a recibir el 9 — WhatsApp
// igual ignora el 9 para fijos. Devuelve null si no quedan dígitos suficientes.
export function normalizeArPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && !digits.startsWith("054")) digits = digits.slice(1);
  if (digits.startsWith("15")) digits = digits.slice(2); // legacy AR mobile prefix

  if (!digits.startsWith("54")) digits = "54" + digits;

  // Asegurar el "9" de móvil después del 54.
  // Esperamos largos típicos: 54 + 10 dígitos = 12 (sin 9), o 54 + 11 = 13 (con 9).
  if (digits[2] !== "9" && digits.length <= 12) {
    digits = "54" + "9" + digits.slice(2);
  }

  if (digits.length < 12) return null;
  return digits;
}

export function buildWhatsAppLink(phoneE164Digits: string, message: string): string {
  return `https://wa.me/${phoneE164Digits}?text=${encodeURIComponent(message)}`;
}
