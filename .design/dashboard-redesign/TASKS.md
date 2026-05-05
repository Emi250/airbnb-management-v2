# Build Tasks: Dashboard Redesign

Generated from: [.design/dashboard-redesign/DESIGN_BRIEF.md](DESIGN_BRIEF.md)
Reads also: [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md), [DESIGN_TOKENS.md](DESIGN_TOKENS.md)
Date: 2026-05-04

> **Aesthetic direction (carry through every task)**: calm editorial financial — Stripe / Linear lineage. Type-driven hierarchy, generous whitespace, tabular numerals, restrained semantic color, neutral foundation with indigo primary. Spanish UI, Rioplatense register. The number is the hero. Tokens are already in place from Phase 4.

> **Build order is risk-first**: schema and target plumbing land first because every KPI on the page depends on them. The URL filter contract lands second because every section reads from it. Then the hero band (highest visual priority — validates aesthetic), then the below-fold sections, then states + polish.

> **Verification gate after each task**: confirm the slice in the browser at `/dashboard` (or in isolation if the task is plumbing). Don't move to the next task until the current one renders correctly in both light and dark, the typecheck passes, and any new component handles its own loading + empty case.

---

## Foundation

- [ ] **1. Schema migration: `monthly_targets`**
  Add a Supabase migration creating a `monthly_targets` table: `id` (uuid pk), `property_id` (uuid fk → properties), `month` (date, normalized to first of month), `target_revenue_ars` (numeric, not null), `target_occupancy` (numeric 0-100, nullable for v1 — only revenue is required), `created_at`, `updated_at`. Unique index on `(property_id, month)`. RLS: same admin-only policy as `properties`. Run, regenerate `types/supabase.ts`. Migration file at `supabase/migrations/0004_monthly_targets.sql`.
  _New table. No component impact yet._

- [ ] **2. Server actions for targets**
  Create `app/(admin)/dashboard/targets-actions.ts` with `upsertMonthlyTarget({ property_id, month, target_revenue_ars })` and `deleteMonthlyTarget({ property_id, month })`. Both `'use server'`, both return `{ ok, error? }`, both `revalidatePath('/dashboard')`. Validate inputs with `zod` (already in deps). No UI yet — verify by calling once from a temporary script or via the supabase studio.
  _New file. Reuses: existing `createClient` from `@/lib/supabase/server`, `zod` schemas pattern from elsewhere in `app/(admin)/`._

- [ ] **3. Analytics helper: target-aware comparator**
  Add to `lib/analytics/index.ts` (or a new sibling file `lib/analytics/targets.ts`): `compareToTarget({ actual, target, daysElapsed, daysInMonth }) → { actual, target, pct, paceTarget, status: 'on_track' | 'below' | 'no_target' }`. Threshold: pace-adjusted target (`target × daysElapsed / daysInMonth`); `status = 'on_track'` if `actual ≥ 0.95 × paceTarget`, else `'below'`; if `target == null` → `'no_target'`. Add `aggregateTargetsForScope(targets, propertyIds, month) → number | null` that sums target rows for active properties. Unit-trace by hand on a couple of inputs (no test framework currently set up — verify via console.log in a temp script).
  _New helper. Reuses: existing `lib/analytics/*` utilities and date-fns._

- [ ] **4. URL search-params filter hook**
  Create `app/(admin)/dashboard/use-dashboard-filters.ts` — a client hook that reads/writes `range`, `month`, `props`, `cur` from `useSearchParams` and emits a typed `DashboardFilters` object. Writes via `router.replace` with `{ scroll: false }`. Sorts and dedupes the `props` list before serializing so URLs stay stable. Default values match IA: `range='thisMonth'`, all properties, `cur='ARS'`. Refactor [dashboard-client.tsx](../../app/(admin)/dashboard/dashboard-client.tsx) to consume the hook instead of `useState`. Verify: change a filter, refresh — state survives. Open in new tab via the URL — state restores. Reset button clears all params.
  _Modifies: [app/(admin)/dashboard/dashboard-client.tsx](../../app/(admin)/dashboard/dashboard-client.tsx). New file: `use-dashboard-filters.ts`. Server component reads the same params for SSR-correct first paint._

## Core UI — shared primitives

- [ ] **5. `SectionHeading` component**
  New file `components/dashboard/section-heading.tsx`. Type-only heading: `<h2>` with `text-lg font-semibold tracking-tight` plus an optional muted-foreground subtitle. No card chrome, no border, no icon. Will be used three times: "Pulso del mes", "Detalles del mes", "Análisis por propiedad".
  _New component._

