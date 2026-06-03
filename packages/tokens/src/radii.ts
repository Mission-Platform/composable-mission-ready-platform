// ─── Border radius tokens (JavaScript/TypeScript) ─────────────────────────────

export const radii = {
  none: '0',
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
} as const

export type Radii = typeof radii
