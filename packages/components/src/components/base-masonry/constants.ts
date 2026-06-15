/**
 * Named gap scale for {@link BaseMasonry}. Each step maps to a `--mp-spacing-*`
 * design token (see {@link MASONRY_GAP_SPACING}).
 */
export type MasonryGap = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Maps each {@link MasonryGap} step onto a `--mp-spacing-*` token, walking up
 * the spacing scale: `2xs` → 4px … `2xl` → 48px (at the 14px base).
 */
export const MASONRY_GAP_SPACING: Record<MasonryGap, string> = {
  '2xs': 'var(--mp-spacing-1)',
  xs: 'var(--mp-spacing-2)',
  sm: 'var(--mp-spacing-3)',
  md: 'var(--mp-spacing-4)',
  lg: 'var(--mp-spacing-6)',
  xl: 'var(--mp-spacing-8)',
  '2xl': 'var(--mp-spacing-12)',
};
