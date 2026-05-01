# Gestión Airbnb · Capilla del Monte

Plataforma interna de gestión para 4 propiedades Airbnb en Capilla del Monte (Córdoba, Argentina). Reemplaza la base de datos `RESERVAS` de Notion con un dashboard financiero completo, calendario multi-propiedad, CRUD de reservas y una vista de agenda simplificada para la encargada.

## Stack

- **Next.js 15** (App Router) · TypeScript · React 19
- **Tailwind CSS v4** + shadcn/ui (new-york)
- **Supabase** (Postgres + Auth + RLS)
- **FullCalendar** (resourceTimeline) · **Recharts** · **react-hook-form** + zod
- **date-fns** (locale `es`) · **sonner** toasts · **TanStack Query** para cliente

## Roles

- **ADMIN** (dueño): acceso completo. Aterrizaje en `/dashboard`.
- **CARETAKER** (encargada): acceso únicamente a `/agenda`. Sin datos financieros.

La doble defensa se aplica:
1. RLS de Supabase (admin: full · caretaker: solo read sobre tabla restringida + vista `caretaker_agenda` que omite importes).
2. Middleware de Next.js (`middleware.ts`) que redirige según rol.
3. Layout server-side de cada grupo (`/(admin)/layout.tsx` y `/(caretaker)/layout.tsx`) que vuelve a verificar.

## Setup local

### 1. Dependencias

```bash
pnpm install
```

### 2. Variables de entorno

Copiá `.env.example` a `.env.local` y completá con tus credenciales de Supabase:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_PROJECT_ID=xxxxx
```

### 3. Crear el proyecto de Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un nuevo proyecto.
2. Copiá la URL del proyecto y las API keys (anon + service_role) al `.env.local`.

### 4. Aplicar la migración

Desde el SQL Editor de Supabase, ejecutá `supabase/migrations/0001_init.sql`. Esto crea:
- Tablas: `properties`, `guests`, `reservations`, `expenses`, `exchange_rates`, `user_roles`
- Trigger anti-overlap a nivel DB sobre `reservations`
- Función `current_user_role()`
- Políticas RLS para admin y caretaker
- Vista `caretaker_agenda` (sin datos financieros)

### 5. Cargar el seed

Ejecutá `supabase/seed.sql`. Genera 4 propiedades (Airbnb 1–4), 10 huéspedes, ~30 reservas distribuidas entre los últimos 12 meses y los próximos 6, y 12 gastos.

### 6. Crear los usuarios

En **Supabase Auth → Users**, creá dos usuarios con email/password:

- `admin@example.com` → rol `admin`
- `encargada@example.com` → rol `caretaker`

Después, en el **SQL Editor**:

```sql
-- Reemplazar los UUID por los del paso anterior
insert into user_roles (user_id, role, display_name) values
  ('UUID-DEL-ADMIN', 'admin', 'Emilio'),
  ('UUID-DE-LA-CARETAKER', 'caretaker', 'Mamá');
```

### 7. Levantar la app

```bash
pnpm dev
```

Abrí [http://localhost:3000](http://localhost:3000). El admin aterriza en `/dashboard`; la encargada, en `/agenda`.

## Generar tipos desde Supabase (opcional)

Si querés regenerar `types/supabase.ts` con la CLI oficial:

```bash
pnpm dlx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID --schema public > types/supabase.ts
```

## Estructura

```
app/
  (auth)/login/        ← Login server actions
  (admin)/             ← Layout protegido por rol admin
    dashboard/         ← KPIs + 6 charts + filtros sticky
    calendar/          ← FullCalendar resource-timeline
    reservations/      ← CRUD completo (list, new, [id])
    properties/        ← Listado + detalle por propiedad
    guests/            ← Registro + historial
    expenses/          ← CRUD modal
    reports/           ← Exports CSV (mensual, consolidado, fiscal anual)
    settings/          ← Tipos de cambio · propiedades · usuarios
  (caretaker)/agenda/  ← Vista simplificada, mobile-first
  page.tsx             ← Redirige según rol
  layout.tsx           ← Theme + react-query + toaster
components/
  ui/                  ← shadcn primitives
  charts/              ← Recharts wrappers
  sidebar.tsx          ← Sidebar con tema toggle y logout
lib/
  supabase/            ← client, server, middleware
  queries/             ← Funciones tipadas
  analytics.ts         ← KPIs (occupancy, ADR, RevPAR, etc.)
  format.ts            ← formatCurrency, formatDate, whatsAppLink
  schemas.ts           ← Zod schemas compartidos
middleware.ts          ← Auth + role-based routing
supabase/
  migrations/0001_init.sql
  seed.sql
types/supabase.ts      ← Tipos Database
```

## Deploy en Vercel

1. Push del repo a GitHub.
2. Importá el proyecto en [Vercel](https://vercel.com).
3. Cargá las mismas env vars en **Project Settings → Environment Variables**.
4. Deploy. Vercel ejecuta `pnpm build` y publica.

## Comandos útiles

```bash
pnpm dev         # desarrollo
pnpm build       # build producción
pnpm start       # arrancar producción
pnpm typecheck   # solo tsc
```

## Decisiones de diseño

- **Tema**: dark por defecto (matchea el aspecto de Notion del owner). Toggle disponible en sidebar.
- **Color de marca**: warm tan `#A47148` (pastel del tag "Airbnb 1").
- **Tipografía**: Inter para UI, JetBrains Mono para columnas numéricas (alineación tabular en tablas).
- **Locale**: `es-AR`. Fechas largas: `27 de abril de 2026`. Moneda: `$ 312.300,00 ARS` vía `formatCurrency()`.
- **Triple defensa de roles**: RLS + middleware + layout server-side. La encargada nunca ve montos ni saldos.
- **Conflictos de fechas**: doble validación (zod + trigger DB que rechaza overlap activo).
- **Server Components por defecto**: solo se hidratan formularios, charts, calendar y filtros con interacción.

## Limitaciones conocidas

- El número del dueño está hardcodeado en `app/(caretaker)/agenda/page.tsx` (busca `ownerPhone`). Editar manualmente o mover a `exchange_rates` / nueva tabla de settings si se necesita.
- Los reportes PDF se entregan como CSV con `text/csv`. Si querés PDFs nativos, `@react-pdf/renderer` ya está instalado y listo para sumarse en `app/(admin)/reports/`.
- FullCalendar usa la licencia non-commercial pública. Si la app pasa a comercial, comprar licencia en fullcalendar.io.
