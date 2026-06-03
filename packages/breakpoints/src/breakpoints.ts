// ─── Breakpoint definitions ───────────────────────────────────────────────────
// Seven-step scale anchored so that `lg` represents a standard 1920×1080
// (Full HD) screen width.  All values are min-width thresholds in pixels.
//
//  2xs │  xs  │  sm  │  md   │  lg   │  xl   │  2xl
//    0    480    768    1024   1920    2560    3840
//       ────────────────────────────────────────────→  viewport width

export const breakpointKeys = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const
export type BreakpointKey = (typeof breakpointKeys)[number]

/**
 * Min-width pixel thresholds for every breakpoint step.
 *
 * - `2xs` — extra-extra-small: < 480 px (effectively 0)
 * - `xs`  — extra-small: ≥ 480 px
 * - `sm`  — small: ≥ 768 px (tablet portrait)
 * - `md`  — medium: ≥ 1024 px (tablet landscape / small laptop)
 * - `lg`  — large: ≥ 1920 px (Full HD / 1080p — 1920×1080)
 * - `xl`  — extra-large: ≥ 2560 px (QHD)
 * - `2xl` — extra-extra-large: ≥ 3840 px (4K UHD)
 */
export const breakpoints: Record<BreakpointKey, number> = {
  '2xs': 0,
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1920,
  xl: 2560,
  '2xl': 3840,
} as const

/**
 * Returns the pixel value for a given breakpoint key.
 */
export function getBreakpointValue(key: BreakpointKey): number {
  return breakpoints[key]
}

/**
 * Returns a `min-width` media query string for the given breakpoint.
 *
 * @example
 * mediaQuery('lg') // → '(min-width: 1920px)'
 * mediaQuery('xl') // → '(min-width: 2560px)'
 */
export function mediaQuery(key: BreakpointKey): string {
  const value = breakpoints[key]
  return value === 0 ? 'all' : `(min-width: ${value}px)`
}

/**
 * Returns a `max-width` media query string (upper-bound) for the given
 * breakpoint — i.e. "smaller than the next step up".
 *
 * @example
 * maxMediaQuery('md') // → '(max-width: 1023px)'
 */
export function maxMediaQuery(key: BreakpointKey): string {
  const value = breakpoints[key]
  return value === 0 ? 'not all' : `(max-width: ${value - 1}px)`
}

/**
 * Given a pixel width, returns the currently active breakpoint key.
 */
export function resolveBreakpoint(width: number): BreakpointKey {
  const reversed = Object.entries(breakpoints)
    .reverse()
    .filter(([_, value]) => width >= value)
    .map(([key, _]) => key as BreakpointKey)
    .at(0)
  if (!reversed) {
    return '2xs'
  }
  return reversed
}

export type BreakpointValues = Record<BreakpointKey, boolean>
