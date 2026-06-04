// ─── Spacing tokens (JavaScript/TypeScript) ───────────────────────────────────
// All values in rem (base font-size: 14px).

export const spacing = {
  0: '0',
  1: '0.286rem', // ~4px
  2: '0.571rem', // ~8px
  3: '0.857rem', // ~12px
  4: '1.143rem', // ~16px
  5: '1.429rem', // ~20px
  6: '1.714rem', // ~24px
  8: '2.286rem', // ~32px
  10: '2.857rem', // ~40px
  12: '3.429rem', // ~48px
  16: '4.571rem', // ~64px
  20: '5.714rem', // ~80px
  24: '6.857rem', // ~96px
} as const;

export type Spacing = typeof spacing;
