# Design Brief: Dashboard Redesign

> Spanish-language admin dashboard for *Gestión Airbnb — Capilla del Monte*, a multi-property short-term rental operation in the Argentine Sierras. Admin-only surface; managers do not see it.

## Problem

I run a handful of properties on Airbnb, and I open the admin dashboard for two reasons. In the morning I want a five-second answer to "is the business OK this month?" — am I where I expected to be, or do I need to act. At month-end I want a longer look at how each property actually did.

The dashboard today doesn't really serve either rhythm. It shows me eight KPIs and six charts at once, side by side, with no hierarchy between them. I have to scan everything to find the two or three numbers that actually drive my decisions, and I can't tell at a glance whether a number is good or bad — the deltas only compare to last month, never to what I expected. The page is comprehensive, but it is not opinionated, and so it doesn't reduce my cognitive load. It mirrors the data instead of answering my question.

## Solution

A dashboard that's structured around a single question — *how is the business doing this month vs. expected?* — and answers it in three seconds.

The top of the page is a hero band: four KPIs that matter (revenue, net profit, occupancy, outstanding balance), each compared against a target I can set inline, color-cued green or amber when off-track. Below them, one chart: twelve months of revenue with the current month's target overlaid as a line, so I can read both seasonality and current standing in one glance.

Everything else — secondary KPIs, year-to-date and per-property views — sits below the fold under a quieter heading, for the monthly review. Strategic charts that don't drive action (top guests, booking sources, daily occupancy heatmap) leave the dashboard entirely; they belong in `/reports` or have already been answered by `/calendar`. The redesign is calm, type-driven, and confident — fewer numbers, better-told.

## Experience Principles

1. **Hero what drives action — demote what informs** — Above the fold answers "how am I doing?". Below the fold answers "how did each property do?". If a widget doesn't change a decision in either rhythm, it's not on this page.
2. **Compare against expectation, not just history** — Every primary KPI shows actual vs. target with a clear on-track / off-track signal. MoM delta is supporting context, not the headline. Targets are first-class data, set inline from the dashboard.
3. **Calm beats dense** — Generous whitespace and type hierarchy do the work that color and chrome did before. Numbers are the heroes; chart palette and accents are restrained. The page should feel quieter than the data it carries.

## Aesthetic Direction

- **Philosophy**: Calm editorial financial — Stripe / Linear lineage. Type-driven hierarchy, generous whitespace, neutral foundation, restrained semantic color.
- **Tone**: Confident, quiet, professional. Spanish UI throughout, Rioplatense register (e.g., "Ingresos del mes", "Saldo pendiente"). No exclamation marks, no playful copy, no emoji.
- **Reference points**: Stripe Dashboard, Linear Insights, Vercel Analytics, Notion's chart blocks, Mercury Banking.
- **Anti-references**: Default shadcn dashboard demos, generic SaaS analytics with rainbow charts, Bloomberg-style data density, hospitality marketing sites with photographic warmth.

The current palette's warm gold primary (`oklch(0.62 0.09 50)`) is the wrong note for this aesthetic. Phase 4 (tokens) will pivot toward a neutral foundation with a restrained cool accent (blue or violet) for primary chrome. Warm tones may survive as a *positive* semantic color (on-track / above-target), but not as the brand primary.

## Existing Patterns

The redesign extends the current shadcn/Tailwind v4 system rather than replacing it.

