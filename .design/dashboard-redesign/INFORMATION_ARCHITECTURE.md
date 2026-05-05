# Information Architecture: Dashboard Redesign

> Scope: the `/dashboard` route only. The wider app's IA (sidebar, neighboring routes) stays as-is for this phase. This document defines the dashboard's internal structure, its filter contract, and how it touches its neighbors.

## Site Map

The dashboard is one route with internal sections; surrounding routes are listed only to anchor relationships.

- `/dashboard` — admin landing surface, single page
  - § **Pulso del mes** — above the fold (4 hero KPIs + 1 hero chart)
  - § **Detalles del mes** — secondary KPIs row (YTD, Gastos, RevPAR, ADR)
  - § **Análisis por propiedad** — OccupancyBar + RevenueDonut
  - (No tabs, no sub-routes. Sections are scroll regions, not navigation targets.)
- Neighbors (untouched by this phase, referenced for relationships):
  - `/calendar` — owns daily occupancy. Reason the OccupancyHeatmap leaves the dashboard.
  - `/reservations` — list / detail / new.
  - `/properties` — multi-property mgmt.
  - `/guests` — guest list + per-guest pages.
  - `/expenses` — operating costs (uses `ExpenseDonut`, kept).
  - `/reports` — downloadable PDF / CSV reports today; **the link target for hero-KPI deep-links** (`/reports?focus=<metric>`). The receiving end is forward-looking — out of scope here.
  - `/settings` — currently has app settings. Targets are NOT set here; they live inline on the dashboard.

## Navigation Model

- **Primary navigation**: unchanged sidebar from [components/sidebar.tsx](components/sidebar.tsx), 8 items, role-aware (admin sees all, manager sees Calendario + Gastos only). Dashboard remains admin-only.
- **Secondary navigation (within `/dashboard`)**: none in the conventional sense. The page is a single scroll. Section headings (`SectionHeading`) are visual anchors, not links. No tabs, no in-page anchors, no sticky section nav.
- **Utility navigation**: sidebar footer holds Sesión + theme toggle + Cerrar sesión — unchanged.
- **Mobile navigation**: existing mobile header toggles the sidebar overlay ([components/mobile-header.tsx](components/mobile-header.tsx)). Dashboard sections stack to single column. The filter bar collapses (see Content Hierarchy below).

## Content Hierarchy

### `/dashboard`

The page is a vertical stack of three sections. Order is by user job, not by data type.

**§ 0 — `FilterBar`** *(sticky top, above all sections)*
1. Time scope — preset chips (Este mes / Mes anterior / YTD / Últ. 12 meses) + month picker. Why first: every number on the page depends on it.
2. Property toggles — pill row, one per property, multi-select, color dot. Why second: scopes the comparison.
3. Currency switcher — ARS / USD / EUR. Why third: reformats numbers but doesn't change the dataset.
4. `ResetFiltersButton` — last, visually quieter.

**§ 1 — Pulso del mes** *(hero band, above the fold)*
1. Four `HeroKpi` cards in one row at desktop: **Ingresos del mes**, **Beneficio neto**, **Ocupación promedio**, **Saldo pendiente**. Why first: directly answers "how am I doing this month vs. expected?". Each carries a vs-target signal, MoM delta as supporting context, and an inline "Editar objetivo" affordance.
2. Hero chart: **Ingresos últimos 12 meses por propiedad**, with the current month's target line overlaid. Why second: gives seasonal and trend context to the KPI numbers without moving the eye away.
3. Section heading "Pulso del mes" sits above this band, type-only, no chrome.

**§ 2 — Detalles del mes** *(below the fold, monthly close)*
1. Secondary KPIs row — Ingresos YTD, Gastos del rango, RevPAR, ADR. Why first within the section: still numbers, still glanceable. Smaller, no icons, no vs-target chip — these are reference values.
2. Section heading "Detalles del mes" above.

**§ 3 — Análisis por propiedad** *(below the fold, comparative)*
1. **OccupancyBarChart** — monthly occupancy by property. Why first: occupancy comparison is the more action-driving of the two.
2. **RevenueDonut** — YTD share of revenue by property. Why second: frame for the year, not the month.
3. 2-column grid at desktop, stacks on tablet+.
4. Section heading "Análisis por propiedad" above.

**Below § 3**: nothing. Page ends. Cut widgets (TopGuestsBar, SourceBar, OccupancyHeatmap) do not appear here.

### Filter scope (the contract every section honors)

| Filter | Hero KPIs | Hero chart | Secondary KPIs | Análisis charts |
|---|---|---|---|---|
| Time range | ✓ scope | ✗ always last 12 months *(target line uses range)* | ✓ scope | ✓ scope |
| Property toggles | ✓ aggregate of selected | ✓ one line per selected | ✓ aggregate of selected | ✓ filtered |
| Currency | ✓ reformats | ✓ reformats Y-axis + tooltip | ✓ reformats | ✓ reformats RevenueDonut |

