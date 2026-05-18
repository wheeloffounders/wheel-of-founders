/**
 * Official Pro brand — single source of truth for Pro gate UI.
 *
 * Gradient token: `app/globals.css` `@theme` → `--background-image-pro-brand` → Tailwind `bg-pro-brand`.
 * Do not duplicate hex stops elsewhere; import these exports from components.
 */

/** Core fill — use for badges, chips, and any `bg-pro-brand` surface. */
export const PRO_BRAND_BG_CLASS = 'bg-pro-brand'

/**
 * Shared gradient fill + border / shadow / ring (badges + “View Pro plans” CTA).
 * Typography and radius are added per surface.
 */
export const PRO_GATE_BRAND_FILL_CLASS = [
  'border border-white/25',
  PRO_BRAND_BG_CLASS,
  'text-white shadow-md shadow-purple-500/30 ring-1 ring-white/30',
  'dark:border-white/20 dark:shadow-[0_0_16px_rgba(168,85,247,0.35)] dark:ring-white/15',
].join(' ')

/** Small Pro pill (Clear the Path, Freemium corner, Blueprints label, morning insight chip). */
export const PRO_GATE_BADGE_SURFACE_CLASS = [
  'rounded-md inline-flex items-center justify-center gap-1 px-2 py-1',
  PRO_GATE_BRAND_FILL_CLASS,
  'text-[10px] font-bold uppercase tracking-wide',
].join(' ')

/** Locked blueprint chip corner (✨) — same brand fill as pills. */
export const PRO_GATE_BLUEPRINT_SPARKLE_CLASS = [
  'rounded-full',
  PRO_BRAND_BG_CLASS,
  'text-white shadow-md shadow-purple-500/35 ring-1 ring-white/35',
  'dark:shadow-[0_0_12px_rgba(236,72,153,0.35)] dark:ring-white/20',
].join(' ')

/** Freemium blueprint row — pill over faded chips (gradient + lock icon). */
export const PRO_GATE_BLUEPRINT_LOCK_OVERLAY_BADGE_CLASS = [
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
  PRO_GATE_BRAND_FILL_CLASS,
  'text-[10px] font-bold uppercase tracking-wide shadow-lg shadow-purple-500/25',
  'transition hover:scale-105 hover:brightness-110',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  'dark:focus-visible:ring-offset-gray-950',
].join(' ')

/**
 * Enabled Pro distillation / typed Sort CTAs (Finish & Sort, etc.).
 * Callers supply layout (`flex`, padding, radius) and border width; this supplies brand fill + interaction.
 */
export const PRO_BRAND_ACTION_ENABLED_SURFACE_CLASS = [
  PRO_BRAND_BG_CLASS,
  'text-white shadow-lg shadow-purple-500/35',
  'hover:brightness-110 active:brightness-95',
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-400/40',
].join(' ')

/**
 * Primary “View Pro plans” and upgrade links — same Pro brand fill as badges, CTA type scale + hover.
 * Re-exported as `viewProPlansCtaClassName` from `@/lib/ui/view-pro-plans-cta`.
 */
export const PRO_GATE_VIEW_PLANS_CTA_CLASS = [
  'inline-flex items-center justify-center rounded-lg',
  PRO_GATE_BRAND_FILL_CLASS,
  'px-4 py-2 text-sm font-semibold',
  'transition hover:scale-[1.02] hover:brightness-110 hover:shadow-[0_0_15px_rgba(219,39,119,0.3)] active:scale-[0.99]',
  'dark:hover:shadow-[0_0_18px_rgba(236,72,153,0.35)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  'dark:focus-visible:ring-offset-gray-950',
].join(' ')
