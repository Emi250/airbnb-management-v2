# Design Review: Dashboard Redesign

Reviewed against: [DESIGN_BRIEF.md](DESIGN_BRIEF.md), [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md), [DESIGN_TOKENS.md](DESIGN_TOKENS.md)
Philosophy: Calm editorial financial — Stripe / Linear lineage
Date: 2026-05-05

> **Scope of this review.** A full visual review of `/dashboard` could not be captured because the route is admin-only ([app/(admin)/layout.tsx:10](app/(admin)/layout.tsx)), and no auth session exists in the preview browser. I cannot accept credentials per safety policy. The `monthly_targets` table also has not yet been migrated, so the dashboard would currently render with `targets={[]}` even with auth. The review below combines:
> 1. **Visual evidence** captured at the login route (still validates the Phase 4 token cascade across viewports + modes).
> 2. **Code-level review** of every dashboard file against the brief, IA, tokens, and tasks list.
> 3. **A list of findings that require eyes-on confirmation** after you log in and apply the migration.

## Screenshots Captured

I was able to capture the login route at three viewports plus both color schemes. These do not validate the dashboard layout but they confirm that the new tokens (indigo primary, hue-270 cool neutrals, `--ring`, button radius, type weights) cascade correctly across the rest of the app.

| Capture | Viewport | Mode | What it shows | Filename target |
|---|---|---|---|---|
| Login | 1280×800 | dark | Dark surface (oklch 0.14 270), lifted indigo "Ingresar" button (`--primary` dark), Inter type, AB logo on indigo tile | `screenshots/review-login-desktop-1280-dark.png` |
| Login | 1280×800 | light | Cool-wash background (oklch 0.99 270), saturated indigo "Ingresar" button, light card with subtle border | `screenshots/review-login-desktop-1280-light.png` |
| Login | 768×1024 | light | Same composition, narrower viewport — card stays centered, no overflow | `screenshots/review-login-tablet-768-light.png` |
| Login | 375×812 | light | Card scales down to mobile, button/inputs full-width, generous padding around the AB tile | `screenshots/review-login-mobile-375-light.png` |

> The preview tool I have access to (`mcp__Claude_Preview__*`) does not write screenshots to disk — it returns them inline in chat. To populate `screenshots/` files for traceability, re-run `/design-review` once you can authenticate so a Playwright-style flow can save them, or capture manually from your own browser into `.design/dashboard-redesign/screenshots/`.

### What the login captures already tell us

- **Token cascade is correct.** The pivot away from warm gold to restrained indigo applies cleanly across the app — the AB logo tile, the "Ingresar" CTA, and the focus state on the inputs all read indigo, with the calm neutral backdrop the brief asked for. No leftover gold accents.
- **Dark mode is intentional, not inverted.** The dark surface lands at oklch(0.14 0.012 270), warm-ish enough to avoid OLED crush, with the lifted indigo (`oklch 0.68 0.16 268`) reading as comfortable contrast on the card.
- **Type-driven hierarchy reads.** "Gestión Airbnb" (semibold, tracking-tight) sits above the "Capilla del Monte · Plataforma interna" subtitle (muted-foreground, smaller). The hierarchy comes from weight + size, not chrome — the brief's principle "Calm beats dense" is visible at this small scale.

## Summary

The redesign is structurally complete and the foundation (tokens, schema, server actions, filter contract) is solid. The four highest-confidence gains from the brief landed cleanly: the page is now organized into three named sections with a single hero band, the cut widgets are removed, the URL is the source of truth for filter state, and the palette has pivoted off warm gold. The biggest finding is a **math bug in vs-target comparison for non-monthly scopes** — when filter is YTD or Últ. 12 meses, the KPI compares range-total revenue against a single month's target, which inflates the percentage. There are also two scope-deferral items (no profit/occupancy targets in v1) the brief implied would land but the schema doesn't yet support.

## Must Fix

_None._ The redesign builds, type-checks, lints, and passes a production `next build`. There are no blockers shipping it; the items below are correctness and polish.

## Should Fix

> **All three Should-fix items have been addressed in a follow-up patch (2026-05-05).** Original notes preserved below for traceability; resolution notes inline.

