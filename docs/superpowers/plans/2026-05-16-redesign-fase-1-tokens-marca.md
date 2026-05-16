# Rediseño Refugio del Corazón — Fase 1: Tokens y marca — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la paleta de color, la tipografía y la marca de toda la app por el sistema "Refugio del Corazón" (base neutra cálida + acento teal + tipografía Geist), de modo que las fases siguientes (calendario, dashboard, resto de páginas) hereden el sistema por cascada.

**Architecture:** Re-skin in-place basado en tokens. Se reescriben los custom properties OKLCH en `app/globals.css` (`:root` y `.dark`); todos los componentes que ya consumen esos tokens cambian de aspecto sin tocarlos. Se cambia la tipografía sans (Inter → Geist) vía `next/font`/paquete `geist`. Se reemplazan los strings y el monograma de marca en sidebar, header móvil y login por el nombre "Refugio del Corazón" y el logo circular. Se actualizan los 4 colores de departamento almacenados.

**Tech Stack:** Next.js 15, React 19, Tailwind v4 (beta) con `@theme inline`, paquete `geist` para la tipografía, `next/image` para el logo, Supabase (migración SQL para datos).

**Gestor de paquetes:** el repo usa **pnpm** (`pnpm-lock.yaml`). Todos los comandos usan `pnpm`.

**Nota sobre verificación:** esta fase es de color/tipografía/marca; no hay lógica nueva que cubrir con tests unitarios. Cada tarea se verifica con `pnpm typecheck`, `pnpm lint`, `pnpm build` y revisión visual en el navegador (modo claro y oscuro). Esa es la verificación obligatoria de cada tarea.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `app/globals.css` | Modificar | Tokens OKLCH de color (`:root`, `.dark`) y variables de fuente en `@theme inline`. |
| `app/layout.tsx` | Modificar | Cargar Geist como sans, mantener JetBrains Mono, metadata del sitio, tema por defecto. |
| `components/brand-logo.tsx` | Crear | Componente compartido que renderiza el logo circular en 3 tamaños. |
| `public/logo-refugio.png` | Agregar (manual) | Imagen del logo provista por el usuario. |
| `components/sidebar.tsx` | Modificar | Encabezado de marca: logo circular + "Refugio del Corazón". |
| `components/mobile-header.tsx` | Modificar | Marca en el header móvil. |
| `app/(auth)/login/page.tsx` | Modificar | Logo grande + marca en la pantalla de login. |
| `supabase/migrations/0006_department_colors.sql` | Crear | UPDATE de los 4 `color_hex` de departamento. |
| `supabase/seed.sql` | Modificar | Colores nuevos para instalaciones locales frescas. |

---

## Task 1: Reescribir los tokens de color en globals.css

**Files:**
- Modify: `app/globals.css:45-135` (bloques `:root` y `.dark`)

- [ ] **Step 1: Reemplazar el bloque `:root`**

Reemplazar el bloque `:root { ... }` actual (líneas 45-90) por:

```css
:root {
  --radius: 0.625rem;

  /* Surface — base neutra cálida (hue ~85) */
  --background: oklch(0.985 0.005 85);
  --foreground: oklch(0.23 0.012 75);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.23 0.012 75);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.23 0.012 75);

  /* Action — teal profundo de marca */
  --primary: oklch(0.52 0.085 192);
  --primary-foreground: oklch(0.99 0.005 85);
  --accent: oklch(0.52 0.085 192);
  --accent-foreground: oklch(0.99 0.005 85);
  --ring: oklch(0.52 0.085 192);

  /* Quiet surfaces & text */
  --secondary: oklch(0.955 0.006 85);
  --secondary-foreground: oklch(0.27 0.012 75);
  --muted: oklch(0.96 0.006 85);
  --muted-foreground: oklch(0.50 0.014 75);
  --border: oklch(0.90 0.008 85);
  --input: oklch(0.90 0.008 85);

  /* Semantic — estados */
  --success: oklch(0.56 0.12 150);
  --success-foreground: oklch(0.99 0.005 85);
  --warning: oklch(0.72 0.13 75);
  --warning-foreground: oklch(0.24 0.04 75);
  --destructive: oklch(0.55 0.19 27);
  --destructive-foreground: oklch(0.99 0.005 85);
  --info: oklch(0.55 0.13 235);
  --info-foreground: oklch(0.99 0.005 85);

  /* Target line — neutral, dashed */
  --target-track: oklch(0.50 0.014 75 / 0.55);

  /* Chart palette — teal + hues de departamento */
  --chart-1: oklch(0.52 0.085 192); /* teal */
  --chart-2: oklch(0.63 0.105 47);  /* terracota */
  --chart-3: oklch(0.53 0.095 250); /* azul */
  --chart-4: oklch(0.60 0.105 145); /* verde */
  --chart-5: oklch(0.54 0.085 343); /* ciruela */
}
```

