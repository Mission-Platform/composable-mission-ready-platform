/**
 * Named gap scale for {@link BaseGrid}. Each step maps to a `--mp-spacing-*`
 * design token (see {@link GRID_GAP_SPACING}).
 */
export type GridGap = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Maps each {@link GridGap} step onto a `--mp-spacing-*` token, walking up the
 * spacing scale: `2xs` → 4px … `2xl` → 48px (at the 14px base).
 */
export const GRID_GAP_SPACING: Record<GridGap, string> = {
  '2xs': 'var(--mp-spacing-1)',
  xs: 'var(--mp-spacing-2)',
  sm: 'var(--mp-spacing-3)',
  md: 'var(--mp-spacing-4)',
  lg: 'var(--mp-spacing-6)',
  xl: 'var(--mp-spacing-8)',
  '2xl': 'var(--mp-spacing-12)',
};

/**
 * Item-placement keywords for {@link BaseGrid}. Used for both the inline-axis
 * (`justify` → `justify-items`) and block-axis (`align` → `align-items`)
 * controls; values map 1:1 onto the corresponding CSS Grid keywords.
 */
export type GridAlignment = 'start' | 'center' | 'end' | 'stretch';
