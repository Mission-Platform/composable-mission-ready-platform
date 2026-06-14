/** The canonical named width scale for {@link BaseSidebar}. */
export type SidebarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Canonical, pixel-independent (`rem`) width of every named sidebar size.
 * Mirrors the SCSS width map in `base-sidebar.vue` — keep the two in sync.
 */
export const SIDEBAR_SIZE_REM: Record<SidebarSize, number> = {
  '2xs': 14,
  xs: 17,
  sm: 20,
  md: 25.714,
  lg: 34.286,
  xl: 45.714,
  '2xl': 57,
};