- [ ] **Step 2: Reemplazar el bloque `.dark`**

Reemplazar el bloque `.dark { ... }` actual (líneas 92-135) por:

```css
.dark {
  /* Surface — oscuro cálido */
  --background: oklch(0.18 0.008 75);
  --foreground: oklch(0.95 0.006 85);
  --card: oklch(0.22 0.008 75);
  --card-foreground: oklch(0.95 0.006 85);
  --popover: oklch(0.22 0.008 75);
  --popover-foreground: oklch(0.95 0.006 85);

  /* Action — teal elevado para superficies oscuras */
  --primary: oklch(0.72 0.10 192);
  --primary-foreground: oklch(0.18 0.008 75);
  --accent: oklch(0.72 0.10 192);
  --accent-foreground: oklch(0.18 0.008 75);
  --ring: oklch(0.72 0.10 192);

  /* Quiet surfaces & text */
  --secondary: oklch(0.26 0.009 75);
  --secondary-foreground: oklch(0.95 0.006 85);
  --muted: oklch(0.26 0.009 75);
  --muted-foreground: oklch(0.73 0.012 80);
  --border: oklch(0.30 0.010 75);
  --input: oklch(0.30 0.010 75);

  /* Semantic — estados */
  --success: oklch(0.72 0.13 150);
  --success-foreground: oklch(0.18 0.008 75);
  --warning: oklch(0.79 0.14 75);
  --warning-foreground: oklch(0.20 0.04 75);
  --destructive: oklch(0.65 0.19 27);
  --destructive-foreground: oklch(0.99 0.005 85);
  --info: oklch(0.70 0.13 235);
  --info-foreground: oklch(0.18 0.008 75);

  /* Target line */
  --target-track: oklch(0.73 0.012 80 / 0.55);

  /* Chart palette — elevado para oscuro */
  --chart-1: oklch(0.72 0.10 192);
  --chart-2: oklch(0.72 0.11 47);
  --chart-3: oklch(0.66 0.10 250);
  --chart-4: oklch(0.71 0.11 145);
  --chart-5: oklch(0.66 0.09 343);
}
```

- [ ] **Step 3: Verificar build y typecheck**

Run: `pnpm typecheck && pnpm build`
Expected: ambos terminan sin errores (CSS no afecta tipos; el build compila el CSS nuevo).

- [ ] **Step 4: Verificación visual**

Run: `pnpm dev` y abrir la app en el navegador.
Expected: la base es crema cálida (no gris azulado), botones y enlaces activos en teal. Alternar a modo oscuro: fondo oscuro cálido, teal elevado. Sin texto ilegible en ningún modo.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat(theme): paleta Refugio del Corazón — base cálida + acento teal"
```

---

## Task 2: Cambiar la tipografía a Geist y actualizar metadata

**Files:**
- Modify: `app/layout.tsx` (completo)
- Modify: `app/globals.css:41-42` (variables de fuente en `@theme inline`)

- [ ] **Step 1: Instalar el paquete `geist`**

Run: `pnpm add geist`
Expected: `geist` queda agregado a `dependencies` en `package.json`.

- [ ] **Step 2: Reescribir `app/layout.tsx`**

Reemplazar el contenido completo de `app/layout.tsx` por:

```tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/components/react-query-provider";
import "./globals.css";

const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Refugio del Corazón",
  description: "Gestión de reservas — Refugio del Corazón, Capilla del Monte",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${jetbrains.variable} antialiased`}>
        <ThemeProvider defaultTheme="light">
          <ReactQueryProvider>
            {children}
            <Toaster position="top-right" richColors />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Notas: se elimina `Inter`; `GeistSans` expone la variable CSS `--font-geist-sans`. El tema por defecto pasa a `"light"` (modo primario del spec); usuarios con preferencia guardada en `localStorage` no se ven afectados.

- [ ] **Step 3: Actualizar las variables de fuente en `globals.css`**

En `app/globals.css`, dentro del bloque `@theme inline`, reemplazar las líneas 41-42:

```css
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
```

por:

```css
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
```

- [ ] **Step 4: Verificar typecheck y build**

Run: `pnpm typecheck && pnpm build`
Expected: sin errores. Si el build falla con "Cannot find module 'geist/font/sans'", confirmar que el Step 1 corrió.

- [ ] **Step 5: Verificación visual**

Run: `pnpm dev` y abrir la app.
Expected: el texto de la interfaz usa Geist (más moderna que Inter); los números (clase `.numeric`) siguen en monoespaciada. La pestaña del navegador dice "Refugio del Corazón".

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/globals.css package.json pnpm-lock.yaml
git commit -m "feat(theme): tipografía Geist y metadata Refugio del Corazón"
```

