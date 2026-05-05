# Design Tokens: Dashboard Redesign

**Philosophy**: Calm editorial financial — Stripe / Linear lineage.
**Mode**: Tokens are written into the existing Tailwind v4 `@theme inline` block in [app/globals.css](../../app/globals.css). Both light and dark are first-class.

This document explains the choices behind the values. The values themselves live in `globals.css` and are the source of truth. If something diverges, the CSS wins.

## What changed vs. the previous tokens

| Token | Before | After | Why |
|---|---|---|---|
| `--primary` (light) | `oklch(0.62 0.09 50)` (warm gold) | `oklch(0.50 0.18 268)` (restrained indigo) | Warm gold reads as hospitality / consumer. The brief named Stripe/Linear; cool indigo is the canonical note for that lineage. |
| `--primary` (dark) | `oklch(0.7 0.1 50)` | `oklch(0.68 0.16 268)` | Lifted indigo for dark surfaces, same hue. |
| `--accent` | identical to old primary (gold) | identical to new primary (indigo) | The shadcn convention is `--accent === --primary` for hover/active backgrounds. Kept linked. |
| `--background` (light) | `oklch(0.99 0 0)` (neutral white) | `oklch(0.99 0.003 270)` (faint cool wash) | A trace of cool chroma keeps the page from reading as sterile / printer-paper. Stripe and Linear both do this. |
| `--background` (dark) | `oklch(0.13 0.005 240)` | `oklch(0.14 0.012 270)` | Slightly raised lightness, slightly more chroma. Pure-near-black on OLED can crush; this is more legible without becoming gray. |
| `--foreground` (both) | hue 240 | hue 270 | Aligned all neutrals to a single hue (270, very cool blue-gray) so warm/cool drift doesn't appear when surfaces stack. |
| `--border` (light) | `oklch(0.88 0.005 240)` | `oklch(0.91 0.005 270)` | Softer borders. The brief asks for type-driven hierarchy; bold borders fight that. |
| `--muted-foreground` (light) | `oklch(0.42 0.01 240)` | `oklch(0.48 0.012 270)` | Slightly lighter, slightly cooler. Better paired with the lifted `--background`. |
| `--destructive` | `oklch(0.55 0.22 27)` | `oklch(0.55 0.20 25)` | Lower chroma. The brief avoids high-saturation alarm states; an off-track number is amber, an *error* is red. |
| `--chart-*` (1..5) | mixed hues, high saturation | rebalanced cool palette, similar lightness | Charts now carry the calm. All five chart colors sit at lightness ~0.55–0.66 in light, ~0.68–0.76 in dark, so no one line out-shouts another. |

## What was added

| Token | Light value | Dark value | Used for |
|---|---|---|---|
| `--success` | `oklch(0.55 0.13 152)` | `oklch(0.70 0.14 152)` | "En objetivo" semantic. Used as solid bg + white fg for chips, OR as `bg-success/10 text-success` for soft chips. |
| `--success-foreground` | near-white | near-black | Text-on-success-bg companion. |
| `--warning` | `oklch(0.72 0.14 70)` (amber) | `oklch(0.78 0.15 70)` | "Bajo objetivo" semantic. Reserved for vs-target shortfall — *not* error. |
| `--warning-foreground` | dark amber-leaning | same family | Pair with warning bg. (Warning is light enough that dark text is needed; do not pair with white.) |
| `--info` | `oklch(0.55 0.16 230)` (calm blue) | `oklch(0.68 0.16 230)` | Reserved for neutral informational chips. Not in heavy use today; defined for symmetry. |
| `--info-foreground` | near-white | near-black | Pair with info bg. |
| `--target-track` | `oklch(0.48 0.012 270 / 0.55)` | `oklch(0.72 0.012 270 / 0.55)` | Hero chart target line. **Neutral by design — does not claim a chart-palette hue**, so it reads as "frame", not "another series". Semi-transparent so it sits behind data lines visually. Drawn dashed in the chart component. |

## Why these specific values

- **Indigo at hue 268** specifically: tested 240 (Stripe-blue), 250, 268, 275 (Linear-violet). 268 reads as "indigo" (not "blue", not "violet") and at lightness 0.50 it stays calm. Saturation 0.18 is the upper edge — any more and it loses the editorial feel; less and it reads as dusty.
- **Hue 270 for neutrals**: the foreground/background/border/muted family all sit at 270 with very low chroma (0.003–0.018). This single-hue neutral system is what makes the UI feel coherent with indigo without ever competing for attention.
- **Warning is amber, not orange or red**. Amber (hue 70) is the canonical "below pace" color in financial UIs (Bloomberg, Stripe metric warnings). Red is reserved for errors / destructive — it carries different weight and we don't want to alarm the operator about a routine pace shortfall.
- **Chart palette ordering**: chart-1 (indigo) is intentionally the same hue as `--primary`. When a user toggles a single property, the line is the brand color. As properties stack, the palette diverges (teal, green, amber, magenta-violet) — all distinguishable at light or dark, none neon, none pastel.
- **Target line is intentionally NOT in the chart palette.** It's a neutral muted token, dashed, semi-transparent. The eye reads it as "the frame" not "another property line". This is the most important chart token for the brief: it's how "vs. expected" gets visualized.

