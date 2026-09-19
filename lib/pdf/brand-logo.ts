import { readFileSync } from "node:fs";
import path from "node:path";

// El logo vive en public/, que Vercel sube como asset de CDN y NO copia dentro
// del bundle de la función. De ahí el outputFileTracingIncludes en
// next.config.ts: sin esa entrada, este readFileSync falla en producción.
// Si igual falla, el comprobante se emite sin logo en vez de romper.
let cached: Buffer | null | undefined;

export function loadBrandLogo(): Buffer | null {
  if (cached !== undefined) return cached;
  try {
    cached = readFileSync(
      path.join(process.cwd(), "public", "logo-refugio.jpeg")
    );
  } catch (err) {
    console.error("[recibo] no se pudo leer el logo, se omite", err);
    cached = null;
  }
  return cached;
}