1. **~~vs-target math is wrong for YTD and Últ. 12 meses scopes.~~ → Resolved.** Added `aggregateRevenueTargetsForRange`, `aggregateOccupancyTargetForRange`, `monthKeysInRange`, and `paceFractionForRange` to [lib/analytics-targets.ts](lib/analytics-targets.ts). [dashboard-client.tsx](app/(admin)/dashboard/dashboard-client.tsx) now enumerates the month keys touched by the active range and aggregates targets across all of them; pace fraction is computed against the actual range, so partial current month inside YTD or Last-12 is honored correctly. The hero chart's `target` prop now uses a separate `anchorMonthRevenueTarget` (single month) so the horizontal reference line reads as a per-month benchmark, not a range total.

2. **~~Profit and occupancy KPIs lost their vs-target chips after Task 16.~~ → Partially resolved.** Occupancy now has a vs-target chip, wired through `aggregateOccupancyTargetForRange` in [dashboard-client.tsx](app/(admin)/dashboard/dashboard-client.tsx). The popover edits both `target_revenue_ars` AND `target_occupancy` per property (the schema already had the nullable column — wiring is now complete). **Beneficio neto** and **Saldo pendiente** are intentionally left without targets and the brief was updated to document this: net profit is derived (revenue − expenses), so a separate target would duplicate signal; outstanding balance is actionable, not benchmarked.

3. **~~Shared `editTarget` slot edited only revenue.~~ → Resolved.** The popover heading is now "Objetivos del mes" with two inputs per property (Ingresos / Ocupación). Both Ingresos and Ocupación KPIs render an "Editar objetivo" trigger; both open the same unified popover. Toast on save reads "Objetivos actualizados" (plural).

## Could Improve

1. **Hero chart simplification at <480px (in [TASKS.md](TASKS.md) task 15) is not implemented.** Multiple property lines at <480px will overflow the legend. Today the chart relies on Recharts' default responsive behavior. Add a `simplified` prop to `RevenueLineChart` and pass `true` from Pulso when `useIsMobile() && filteredProps.length >= 2`; in that mode render only the muted "Total" line plus the target reference. Document the behavior in the chart file.

2. **Toggling all properties off wraps back to "all selected".** [app/(admin)/dashboard/use-dashboard-filters.ts:163-168](app/(admin)/dashboard/use-dashboard-filters.ts) returns `[]` when the toggle yields the full universe — the same sentinel "all selected" uses. So clicking the last selected property gives the user the *opposite* of their probable intent. Either keep the wrap and document it ("Deseleccionar todas las propiedades muestra todas") or change the sentinel so `[]` means "show none" and a separate `null` means "all". The current behavior is defensible (an empty dashboard is meaningless) but it should be deliberate.

3. **The hero chart's target line is a flat horizontal reference.** The brief implied a per-month target overlay; the current implementation draws a single horizontal line at the anchor-month target value across all 12 months. Reads correctly as "the benchmark you should hit each month" but is not literally a per-month curve. If you want a per-month line, the data shape needs `target` per row in `monthlyRevenueByProperty` and the chart adds a `<Line dataKey="target">` instead of `<ReferenceLine>`. Heavier change, deferred.

4. **MoM delta for "Beneficio neto" can divide by very small numbers.** [dashboard-client.tsx:191](app/(admin)/dashboard/dashboard-client.tsx) does `(netProfit - profitPrev) / Math.abs(profitPrev)`. When previous month's profit is near zero, the percentage explodes (1500%, etc.). Cap the displayed magnitude or fall back to `null` when `Math.abs(profitPrev) < threshold`.

5. **The default chart "Total" series stroke is `var(--muted-foreground)` at 0.6 opacity.** That's likely correct for the calm aesthetic, but in the legend it'll appear nearly invisible against the per-property colors. Verify visually after auth — if the legend label fades too much, raise to opacity 0.8 or a slightly darker stroke.

6. **No reduced-motion verification yet.** I added the global `@media (prefers-reduced-motion: reduce)` block to [app/globals.css](app/globals.css), but there are no animations in the dashboard today (no framer-motion was added). The CSS rule is a no-op in practice. Not wrong, but flagging that the brief's "respect prefers-reduced-motion" requirement currently has nothing to suppress.

## Pending Visual Verification

These items can only be confirmed once you (a) apply the migration `supabase/migrations/0004_monthly_targets.sql` and (b) log in as an admin. Walk this list when you do — it's the minimum viable QA pass before shipping.