The hero chart is the one widget whose **time axis is fixed at last 12 months** regardless of preset, so the trend stays legible. The currently-selected month within that range gets the target line; if the time scope is YTD or last-12, the target line shows the most recent month.

## User Flows

### Flow 1 — Daily glance (the 3-second flow)

1. Admin lands on `/dashboard`. Page paints server-rendered with current filters from URL (default: `range=thisMonth`, all properties, ARS).
2. Eye lands on **Pulso del mes** hero KPIs. Each shows: label, big number, `OnTrackBadge`, vs-target delta.
3. Decision point:
   - All four badges = **En objetivo** (green). → Admin closes tab. Done.
   - Any badge = **Bajo objetivo** (amber). → Eye moves down to hero chart, target line confirms the gap.
   - Any KPI = **Sin objetivo** (gray). → Admin clicks "Editar objetivo" to set one (Flow 3).
4. (Optional) Admin clicks the KPI number → routes to `/reports?focus=<metric>` for a deeper drill (route enhancement is out of scope for this phase; the link target is set so it works when `/reports` adds support).

### Flow 2 — Monthly close (the deeper review)

1. Admin lands on `/dashboard`, switches filter to "Mes anterior" (or a specific month from the picker).
2. URL updates: `?range=lastMonth` or `?month=2026-04`. Page re-renders.
3. Admin scans Pulso § 1 for the month's headline numbers and target performance.
4. Scrolls to **Detalles del mes** for YTD, Gastos del rango, RevPAR, ADR.
5. Scrolls to **Análisis por propiedad** to see which property carried or dragged the month.
6. (Optional) Switches currency to USD to reframe revenue for non-AR stakeholders or year-over-year context.

### Flow 3 — Set / edit a target

1. Admin clicks "Editar objetivo" beside a hero KPI.
2. `KpiTargetPopover` opens, anchored to the KPI card.
3. Popover content depends on filter scope:
   - Single property active → one input: target for *this property* / *this month*.
   - Multiple properties active → one input per active property; the aggregate KPI target = sum.
   - Time scope = YTD / Últ. 12 → popover edits the target for the **most recent month within scope**, with a small note: "Editando objetivo de mayo 2026".
4. Admin types a value, hits Enter (or clicks "Guardar").
5. Server action upserts to `monthly_targets` (property_id, month, target_revenue). Sonner toast: "Objetivo actualizado".
6. Popover closes. KPI re-renders with new vs-target math. Hero chart's target line updates if the edited month is in view.
7. If the input is cleared and saved, the row is deleted; KPI reverts to "Sin objetivo".

### Flow 4 — Filter and share

1. Admin adjusts time / properties / currency in the filter bar.
2. URL search params update on every change (Next.js `useSearchParams` + `router.replace`, no scroll).
3. URL is now shareable / bookmarkable / browser-back compatible.
4. Refresh keeps state. New tab from a bookmark restores state.

## Naming Conventions

Pick one term per concept, in Spanish, Rioplatense register.

| Concept | Label in UI | Notes |
|---|---|---|
| The whole page | "Dashboard" | Sidebar item already says this. Don't change to "Panel" or "Inicio". |
| Top section (hero) | "Pulso del mes" | "Pulso" carries the daily-glance metaphor better than "Resumen" or "Vista general". |
| Middle section | "Detalles del mes" | Pairs with "Pulso". Implies these numbers are still about the month, just deeper. |
| Bottom section | "Análisis por propiedad" | Frames the comparative cut explicitly. |
| Target | "Objetivo" | Not "Meta" (less natural in operations register), not "Presupuesto" (implies expense, not revenue). |
| On-track signal | "En objetivo" | Not "OK", not "Al día" — "En objetivo" matches "Objetivo". |
| Off-track signal | "Bajo objetivo" | Not "Atrasado", not "Por debajo". Matches the same root. |
| No target set | "Sin objetivo" | Same root again. Muted gray, not red. |
| Edit target affordance | "Editar objetivo" | Verb form. Lowercase except first word. |
| Outstanding balance | "Saldo pendiente" | Already used; keep. |
| Net profit | "Beneficio neto" | Already used; keep. Don't switch to "Ganancia". |
| MoM delta | "vs. mes anterior" | Below the headline number, smaller. |
| Filter time presets | "Este mes" / "Mes anterior" / "YTD" / "Últ. 12 meses" | Already used. Keep "YTD" abbreviation; admin understands it. |
| Currency switcher | "ARS" / "USD" / "EUR" | Codes only, not "Pesos" / "Dólares". Tabular. |
| Reset | "Restablecer filtros" | Already used by `ResetFiltersButton`. |

## Component Reuse Map

