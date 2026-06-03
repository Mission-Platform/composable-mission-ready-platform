// ─── Shared icon size composable ─────────────────────────────────────────────
// Maps named size tokens to CSS var() expressions with rem fallbacks from
// @mission-platform/tokens so every icon component shares one source of truth.

import { sizeIcons } from '@mission-platform/tokens'
import { computed, type ComputedRef } from 'vue'

/**
 * Named size token → CSS `var(--mp-size-icon-*)` with a rem fallback.
 * The rem values come from `sizeIcons` in @mission-platform/tokens.
 */
export const ICON_SIZE_MAP: Record<string, string> = {
  '2xs': `var(--mp-size-icon-2xs, ${sizeIcons['2xs']})`,
  xs: `var(--mp-size-icon-xs,  ${sizeIcons.xs})`,
  sm: `var(--mp-size-icon-sm,  ${sizeIcons.sm})`,
  md: `var(--mp-size-icon-md,  ${sizeIcons.md})`,
  lg: `var(--mp-size-icon-lg,  ${sizeIcons.lg})`,
  xl: `var(--mp-size-icon-xl,  ${sizeIcons.xl})`,
  '2xl': `var(--mp-size-icon-2xl, ${sizeIcons['2xl']})`,
}

/**
 * Returns a reactive CSS size string for an icon `size` prop value.
 * - Named token (e.g. `'md'`) → `var(--mp-size-icon-md, 1.125rem)`
 * - Number (e.g. `32`)        → `'32px'`
 * - Any other string           → returned as-is
 */
export function useIconSize(size: () => number | string): ComputedRef<string> {
  return computed(() => {
    const s = size()
    if (typeof s === 'number') return `${s}px`
    if (s in ICON_SIZE_MAP) return ICON_SIZE_MAP[s]
    return s as string
  })
}
