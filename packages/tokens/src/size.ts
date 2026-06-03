// ─── Unified component size scale (JavaScript/TypeScript) ────────────────────
// A canonical seven-step scale (2xs → 2xl) that drives component sizing.
// Each step covers: font-size, line-height, padding (block/inline),
// border-radius, icon size, and shadow depth.

export type SizeStep = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export const SIZE_STEPS: readonly SizeStep[] = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const

// ── Font size per size step ───────────────────────────────────────────────────
// All values in rem (base font-size: 14px). md = 1rem (base body size).
export const sizeFonts: Record<SizeStep, string> = {
  '2xs': '0.643rem', // ~9px
  xs: '0.786rem',    // ~11px
  sm: '0.929rem',    // ~13px
  md: '1rem',        //  14px  ← base (md = 1rem)
  lg: '1.143rem',    // ~16px
  xl: '1.286rem',    // ~18px
  '2xl': '1.714rem', // ~24px
}

// ── Line height per size step ─────────────────────────────────────────────────
export const sizeLeadings: Record<SizeStep, number> = {
  '2xs': 1.25,
  xs: 1.25,
  sm: 1.375,
  md: 1.5,
  lg: 1.5,
  xl: 1.5,
  '2xl': 1.375,
}

// ── Block (top/bottom) padding per size step ──────────────────────────────────
// All values in rem (base font-size: 14px).
export const sizePadBlock: Record<SizeStep, string> = {
  '2xs': '0.143rem', // ~2px
  xs: '0.286rem',    // ~4px
  sm: '0.429rem',    // ~6px
  md: '0.571rem',    // ~8px
  lg: '0.714rem',    // ~10px
  xl: '0.857rem',    // ~12px
  '2xl': '1.143rem', // ~16px
}

// ── Inline (left/right) padding per size step ─────────────────────────────────
// All values in rem (base font-size: 14px).
export const sizePadInline: Record<SizeStep, string> = {
  '2xs': '0.286rem', // ~4px
  xs: '0.571rem',    // ~8px
  sm: '0.714rem',    // ~10px
  md: '0.857rem',    // ~12px
  lg: '1.143rem',    // ~16px
  xl: '1.429rem',    // ~20px
  '2xl': '1.714rem', // ~24px
}

// ── Gap between elements per size step ───────────────────────────────────────
// All values in rem (base font-size: 14px).
export const sizeGaps: Record<SizeStep, string> = {
  '2xs': '0.143rem', // ~2px
  xs: '0.286rem',    // ~4px
  sm: '0.429rem',    // ~6px
  md: '0.571rem',    // ~8px
  lg: '0.857rem',    // ~12px
  xl: '1.143rem',    // ~16px
  '2xl': '1.714rem', // ~24px
}

// ── Border radius per size step ───────────────────────────────────────────────
// All values in rem (base font-size: 14px).
export const sizeRadii: Record<SizeStep, string> = {
  '2xs': '0.143rem', // ~2px
  xs: '0.286rem',    // ~4px
  sm: '0.286rem',    // ~4px
  md: '0.429rem',    // ~6px
  lg: '0.571rem',    // ~8px
  xl: '0.714rem',    // ~10px
  '2xl': '0.857rem', // ~12px
}

// ── Icon size per size step — md = 1rem (14px), matches font scale ─────────────
// All values in rem (base font-size: 14px).
export const sizeIcons: Record<SizeStep, string> = {
  '2xs': '0.643rem', // ~9px
  xs:    '0.786rem', // ~11px
  sm:    '0.929rem', // ~13px
  md:    '1rem',     //  14px  ← base (md = 1rem)
  lg:    '1.143rem', // ~16px
  xl:    '1.286rem', // ~18px
  '2xl': '1.714rem', // ~24px
}

// ── Box shadow per size step ──────────────────────────────────────────────────
// All values in rem (base font-size: 14px).
export const sizeShadows: Record<SizeStep, string> = {
  '2xs': '0 0.071rem 0.071rem 0 rgb(0 0 0 / 3%)',
  xs:    '0 0.071rem 0.143rem 0 rgb(0 0 0 / 5%)',
  sm:    '0 0.071rem 0.214rem 0 rgb(0 0 0 / 10%), 0 0.071rem 0.143rem -0.071rem rgb(0 0 0 / 10%)',
  md:    '0 0.286rem 0.429rem -0.071rem rgb(0 0 0 / 10%), 0 0.143rem 0.286rem -0.143rem rgb(0 0 0 / 10%)',
  lg:    '0 0.714rem 1.071rem -0.214rem rgb(0 0 0 / 10%), 0 0.286rem 0.429rem -0.286rem rgb(0 0 0 / 10%)',
  xl:    '0 1.429rem 1.786rem -0.357rem rgb(0 0 0 / 10%), 0 0.571rem 0.714rem -0.429rem rgb(0 0 0 / 10%)',
  '2xl': '0 1.786rem 3.571rem -0.857rem rgb(0 0 0 / 25%)',
}

// ── Height (touch target / input height) per size step ────────────────────────
// All values in rem (base font-size: 14px).
export const sizeHeights: Record<SizeStep, string> = {
  '2xs': '1.429rem', // ~20px
  xs: '1.714rem',    // ~24px
  sm: '2rem',        // ~28px
  md: '2.571rem',    // ~36px
  lg: '2.857rem',    // ~40px
  xl: '3.429rem',    // ~48px
  '2xl': '4rem',     // ~56px
}

// ── Margin / gap alias (semantic convenience) ─────────────────────────────────
export const sizeMargins = sizeGaps

// ── Content-area widths — 5/8 of each breakpoint (2xs & xs = full viewport) ──
// Base font-size: 14px. Formula: breakpointPx * 5/8 / 14 = rem value.
// 2xs & xs use '100vw' (viewport-relative) as they target mobile screens.
export const sizeWidths: Record<SizeStep, string> = {
  '2xs': '100vw',      // full viewport (mobile)
  xs:    '100vw',      // full viewport (small mobile / landscape)
  sm:    '34.286rem',  // 480px  (5/8 of 768px)
  md:    '45.714rem',  // 640px  (5/8 of 1024px)
  lg:    '85.714rem',  // 1200px (5/8 of 1920px)
  xl:    '114.286rem', // 1600px (5/8 of 2560px)
  '2xl': '171.429rem', // 2400px (5/8 of 3840px)
}

export type { SizeStep as ComponentSizeStep }
