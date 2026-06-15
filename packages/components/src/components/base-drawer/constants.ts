/** The canonical named size scale for {@link BaseDrawer}. */
export type DrawerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Canonical, pixel-independent (`rem`) size of every named drawer size.
 *
 * For `start`/`end` placements this value is the drawer's **width**; for
 * `top`/`bottom` placements it is the drawer's **height**. Mirrors the SCSS
 * size map in `base-drawer.vue` — keep the two in sync.
 */
export const DRAWER_SIZE_REM: Record<DrawerSize, number> = {
  '2xs': 14,
  xs: 17,
  sm: 20,
  md: 25.714,
  lg: 34.286,
  xl: 45.714,
  '2xl': 57,
};
