// ─── Shadow tokens (JavaScript/TypeScript) ────────────────────────────────────

export const shadows = {
  none: 'none',
  '2xs': '0 1px 1px 0 rgb(0 0 0 / 3%)',
  xs: '0 1px 2px 0 rgb(0 0 0 / 5%)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)',
  md: '0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 10%), 0 8px 10px -6px rgb(0 0 0 / 10%)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 25%)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 5%)',
  focusPrimary: '0 0 0 3px rgb(108 47 212 / 30%)',
  focusDanger: '0 0 0 3px rgb(244 63 94 / 30%)',
} as const

export type Shadows = typeof shadows
