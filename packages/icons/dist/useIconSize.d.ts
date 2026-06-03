import { type ComputedRef } from 'vue';
/**
 * Named size token → CSS `var(--mp-size-icon-*)` with a rem fallback.
 * The rem values come from `sizeIcons` in @mission-platform/tokens.
 */
export declare const ICON_SIZE_MAP: Record<string, string>;
/**
 * Returns a reactive CSS size string for an icon `size` prop value.
 * - Named token (e.g. `'md'`) → `var(--mp-size-icon-md, 1.125rem)`
 * - Number (e.g. `32`)        → `'32px'`
 * - Any other string           → returned as-is
 */
export declare function useIconSize(size: () => number | string): ComputedRef<string>;
