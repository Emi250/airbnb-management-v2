import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { loadBrandLogo } from "@/lib/pdf/brand-logo";
import { ReceiptDocument } from "@/lib/pdf/receipt-document";
import {
  buildReceiptData,
  receiptFileName,
  type ReceiptReservation,
} from "@/lib/pdf/receipt-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return new Response("Reserva inválida", { status: 400 });
  }

  // El layout de (admin) no corre para route handlers: la puerta de admin se
  // repite acá, igual que ensureAdmin() en ../../actions.ts. No se importa esa
  // función porque vive en un archivo "use server" y lanza en vez de devolver
  // un status.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleRow?.role !== "admin") {
    return new Response("Acceso restringido", { status: 403 });
  }

  const { data, error } = await supabase
    .from("reservations")
    .select("*, property:properties(*), guest:guests(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[recibo] no se pudo leer la reserva", error.message);
    return new Response("Error al leer la reserva", { status: 500 });
  }
  if (!data) return new Response("Reserva no encontrada", { status: 404 });

  const receipt = buildReceiptData(data as unknown as ReceiptReservation);
  const pdf = await renderToBuffer(
    <ReceiptDocument data={receipt} logo={loadBrandLogo()} />
  );

  // El slug ya viene sin acentos, pero el nombre del huésped es texto libre.
  const name = receiptFileName(receipt);
  const asciiName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/"/g, "");

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteLength),
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      // Lleva datos personales y montos que cambian al registrar un pago.
      "Cache-Control": "no-store",
    },
  });
}