- [ ] **6. `OnTrackBadge` component**
  New file `components/dashboard/on-track-badge.tsx`. Tiny chip with three variants driven by a `status` prop (`'on_track' | 'below' | 'no_target'`). Variants:
  - `on_track` → solid `bg-success text-success-foreground`, label "En objetivo".
  - `below` → solid `bg-warning text-warning-foreground`, label "Bajo objetivo".
  - `no_target` → `bg-muted text-muted-foreground`, label "Sin objetivo".
  Always carries the text label (color is never the sole signal — accessibility requirement from the brief). `text-xs font-medium`, `rounded-full`, `px-2 py-0.5`.
  _New component. Reuses: tokens from Phase 4._

## Core UI — hero band

- [ ] **7. `HeroKpi` component**
  New file `components/dashboard/hero-kpi.tsx`. Card-based. Layout (top → bottom): label (`text-sm text-muted-foreground`), big value (`text-4xl md:text-5xl font-semibold tracking-tight tabular-nums`), then a row containing `OnTrackBadge` + vs-target delta (`text-xs tabular-nums`) + a quiet "Editar objetivo" button (no border, only color on hover). MoM delta sits below as a secondary line: `text-xs text-muted-foreground tabular-nums` with sign. Loading state: `Skeleton` for value + delta. Empty state (no data in scope): renders `—` with the muted "Sin datos" line. Props: `{ label, value, currency, target, delta, status, onEditTarget }`. Render four side-by-side at desktop (parent grid).
  _New component. Reuses: shadcn `Card`, `Skeleton`, `Button`. Composes `OnTrackBadge` from task 6._

- [ ] **8. `KpiTargetPopover` component**
  New file `components/dashboard/kpi-target-popover.tsx`. Wraps Radix `Popover`. Trigger comes from `HeroKpi`'s "Editar objetivo" button (passed in as children/asChild). Content: scoped to current filter — if a single property is active, one input ("Objetivo de ingresos"); if multiple, one input per active property with a small "Igual para todas" helper that copies the first value to all. Submit calls `upsertMonthlyTarget` per row, fires sonner toast "Objetivo actualizado", closes the popover. Empty input + save = `deleteMonthlyTarget`. If filter scope is YTD / Últ. 12, popover edits the most recent month and shows a small note "Editando objetivo de [mes año]". On mobile (`<768px`), use `Dialog` instead of `Popover` for full-width sheet behavior — detect via a media query hook or a CSS-only approach (Radix Popover already content-portals, but a Dialog mobile fallback is cleaner).
  _New component. Reuses: shadcn `Popover`, `Dialog`, `Input`, `Button`, `Label`, `sonner`. Calls server actions from task 2._

- [ ] **9. `RevenueLineChart` with target overlay**
  Modify [components/charts/revenue-line.tsx](../../components/charts/revenue-line.tsx). Add a `target` prop (`number | null`) and render a horizontal `ReferenceLine` at that y value, dashed (`strokeDasharray="4 4"`), color `var(--target-track)`, with a small label "Objetivo" anchored right. If `target == null`, no line. The chart's time axis stays fixed at last 12 months regardless of filter range (per IA filter contract). Apply Phase 4 chart tokens — recharts already reads `var(--chart-N)` if we pass them via CSS, otherwise pass them explicitly via the `stroke` prop. Update tooltip styling to use card tokens (`bg-card border-border text-card-foreground`). `aria-label` on chart container summarizes contents.
  _Modifies: [components/charts/revenue-line.tsx](../../components/charts/revenue-line.tsx). Reuses: existing `monthlyRevenueByProperty` analytics function._

## Composition

- [ ] **10. Pulso del mes section**
  New file `app/(admin)/dashboard/pulso-section.tsx` (client component). Renders `SectionHeading` "Pulso del mes" + a 4-column grid of `HeroKpi` cards (Ingresos del mes, Beneficio neto, Ocupación promedio, Saldo pendiente — using `compareToTarget` from task 3 for status) + the modified `RevenueLineChart` full-width below. Wires `KpiTargetPopover` to each `HeroKpi`'s edit trigger. Reads `DashboardFilters` from the hook (task 4). Verify: every KPI shows a status badge that responds to the current filter scope; editing a target updates the badge and chart line without a reload.
  _New file. Composes tasks 5, 6, 7, 8, 9. Reuses: existing analytics functions (`sumRevenue`, `outstandingBalance`, `occupancyRate`, expense + revenue arithmetic for net profit)._

- [ ] **11. Detalles del mes section**
  New file `app/(admin)/dashboard/detalles-section.tsx`. `SectionHeading` "Detalles del mes" + a 4-column row of demoted `SecondaryKpi` cards (Ingresos YTD, Gastos del rango, RevPAR, ADR). Restyle `SecondaryKpi` (in [dashboard-client.tsx](../../app/(admin)/dashboard/dashboard-client.tsx) currently — extract to `components/dashboard/secondary-kpi.tsx`): smaller value (`text-2xl font-semibold tabular-nums`), label muted-foreground, no icon, no accent color, no `OnTrackBadge`. These are reference values, not pulse signals.
  _New file. Modifies + extracts `SecondaryKpi` to its own file. Reuses: existing analytics functions._