## Contrast verification (target: WCAG 2.1 AA, 4.5:1 for body text)

OKLCH lightness is perceptually uniform but not identical to WCAG L*; pairings below are estimated from lightness deltas and verified by the spec's intent. Anything close to a threshold should be confirmed in Phase 6 with a contrast checker before shipping.

**Light mode:**
- `foreground` (0.20) on `background` (0.99) → very strong, ≈14:1.
- `muted-foreground` (0.48) on `background` (0.99) → ≈4.6:1, just clears AA. Use for secondary text only.
- `primary` (0.50) on `background` (0.99) → ≈5.0:1, clears AA for body link text and on-track icons.
- `success` (0.55) used as bg with `success-foreground` (0.99) → strong; safe for solid chips.
- `success` (0.55) on `background` (0.99) used as text on a tinted bg → ≈4.7:1, clears AA.
- `warning` (0.72) used as bg with `warning-foreground` (≈0.22) → strong contrast; warning chips must use *dark* text.
- `warning` (0.72) on `background` (0.99) used as text → ≈3.0:1, **fails AA for body text**. Use warning only as a background; if needed as text, prefer the soft-chip pattern `bg-warning/15 text-warning-foreground` or use a darker derivative.

**Dark mode:**
- `foreground` (0.96) on `background` (0.14) → very strong.
- `muted-foreground` (0.72) on `background` (0.14) → ≈6.5:1, comfortable.
- `primary` (0.68) on `background` (0.14) → ≈6.0:1, comfortable.
- `success` (0.70) text on `background` (0.14) → ≈6.5:1.
- `warning` (0.78) text on `background` (0.14) → ≈7.5:1; in dark mode warning *can* be used as text safely.

**Recommendation**: `OnTrackBadge` in light mode uses solid-fill chips (`bg-success text-success-foreground` / `bg-warning text-warning-foreground` / `bg-muted text-muted-foreground`), not tinted-text. In dark mode, soft-chip pattern (`bg-success/20 text-success`) reads better and contrast still passes.

## Spacing, radius, type — unchanged

The existing scale is fine for this philosophy and not worth churning:

- **Radius**: `--radius: 0.625rem` (10px) with `radius-sm/md/lg` derivations. Cards at `radius-lg`, inputs at `radius-md`, chips at `radius-sm` or `--radius-full` (full pill).
- **Type families**: Inter sans, JetBrains Mono. Already loaded as `--font-inter` and `--font-jetbrains` Next.js font vars. Numbers globally tabular via `.numeric` class and the `td.numeric` selector ([app/globals.css:102-107](../../app/globals.css)).
- **Spacing scale**: Tailwind default. No custom scale needed; the brief calls for generous whitespace, which is achieved by *picking larger steps* (`p-6` over `p-4`, `gap-8` over `gap-4`), not by introducing new tokens.

## Type ramp (intent — not new tokens)

The brief asks for type-driven hierarchy. We achieve this with Tailwind utilities, not new CSS variables. The convention for this redesign:

| Use | Class | Rationale |
|---|---|---|
| Hero KPI value | `text-4xl md:text-5xl font-semibold tracking-tight tabular-nums` | The number IS the headline. Big, tight, mono-aligned. |
| Hero KPI label | `text-sm font-medium text-muted-foreground` | Quiet, supporting. |
| MoM delta + vs-target chip | `text-xs font-medium tabular-nums` | Small, but tabular so the sign and digits stay aligned. |
| Section heading ("Pulso del mes") | `text-lg font-semibold tracking-tight` | Editorial, not loud. No uppercase, no all-caps. |
| Secondary KPI value | `text-2xl font-semibold tabular-nums` | Demoted from hero. |
| Body / chart labels | `text-sm` | Default. |
| Chart axis ticks | `text-xs text-muted-foreground tabular-nums` | Smaller, quieter. |

## Motion

No new motion tokens. Use Tailwind's `transition-*` and `duration-*` utilities. For `framer-motion` count-ups and chart transitions in Phase 6, use `duration: 0.25, ease: "easeOut"` as the default; respect `prefers-reduced-motion: reduce` (skip animation, snap to value).

## Open question forwarded to Phase 5/6

The 95%-of-pace-adjusted-target threshold for `OnTrackBadge` is conventional but not yet committed. Locking it requires writing the comparison utility. Default: ≥95% = success, <95% = warning, no target = muted. To be confirmed when `HeroKpi` is built.