---

## Task 3: Agregar el archivo del logo

**Files:**
- Add: `public/logo-refugio.png` (acción manual del usuario)

- [ ] **Step 1: Guardar la imagen del logo**

Acción manual: guardar la imagen del logo provista por el usuario (montaña + casa + figura de madre, fondo crema) en `public/logo-refugio.png`. Si la carpeta `public/` no existe, crearla. El archivo debe ser un PNG o JPG cuadrado.

- [ ] **Step 2: Verificar que el archivo existe**

Run: `ls public/logo-refugio.png`
Expected: el comando lista el archivo sin error. Si falla, el usuario todavía no lo guardó — detenerse y pedírselo.

- [ ] **Step 3: Commit**

```bash
git add public/logo-refugio.png
git commit -m "chore: agregar logo Refugio del Corazón"
```

---

## Task 4: Crear el componente compartido BrandLogo

**Files:**
- Create: `components/brand-logo.tsx`

- [ ] **Step 1: Crear `components/brand-logo.tsx`**

```tsx
import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = { sm: 28, md: 36, lg: 72 } as const;

export function BrandLogo({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const px = SIZES[size];
  return (
    <Image
      src="/logo-refugio.png"
      alt="Refugio del Corazón"
      width={px}
      height={px}
      priority={size === "lg"}
      className={cn(
        "rounded-full object-cover ring-1 ring-border bg-[oklch(0.97_0.02_85)]",
        className
      )}
    />
  );
}
```

Notas: el recorte circular (`rounded-full`) conserva el fondo crema interno del archivo. El `ring-1` da un borde sutil para separarlo de cualquier superficie.

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add components/brand-logo.tsx
git commit -m "feat(brand): componente BrandLogo con logo circular"
```

---

## Task 5: Rebrand del sidebar

**Files:**
- Modify: `components/sidebar.tsx:67-85` (encabezado de marca)

- [ ] **Step 1: Importar `BrandLogo`**

En `components/sidebar.tsx`, agregar el import junto a los demás imports de componentes (después de la línea `import { Button } from "@/components/ui/button";`):

```tsx
import { BrandLogo } from "@/components/brand-logo";
```

- [ ] **Step 2: Reemplazar el encabezado de marca**

Reemplazar el bloque `<div className="flex items-center justify-between border-b border-border px-5 py-4">` … `</div>` (líneas 67-85) por:

```tsx
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <div>
              <p className="text-sm font-semibold leading-tight">Refugio del Corazón</p>
              <p className="text-xs text-muted-foreground">Capilla del Monte</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
```

- [ ] **Step 3: Verificar typecheck y lint**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 4: Verificación visual**

Run: `pnpm dev`, iniciar sesión y mirar el sidebar.
Expected: el logo circular reemplaza al recuadro "AB"; dice "Refugio del Corazón" / "Capilla del Monte".

- [ ] **Step 5: Commit**

```bash
git add components/sidebar.tsx
git commit -m "feat(brand): logo y nombre Refugio del Corazón en el sidebar"
```

---

## Task 6: Rebrand del header móvil

**Files:**
- Modify: `components/mobile-header.tsx:19-23` (bloque de marca)

- [ ] **Step 1: Importar `BrandLogo`**

En `components/mobile-header.tsx`, agregar después de `import { useTheme } from "@/components/theme-provider";`:

```tsx
import { BrandLogo } from "@/components/brand-logo";
```

- [ ] **Step 2: Reemplazar el bloque de marca**

Reemplazar el bloque `<div className="flex items-center gap-2">` … `</div>` (líneas 19-23) por:

```tsx
      <div className="flex items-center gap-2">
        <BrandLogo size="sm" />
        <span className="text-sm font-semibold">Refugio del Corazón</span>
      </div>