- **Typography**: Inter for sans, JetBrains Mono for mono. Numeric content already uses `font-variant-numeric: tabular-nums` globally via `.numeric` and `td.numeric` ([app/globals.css:102-107](app/globals.css)). Keep Inter and JetBrains; lean harder on the type ramp for hierarchy.
- **Colors**: Tailwind v4 `@theme inline` with OKLCH custom properties in `:root` and `.dark` ([app/globals.css:6-91](app/globals.css)). Both modes already exist. Phase 4 rewrites the palette in place — not a new file.
- **Spacing & radius**: `--radius: 0.625rem` (10px) with `radius-sm/md/lg` derivations. Default Tailwind spacing scale. Keep both.
- **Components (shadcn/ui)**: Button, Input, Label, Card (+ Header/Title/Content), Badge, Select, Dialog, Textarea, Skeleton, Separator, Table, Switch, Tabs, Popover, plus a custom ResetFiltersButton ([components/ui/](components/ui/)). All reusable.
- **Charts**: Recharts wrappers under [components/charts/](components/charts/) — RevenueLine, OccupancyBar, RevenueDonut survive the cut; TopGuestsBar, SourceBar, OccupancyHeatmap, ExpenseDonut leave the dashboard.
- **Shell**: [components/admin-shell.tsx](components/admin-shell.tsx) (sidebar + main) and [components/sidebar.tsx](components/sidebar.tsx) (role-aware nav) stay untouched in this phase.
- **Data**: Server fetch in [app/(admin)/dashboard/page.tsx](app/(admin)/dashboard/page.tsx) uses `Promise.all` against Supabase. Analytics functions live in `lib/analytics/*` and are reused, not rewritten.
- **Stack confirmed**: Next.js 15, React 19, Tailwind v4 beta, shadcn/Radix, Recharts, date-fns (`es` locale), framer-motion, sonner.

## Component Inventory

| Component | Status | Notes |
| --- | --- | --- |
| `DashboardShell` (filter bar + sections wrapper) | Modify | Refactor [dashboard-client.tsx](app/(admin)/dashboard/dashboard-client.tsx) to a slot-based shell with named regions: `hero`, `secondary`, `analysis`. |
| `FilterBar` (sticky, global) | Modify | Keep behavior, restyle to calm aesthetic. Time presets + month picker + property toggles + ARS/USD/EUR switcher all stay prominent. |
| `HeroKpi` | New | Replaces `PrimaryKpi`. Shows label, big number, vs-target delta with on-track/off-track color, MoM delta as secondary, and an inline "Editar objetivo" trigger. |
| `SecondaryKpi` | Modify | Restyle existing component, demote visually (smaller, no icon). |
| `KpiTargetPopover` | New | Popover triggered from `HeroKpi`. Edits monthly target for the current property scope (or aggregate). Uses Radix Popover + Input + Button. |
| `RevenueLineChart` | Modify | Add target-line overlay for the current month (or full filtered range). Tame palette per Phase 4 tokens. |
| `OccupancyBarChart` | Modify | Restyle only — remains in the "análisis" section below the fold. |
| `RevenueDonut` | Modify | Restyle, demote, possibly converted to a small per-property scoreboard if Phase 5 prefers. |
| `TopGuestsBar`, `SourceBar`, `OccupancyHeatmap`, `ExpenseDonut` | Delete | Removed from dashboard composition. `TopGuests` and `Source` may relocate to `/reports`; `OccupancyHeatmap` is fully redundant with `/calendar`. Delete the files if no other consumer exists. |
| `SectionHeading` | New | Light text-only heading separator for "Pulso del mes" / "Detalles del mes" / "Análisis por propiedad". No card chrome. |
| `OnTrackBadge` | New | Tiny semantic chip used by `HeroKpi` and the chart legend: "En objetivo" / "Bajo objetivo" / "Sin objetivo". |
| `monthly_targets` table + actions | New | Supabase migration: `id`, `property_id`, `month` (date, first-of-month), `target_revenue_ars` (numeric, NOT NULL), `target_occupancy` (numeric 0–100, nullable), `created_at`, `updated_at`. Server actions to upsert. Revenue target aggregates as a sum across the months/properties in scope. Occupancy target aggregates as a mean across rows that have one set. **Beneficio neto** and **Saldo pendiente** intentionally have no stored target — profit is derived from revenue − expenses, and balance is actionable rather than benchmarked. |

## Key Interactions

**Daily glance (3 seconds).** I open `/dashboard`. The filter bar defaults to "Este mes" with all properties on. My eye lands on the four hero KPIs in a single row. Each is large, tabular, and tagged with an `OnTrackBadge`. If everything is green, I close the tab. If revenue is amber, I look at the hero chart below — the target line shows me how far behind I am and whether the curve is recovering.

