import { h, type MpChild, type MpElement, Slot, useEffect, useState } from '@mission-platform/forge';

import { ForgeTypography } from '@/components/atoms/forge-typography';

import sizeStyles from '../../../styles/size.module.scss';
import { ForgeDrawer } from '../forge-drawer';

import styles from './forge-navbar.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type NavbarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Alignment of the default-slot (centre) navigation items. */
export type NavbarAlign = 'start' | 'center' | 'end';

/**
 * Named viewport breakpoint **below which** the navbar collapses into its
 * hamburger-toggled mobile drawer (and at/above which the full `brand` /
 * centre / `end` regions are shown inline).
 */
export type NavbarBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface NavbarProperties {
  /** Size token controlling the navbar's scale. Defaults to `'md'`. */
  size?: NavbarSize;
  /**
   * Start-region brand. Pass a `string` for the default typographic treatment
   * (rendered through {@link ForgeTypography}) or arbitrary content (an
   * {@link MpChild} — e.g. a logo) via the `brand` named slot.
   */
  brand?: string | MpChild;
  /** Stick the navbar to the top of the viewport on scroll. */
  sticky?: boolean;
  /** Title for the mobile navigation drawer (defaults to `brand`). */
  mobileTitle?: string;
  /** Alignment of the default-slot (centre) navigation items. Defaults to `'start'`. */
  align?: NavbarAlign;
  /**
   * Centre navigation items — the **default** slot (also mirrored into the
   * mobile drawer). Provide the nav links/buttons as the component's children.
   */
  children?: MpChild | readonly MpChild[];
  /**
   * Trailing-region content (e.g. auth actions, a theme toggle) — the `end`
   * named slot. Also mirrored into the mobile drawer.
   */
  end?: MpChild;
  /**
   * Viewport breakpoint below which the navbar collapses into its
   * hamburger-toggled mobile drawer. At/above it the full `brand` / centre /
   * `end` regions render inline. Defaults to `'sm'` (768px), matching the
   * historical fixed collapse point.
   */
  mobileBreakpoint?: NavbarBreakpoint;
}

/** Minimum viewport width (px) for each named breakpoint (mirrors `@mission-platform/breakpoints`). */
const BREAKPOINT_PX: Record<NavbarBreakpoint, number> = {
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1920,
  xl: 2560,
};

/**
 * `ForgeNavbar` — the top application navigation bar authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It lays out a `brand` slot, the centred default slot (navigation items), and
 * an `end` slot, collapsing on mobile (below the configurable `mobileBreakpoint`,
 * `'sm'` by default) to a hamburger button that toggles a {@link ForgeDrawer}
 * mirroring the default + `end` slots. The collapse is driven by a reactive
 * `matchMedia` query, and the drawer's open state is held locally with the
 * neutral `useState` hook.
 *
 * It composes the write-once {@link ForgeDrawer} and {@link ForgeTypography}, owns
 * its styling through the co-located `forge-navbar.module.scss`, and returns its
 * header + drawer under a single `display: contents` host (the neutral dialect
 * has no multi-root fragment return).
 */
export function ForgeNavbar(properties: Readonly<NavbarProperties>): MpElement {
  const { brand, sticky = false, mobileTitle, align = 'start', size = 'md', mobileBreakpoint = 'sm' } = properties;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Whether the navbar is currently collapsed into its mobile drawer. A reactive
  // `matchMedia` query gates it at `mobileBreakpoint` (the navbar collapses below
  // that width). During SSR (no `window`) it defaults to the inline desktop
  // layout, so the full regions are present in the server markup until hydration.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (globalThis.window === undefined || typeof globalThis.matchMedia !== 'function') {
      return;
    }
    const query = globalThis.matchMedia(`(max-width: ${BREAKPOINT_PX[mobileBreakpoint] - 0.02}px)`);
    const update = (): void => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [mobileBreakpoint]);

  return (
    <div className={styles['forge-navbar-host']}>
      <header
        className={[
          styles['forge-navbar'],
          sizeStyles[`forge-size--${size}`],
          { [styles['forge-navbar--sticky']]: sticky, [styles['forge-navbar--mobile']]: isMobile },
        ]}
      >
        <nav
          aria-label="Main navigation"
          className={styles['forge-navbar__container']}
        >
          <div className={styles['forge-navbar__start']}>
            <Slot name="brand">
              {brand ? (
                <ForgeTypography
                  as="span"
                  variant="h6"
                  color="primary"
                >
                  {brand}
                </ForgeTypography>
              ) : undefined}
            </Slot>
          </div>
          <div className={[styles['forge-navbar__center'], styles[`forge-navbar__center--${align}`]]}>
            <Slot />
          </div>
          <div className={styles['forge-navbar__end']}>
            <Slot name="end" />
          </div>
          <button
            type="button"
            className={styles['forge-navbar__hamburger']}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className={styles['forge-navbar__hamburger-bar']} />
            <span className={styles['forge-navbar__hamburger-bar']} />
            <span className={styles['forge-navbar__hamburger-bar']} />
          </button>
        </nav>
      </header>

      <ForgeDrawer
        open={sidebarOpen}
        title={mobileTitle ?? (typeof brand === 'string' ? brand : undefined)}
        placement="start"
        size="sm"
        onOpenChange={(next: boolean) => setSidebarOpen(next)}
      >
        <nav
          aria-label="Mobile navigation"
          className={styles['forge-navbar__mobile-nav']}
        >
          <div className={styles['forge-navbar__mobile-nav-items']}>
            <Slot />
          </div>
          <div className={styles['forge-navbar__mobile-nav-end']}>
            <Slot name="end" />
          </div>
        </nav>
      </ForgeDrawer>
    </div>
  );
}