```

- [ ] **Step 3: Verificar typecheck y lint**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 4: Verificación visual**

Run: `pnpm dev`, achicar la ventana a ancho de celular (<768px).
Expected: el header móvil muestra el logo circular chico y "Refugio del Corazón".

- [ ] **Step 5: Commit**

```bash
git add components/mobile-header.tsx
git commit -m "feat(brand): logo y nombre Refugio del Corazón en el header móvil"
```

---

## Task 7: Rebrand de la pantalla de login

**Files:**
- Modify: `app/(auth)/login/page.tsx:1-24`

- [ ] **Step 1: Importar `BrandLogo`**

En `app/(auth)/login/page.tsx`, agregar al inicio, antes de `import { LoginForm } from "./login-form";`:

```tsx
import { BrandLogo } from "@/components/brand-logo";
```

- [ ] **Step 2: Reemplazar el encabezado de marca del login**

Reemplazar el bloque `<div className="mb-10 text-center">` … `</div>` (líneas 11-19) por:

```tsx
        <div className="mb-10 flex flex-col items-center text-center">
          <BrandLogo size="lg" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            Refugio del Corazón
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Capilla del Monte · Gestión de reservas
          </p>
        </div>
```

- [ ] **Step 3: Verificar typecheck y lint**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 4: Verificación visual**

Run: `pnpm dev` y abrir `/login`.
Expected: logo circular grande centrado sobre fondo crema cálido, título "Refugio del Corazón", botón "Ingresar" en teal. Verificar en modo claro y oscuro.

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat(brand): logo y nombre Refugio del Corazón en el login"
```

---

## Task 8: Actualizar los colores de departamento

**Files:**
- Create: `supabase/migrations/0006_department_colors.sql`
- Modify: `supabase/seed.sql` (4 líneas de `color_hex` en el INSERT de `properties`)

- [ ] **Step 1: Crear la migración**

Crear `supabase/migrations/0006_department_colors.sql`:

```sql
-- Actualiza los colores de departamento a la paleta Refugio del Corazón.
-- Empareja por nombre. Si los nombres en producción difieren de "Airbnb N",
-- ajustar los colores desde la pantalla de Propiedades de la app.
update properties set color_hex = '#c06d4a' where name = 'Airbnb 1';
update properties set color_hex = '#3f6ea5' where name = 'Airbnb 2';
update properties set color_hex = '#5a8f4e' where name = 'Airbnb 3';
update properties set color_hex = '#9c5f86' where name = 'Airbnb 4';
```

- [ ] **Step 2: Actualizar `supabase/seed.sql`**

En el INSERT de `properties` de `supabase/seed.sql`, reemplazar los valores de `color_hex`:
- `'#A47148'` → `'#c06d4a'` (Airbnb 1)
- `'#5B8FB9'` → `'#3f6ea5'` (Airbnb 2)
- `'#3F6B3F'` → `'#5a8f4e'` (Airbnb 3)
- `'#B45253'` → `'#9c5f86'` (Airbnb 4)

- [ ] **Step 3: Aplicar la migración a la base de datos**

Acción manual del usuario: aplicar `0006_department_colors.sql` a la base de datos de Supabase (vía `supabase db push`, el SQL Editor del panel de Supabase, o el flujo de migraciones que use el proyecto). Si los nombres de las propiedades no son exactamente "Airbnb 1"…"Airbnb 4", el usuario ajusta los 4 colores desde la pantalla de Propiedades de la app.

- [ ] **Step 4: Verificación visual**

Run: `pnpm dev`, abrir el Calendario o Propiedades.
Expected: las etiquetas/colores de departamento muestran terracota, azul, verde y ciruela.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0006_department_colors.sql supabase/seed.sql
git commit -m "feat(data): colores de departamento de la paleta Refugio del Corazón"
```

---

## Verificación final de la Fase 1

- [ ] **Step 1: Build completo**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: los tres terminan sin errores.

- [ ] **Step 2: Recorrido visual**

Run: `pnpm dev`. Recorrer login → sidebar → calendario → dashboard en modo claro y oscuro.
Expected: paleta cálida + teal de forma pareja, tipografía Geist, marca "Refugio del Corazón" con logo circular en login/sidebar/header móvil, colores de departamento nuevos. Ningún texto con bajo contraste.

---

## Notas para las fases siguientes (fuera de alcance de este plan)

- **Fase 2 — Calendario:** reconstrucción de `app/(admin)/calendar/calendar-view.tsx` a lista por día de llegada.
- **Fase 3 — Dashboard:** rediseño de jerarquía (un KPI héroe + 3 de apoyo, un gráfico, análisis por departamento).
- **Fase 4 — Resto de páginas:** Reservas, Gastos, Huéspedes, Propiedades, Reportes, Ajustes, Agenda.

Cada fase tendrá su propio plan, escrito al completarse la anterior.
