// ─── Shared icon size composable ─────────────────────────────────────────────
// Maps named size tokens to CSS var() expressions with rem fallbacks from
// @mission-platform/tokens so every icon component shares one source of truth.

import { size } from '@mission-platform/tokens';
import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';

/**
 * Named size token → CSS `var(--mp-size-icon-*)` with a rem fallback.
 * The rem values come from `size.icon` in @mission-platform/tokens.
 */
export const ICON_SIZE_MAP: Record<string, string> = {
  '2xs': `var(--mp-size-icon-2xs, ${size.icon['2xs']})`,
  xs: `var(--mp-size-icon-xs,  ${size.icon.xs})`,
  sm: `var(--mp-size-icon-sm,  ${size.icon.sm})`,
  md: `var(--mp-size-icon-md,  ${size.icon.md})`,
  lg: `var(--mp-size-icon-lg,  ${size.icon.lg})`,
  xl: `var(--mp-size-icon-xl,  ${size.icon.xl})`,
  '2xl': `var(--mp-size-icon-2xl, ${size.icon['2xl']})`,
};

/** Root font-size (in px) used to convert numeric icon sizes to `rem`. */
const PX_PER_REM = 16;

/**
 * Returns a reactive CSS size string for an icon `size` prop value.
 * - Named token (e.g. `'md'`) → `var(--mp-size-icon-md, 1.125rem)`
 * - Number (e.g. `32`)        → `'2rem'` (interpreted as px and converted to rem)
 * - Any other string           → returned as-is
 */
export function useIconSize(size: MaybeRefOrGetter<number | string>): ComputedRef<string> {
  return computed(() => {
    const s = toValue(size);
    if (typeof s === 'number') return `${s / PX_PER_REM}rem`;
    if (s in ICON_SIZE_MAP) return ICON_SIZE_MAP[s];
    return s;
  });
}