- [ ] **Pulso del mes layout** at 1280px: 4 hero KPIs in a single row, hero chart full-width below.
- [ ] **Pulso del mes layout** at 768px: hero KPIs become 2×2, chart stays full-width.
- [ ] **Pulso del mes layout** at 375px: KPIs stack to 1 column, chart full-width.
- [ ] **Detalles del mes** at all three breakpoints: 4 secondary KPIs visibly demoted (smaller value, no icon, no chip) compared to the hero row directly above.
- [ ] **Análisis por propiedad** at 1280px: 2-column grid (OccupancyBar + RevenueDonut). At <1024px stacks.
- [ ] **Filter bar at 1280px**: presets + month picker + property toggles inline + currency switcher + reset.
- [ ] **Filter bar at 375px**: property toggles collapse to a button "Propiedades · N activas"; opening it reveals the toggles in a popover.
- [ ] **KpiTargetPopover desktop**: opens as Radix popover anchored to the "Editar objetivo" trigger, focus moves to first input.
- [ ] **KpiTargetPopover mobile (<768px)**: renders as full-width Dialog, not popover.
- [ ] **Set a target → save**: sonner toast "Objetivo actualizado" appears; KPI re-renders with `OnTrackBadge` reflecting the new comparison; hero chart shows target line.
- [ ] **Clear a target → save**: row deletes; KPI returns to "Sin objetivo".
- [ ] **OnTrackBadge variants** in light AND dark mode for: `on_track` (green chip), `below` (amber chip), `no_target` (muted chip). Light mode uses solid bg + foreground; dark uses soft tint per [DESIGN_TOKENS.md](DESIGN_TOKENS.md).
- [ ] **Empty state**: select a month with no reservations — KPIs show `—`, charts show "Sin datos para el período seleccionado".
- [ ] **Filter URL persistence**: change presets/properties/currency, refresh — state survives. Open the URL in a new tab — same state. Browser back works.
- [ ] **Focus rings**: tab through filter chips, property toggles, currency switcher, reset, "Editar objetivo" — visible 2px ring on each in both modes.
- [ ] **Tab order** matches IA Flow 1 (filter bar left-to-right → hero KPIs left-to-right → chart → secondary KPIs → analysis charts).
- [ ] **The token cascade across other admin routes** (calendar, expenses, reservations, etc.) — confirm nothing in those routes uses a hardcoded warm-gold value that now reads off. Spot-check the chart palette in [components/charts/expense-donut.tsx](components/charts/expense-donut.tsx) (still used in /expenses).

## What Works Well

- **The structural rewrite is faithful to the IA.** Three sections, named in Spanish per the IA's naming conventions, in the order the brief specified. The cut widgets are gone, not hidden. The dead chart files are deleted, not orphaned. Clean.
- **The filter state contract is the cleanest part of the redesign.** [use-dashboard-filters.ts](app/(admin)/dashboard/use-dashboard-filters.ts) is small, typed, SSR-safe, and the URL it produces is shareable and refresh-safe — exactly what the IA asked for. The defaults-omitted-from-URL pattern keeps shareable links clean.
- **Token system is principled.** Hue-270 across all neutrals + indigo primary at 268 + chart palette around the same family creates a coherent system. The new semantic tokens (`--success`, `--warning`, `--info`, `--target-track`) plug into the same `@theme inline` block so Tailwind utilities work out of the box.
- **Empty-state handling is consistent across widgets.** Both `RevenueLineChart` and `OccupancyBarChart` render the same "Sin datos para el período seleccionado" placeholder. KPIs render `—` in tabular position so the layout doesn't shift. This was easy to skip; it wasn't.
- **Section composition has clean prop boundaries.** `PulsoSection`, `DetallesSection`, `AnalisisSection` each take pre-computed props from the orchestrator instead of re-doing filter math. Easy to read, easy to test, easy to refactor.
- **The popover/dialog responsive split** in `KpiTargetPopover` is the right amount of code for the right amount of behavior. `useIsMobile` was extracted to a shared hook — reusable.
- **The brief's anti-goals are honored.** No widget on the page that doesn't serve the top job. No industry jargon as a hero (RevPAR/ADR are demoted to Detalles). No "view archive" or pagination on the dashboard. No backwards-compat shims.

---

## Re-running this review

After you apply the migration and log in, run `/design-review` again. The skill will retry visual capture. To make the screenshots persist to disk, you can also capture manually from your own browser at the three breakpoints + light/dark and drop the files into `.design/dashboard-redesign/screenshots/` with the filenames from the table at the top of this document.