**Setting / editing a target.** I click "Editar objetivo" beside a hero KPI. A popover opens, anchored to the KPI card, showing one input per active property (or one input if filter is on a single property) for this month's target. I type, hit Enter, the popover closes with a sonner toast ("Objetivo actualizado"), and the KPI re-renders with new vs-target math. No page reload. If no target is set, the badge reads "Sin objetivo" in muted gray and the user is invited to set one.

**Filter changes.** Changing time preset, month, properties, or currency in the sticky filter bar updates the entire page. Hero KPIs and the hero chart recompute with smooth value transitions (count-up via framer-motion, ~250ms). Secondary section updates without animation. Sticky behavior on scroll is preserved.

**Drilling deeper.** A hero KPI is clickable on the number itself — it routes to `/reports?focus=<metric>` for the deeper view. (This is forward-looking; reports route enhancements are out of scope for this phase, but the link target is set so we don't need a refactor later.)

**Empty states.** If no reservations exist for the filter scope, KPIs show `—` with a tertiary message: "Sin datos para el período seleccionado". The hero chart shows an empty axes frame with the same message centered. No skeletons in the empty state — only during initial load.

**Loading state.** Server-rendered first paint should already show real numbers (server component fetches in `Promise.all`). Client-side filter changes use `Skeleton` for KPI numbers and chart areas during transitions, never spinners.

## Responsive Behavior

- **≥1280px** (primary): four hero KPIs in one row, hero chart full-width below, secondary KPIs in a four-column row, analysis charts in a 2-column grid.
- **≥768px (tablet)**: hero KPIs become a 2×2 grid, hero chart full-width, secondary KPIs in a 2×2 grid, analysis charts stack to full-width.
- **<768px (mobile)**: everything stacks to a single column. Filter bar collapses property toggles into a popover (button labelled "Propiedades · N activas"). Currency switcher remains visible. Hero chart simplifies to a single aggregated line (no per-property breakdown) when more than one property is active and viewport is below 480px — otherwise the legend overflows. Targets popover uses full-width sheet on mobile.

## Accessibility Requirements

- WCAG 2.1 AA contrast on text and semantic chips, in both light and dark modes. The on-track / off-track colors must reach 4.5:1 on the card background.
- Color is never the sole signal: `OnTrackBadge` always carries text ("En objetivo" / "Bajo objetivo"), and KPI deltas always include a sign and number, not just a color.
- Tab order on the dashboard: filter bar (left to right) → hero KPIs (left to right, with the "Editar objetivo" trigger as a child focus) → hero chart (skip target line, focus the chart container with an `aria-label` summary) → secondary KPIs → analysis charts.
- Focus rings come from `--ring`, visible on dark and light, with at least 2px outline.
- All popovers (Radix) ship with arrow keys, Escape, and focus trap by default — verify on `KpiTargetPopover`.
- Charts have an `aria-label` describing what the chart shows ("Ingresos mensuales por propiedad, últimos 12 meses, con línea objetivo de junio"); detailed values are exposed via the existing tooltip on hover/focus.
- Reduced motion: framer-motion count-ups and chart transitions respect `prefers-reduced-motion: reduce` (no animation, instant value swap).

## Out of Scope

- **Other admin areas**: calendar, reservations, expenses, reports, properties, guests, settings — visual changes only if a token swap in Phase 4 cascades. No structural changes.
- **`/reports` page enhancement**: hero KPI links target `/reports?focus=<metric>` but the deeper drill-down view is not part of this phase.
- **Server-side analytics changes**: reuse `lib/analytics/*` as-is. The `monthly_targets` join (target_revenue per filter scope) is the only new aggregation.
- **Manager role on dashboard**: dashboard remains admin-only. No design work for a manager-shaped dashboard in this phase.
- **Auth and role logic** beyond the explicit IA decision: untouched.
- **Forecasting / predictive trends**: target line is user-set, not predicted. No auto-projections, no ML.
- **Year-over-year comparison**: deferred. Targets are the "vs. expected" mechanism for v1.
- **Backwards-compatibility shims**: removed widgets and unused chart components are deleted, not hidden behind flags.
- **Phase 7 (design review)**: separate, on-request, not part of this run.