- [ ] **12. Análisis por propiedad section**
  New file `app/(admin)/dashboard/analisis-section.tsx`. `SectionHeading` "Análisis por propiedad" + a 2-column grid containing `OccupancyBarChart` (left) and `RevenueDonut` (right). Restyle both for the new tokens — chart palette already updated, but verify card chrome (lighter border, more padding, no shadow), tooltip styling (matches RevenueLine), and `aria-label` on each chart container. Stacks to single column at `<1024px`.
  _New file. Modifies: [components/charts/occupancy-bar.tsx](../../components/charts/occupancy-bar.tsx), [components/charts/revenue-donut.tsx](../../components/charts/revenue-donut.tsx) — restyle only._

- [ ] **13. Page composition + filter bar refactor + cleanup**
  Refactor [app/(admin)/dashboard/dashboard-client.tsx](../../app/(admin)/dashboard/dashboard-client.tsx) into a thin orchestrator: `<PageHeader title="Dashboard" />` + `<FilterBar />` (sticky) + `<PulsoSection />` + `<DetallesSection />` + `<AnalisisSection />`. Extract the filter bar to `app/(admin)/dashboard/filter-bar.tsx`. Filter bar reads + writes via the URL hook from task 4 — time presets, month picker, property toggles, currency switcher, reset button. Update [app/(admin)/dashboard/page.tsx](../../app/(admin)/dashboard/page.tsx) to read `searchParams` and pass initial filters to the client tree (SSR correctness). Then **delete** the now-unused chart files: `components/charts/top-guests-bar.tsx`, `components/charts/source-bar.tsx`, `components/charts/occupancy-heatmap.tsx`. Verify with grep that nothing else imports them. Delete the `topGuests`, `revenueBySource`, `dailyOccupancy` analytics exports if they have no other consumers.
  _Modifies: [page.tsx](../../app/(admin)/dashboard/page.tsx), [dashboard-client.tsx](../../app/(admin)/dashboard/dashboard-client.tsx). New file: `filter-bar.tsx`. Deletes: 3 chart files (and any orphaned analytics exports)._

## States & polish

- [ ] **14. Empty + loading states pass**
  Walk every widget on the dashboard against the brief's empty/loading rules. **Empty** (no rows in scope): KPIs show `—` with "Sin datos para el período seleccionado"; charts render axes-only frame with the same message centered. **Loading** (filter transition): `Skeleton` for KPI numbers and chart areas. **First paint**: server-rendered with real numbers; no skeleton on initial load. Verify by toggling to a property combo with no reservations and an empty currency view.
  _Touches: HeroKpi, SecondaryKpi, all three charts. No new components._

- [ ] **15. Responsive pass**
  Verify breakpoints per the brief and IA at 1280 / 1024 / 768 / 480 / 375.
  - **Filter bar**: at `<768px` the property toggles collapse into a popover button labeled "Propiedades · N activas"; currency stays inline; time presets wrap or compact.
  - **Hero KPIs**: 4-col → 2×2 at `≥768px` → stack at `<768px`.
  - **Hero chart**: at `<480px` with 2+ properties active, simplify to a single aggregated revenue line (no per-property breakdown) so the legend doesn't overflow. Document this in a comment in `revenue-line.tsx`.
  - **Análisis section**: 2-col at `≥1024px`, stack below.
  - **Target popover**: switches to `Dialog` at `<768px`.
  Verify in real viewport, not just devtools toggling.
  _Touches: filter-bar, pulso-section, analisis-section, RevenueLineChart, KpiTargetPopover. No new components._

- [ ] **16. Dark-mode + a11y pass**
  Toggle dark mode and walk every section: contrast on hero KPI numbers, `OnTrackBadge` chips (use soft-chip pattern in dark mode per [DESIGN_TOKENS.md](DESIGN_TOKENS.md) recommendation), target line on chart, MoM delta colors, focus rings on filter bar inputs and "Editar objetivo" buttons. **A11y checks**: tab order matches IA Flow 1; charts have `aria-label` summarizing what they show; popover has focus trap and Escape; reduced-motion gating on framer-motion count-ups (skip animation, snap to value); `OnTrackBadge` always carries text (verify never reduced to color-only by an overlooked CSS rule); contrast on `--muted-foreground` and `--warning` text confirmed with a real checker (the Phase 4 token doc warned `--warning` as text-on-bg fails AA in light mode — confirm fix).
  _Touches: every component. No new components. Possible token tweaks if contrast checker disagrees with the lightness-delta estimate._

## Review

- [ ] **17. Design review** (Phase 7, separate trigger)
  Run `/design-review` against [DESIGN_BRIEF.md](DESIGN_BRIEF.md). Captures screenshots into `.design/dashboard-redesign/screenshots/` and produces `DESIGN_REVIEW.md`. **Not part of the build — run on demand after task 16 lands.**