| Component | Used on | Behavior differences |
|---|---|---|
| `AdminShell` ([components/admin-shell.tsx](components/admin-shell.tsx)) | All admin routes | Unchanged. |
| `Sidebar` ([components/sidebar.tsx](components/sidebar.tsx)) | All admin routes | Unchanged. Dashboard nav item is admin-only. |
| `PageHeader` ([components/page-header.tsx](components/page-header.tsx)) | Most admin pages incl. /dashboard | On dashboard, title "Dashboard" with no subtitle (the filter bar carries scope context). |
| `FilterBar` (modified from current `dashboard-client.tsx` filter row) | `/dashboard` only | Persists state to URL search params. Not extracted as a generic component for now. |
| `Card` family (shadcn) | App-wide | `HeroKpi` and `SecondaryKpi` are Card-based. Charts use `Card + CardHeader + CardContent`. |
| `Popover` (shadcn / Radix) | App-wide | `KpiTargetPopover` wraps it. On mobile, falls back to a `Dialog` for full-width sheet behavior. |
| `Skeleton` (shadcn) | App-wide | Used during client-side filter transitions, never on first paint. |
| `Sonner` toaster | App-wide | "Objetivo actualizado" toast on target save. |
| `RevenueLineChart` | `/dashboard` only | Modified: gains target-line overlay. |
| `OccupancyBarChart`, `RevenueDonut` | `/dashboard` only | Modified: restyle only. |
| `TopGuestsBar`, `SourceBar`, `OccupancyHeatmap` | `/dashboard` only (today) | **Files deleted** after redesign. No other consumers found ([rg confirmed](components/charts/)). |
| `ExpenseDonut` | `/expenses` ([app/(admin)/expenses/expenses-view.tsx:46](app/(admin)/expenses/expenses-view.tsx)) | Untouched, stays where it is. |

## Content Growth Plan

The dashboard is fixed in shape — sections do not multiply. What grows is the data within widgets:

- **Properties**: each new property adds a toggle in the filter bar and one line in the hero chart / OccupancyBar / a slice in RevenueDonut. Above ~8 properties, the property toggle row needs a "+N más" overflow popover; below that, pills wrap on a second line. **Threshold to revisit IA: 8 properties.**
- **Months of history**: the hero chart is fixed at 12 months. Adding history doesn't change layout. Older months reachable only via month picker, never on the dashboard.
- **Targets**: one row per (property, month) in `monthly_targets`. No UI growth — they materialize as overlays on existing widgets.
- **No archive, no pagination, no search on dashboard.** Those belong to /reservations, /guests, /expenses.
- **If a future "compare to last year" or "forecast" feature is added**, it goes into Pulso § 1 alongside the target line, not as a new section. Adding sections compromises the daily-glance principle.

## URL Strategy

`/dashboard` accepts the following search parameters. All are optional; absence = defaults.

| Param | Type | Default | Values |
|---|---|---|---|
| `range` | preset key | `thisMonth` | `thisMonth` \| `lastMonth` \| `ytd` \| `last12` |
| `month` | `yyyy-MM` | absent | Mutually exclusive with `range`; takes precedence when present. |
| `props` | comma-separated UUIDs | absent (= all) | List of property IDs. Empty / absent = all properties. |
| `cur` | currency code | `ARS` | `ARS` \| `USD` \| `EUR` |
| `focus` | metric key | absent | Reserved for `/reports` deep-link compatibility (the dashboard ignores it; only relevant on the destination route). |

**Rules:**
- Filters update via `router.replace` with `{ scroll: false }` to avoid re-scrolling on every change.
- The reset button clears all four filter params (back to the bare `/dashboard` URL).
- Property toggles emit a sorted, deduplicated `props` value to keep URLs stable for sharing.
- Server component reads `searchParams` for SSR-correct first paint; client component then hydrates and owns subsequent updates.
- No path segments are added (e.g., `/dashboard/pulso`). Sections are scroll regions, not navigable URLs.

**URL examples:**
- Default: `/dashboard`
- This month, properties A and B, USD: `/dashboard?props=a-uuid,b-uuid&cur=USD`
- Specific month, all properties: `/dashboard?month=2026-04`
- YTD, default scope: `/dashboard?range=ytd`

## Open Questions Forwarded to Phase 4 / Phase 5

- **`KpiTargetPopover` aggregate edit UX**: when 3+ properties are active, do we show 3+ inputs in the popover or a single "aggregate target" input that distributes? *Recommended for Phase 5: per-property inputs (explicit, no implicit math); add an "Igual para todas" helper.*
- **Target line color on the hero chart**: needs to read against all 5 chart palette lines without claiming any of them. *Forwarded to Phase 4: likely a neutral dashed line in `--muted-foreground` weight, not a chart-palette hue.*
- **On-track threshold**: at what % of target does a KPI go from "En objetivo" to "Bajo objetivo"? *Recommended: ≥95% of pace-adjusted target = En objetivo, <95% = Bajo objetivo. "Pace-adjusted" means proportional to days elapsed in the current month. Confirm in Phase 5.*
