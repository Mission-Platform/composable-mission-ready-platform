export declare const breakpointKeys: readonly ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"];
export type BreakpointKey = (typeof breakpointKeys)[number];
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
export declare const breakpoints: Record<BreakpointKey, number>;
/**
 * Returns the pixel value for a given breakpoint key.
 */
export declare function getBreakpointValue(key: BreakpointKey): number;
/**
 * Returns a `min-width` media query string for the given breakpoint.
 *
 * @example
 * mediaQuery('lg') // → '(min-width: 1920px)'
 * mediaQuery('xl') // → '(min-width: 2560px)'
 */
export declare function mediaQuery(key: BreakpointKey): string;
/**
 * Returns a `max-width` media query string (upper-bound) for the given
 * breakpoint — i.e. "smaller than the next step up".
 *
 * @example
 * maxMediaQuery('md') // → '(max-width: 1023px)'
 */
export declare function maxMediaQuery(key: BreakpointKey): string;
/**
 * Given a pixel width, returns the currently active breakpoint key.
 */
export declare function resolveBreakpoint(width: number): BreakpointKey;
export type BreakpointValues = Record<BreakpointKey, boolean>;
