import {
  Slot,
  useEffect,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import { ForgeTypography } from '@mission-platform/typography';

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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface NavbarStyleProperties {
  readonly 'navigation-navbar-border'?: string;
  readonly 'navigation-navbar-border-width'?: string;
  readonly 'navigation-navbar-center-gap-default'?: string;
  readonly 'navigation-navbar-center-gap-wide'?: string;
  readonly 'navigation-navbar-center-gap-widest'?: string;
  readonly 'navigation-navbar-container-gap-default'?: string;
  readonly 'navigation-navbar-container-gap-wide'?: string;
  readonly 'navigation-navbar-container-gap-widest'?: string;
  readonly 'navigation-navbar-container-height'?: string;
  readonly 'navigation-navbar-container-padding-default'?: string;
  readonly 'navigation-navbar-container-padding-wide'?: string;
  readonly 'navigation-navbar-container-padding-widest'?: string;
  readonly 'navigation-navbar-end-gap'?: string;
  readonly 'navigation-navbar-hamburger-bar-color'?: string;
  readonly 'navigation-navbar-hamburger-bar-height'?: string;
  readonly 'navigation-navbar-hamburger-focus-ring'?: string;
  readonly 'navigation-navbar-hamburger-gap'?: string;
  readonly 'navigation-navbar-hamburger-padding'?: string;
  readonly 'navigation-navbar-hamburger-radius'?: string;
  readonly 'navigation-navbar-hamburger-size'?: string;
  readonly 'navigation-navbar-hamburger-surface-hover'?: string;
  readonly 'navigation-navbar-hamburger-text'?: string;
  readonly 'navigation-navbar-mobile-nav-end-gap'?: string;
  readonly 'navigation-navbar-mobile-nav-end-padding-top'?: string;
  readonly 'navigation-navbar-mobile-nav-gap'?: string;
  readonly 'navigation-navbar-mobile-nav-items-gap'?: string;
  readonly 'navigation-navbar-mobile-nav-padding-block'?: string;
  readonly 'navigation-navbar-mobile-nav-padding-inline'?: string;
  readonly 'navigation-navbar-start-gap'?: string;
  readonly 'navigation-navbar-surface'?: string;
}

export type NavbarStyle = CSSStyleProperties & {
  readonly '--forge-navbar-navigation-navbar-border'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-border-width'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-center-gap-default'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-center-gap-wide'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-center-gap-widest'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-container-gap-default'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-container-gap-wide'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-container-gap-widest'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-container-height'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-container-padding-default'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-container-padding-wide'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-container-padding-widest'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-end-gap'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-hamburger-bar-color'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-hamburger-bar-height'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-hamburger-focus-ring'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-hamburger-gap'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-hamburger-padding'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-hamburger-radius'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-hamburger-size'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-hamburger-surface-hover'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-hamburger-text'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-mobile-nav-end-gap'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-mobile-nav-end-padding-top'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-mobile-nav-gap'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-mobile-nav-items-gap'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-mobile-nav-padding-block'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-mobile-nav-padding-inline'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-start-gap'?: string | undefined;
  readonly '--forge-navbar-navigation-navbar-surface'?: string | undefined;
};

function createNavbarStyle(properties: Readonly<NavbarStyleProperties> | undefined): NavbarStyle | undefined {
  return createForgeStyle({
    '--forge-navbar-navigation-navbar-border': properties?.['navigation-navbar-border'],
    '--forge-navbar-navigation-navbar-border-width': properties?.['navigation-navbar-border-width'],
    '--forge-navbar-navigation-navbar-center-gap-default': properties?.['navigation-navbar-center-gap-default'],
    '--forge-navbar-navigation-navbar-center-gap-wide': properties?.['navigation-navbar-center-gap-wide'],
    '--forge-navbar-navigation-navbar-center-gap-widest': properties?.['navigation-navbar-center-gap-widest'],
    '--forge-navbar-navigation-navbar-container-gap-default': properties?.['navigation-navbar-container-gap-default'],
    '--forge-navbar-navigation-navbar-container-gap-wide': properties?.['navigation-navbar-container-gap-wide'],
    '--forge-navbar-navigation-navbar-container-gap-widest': properties?.['navigation-navbar-container-gap-widest'],
    '--forge-navbar-navigation-navbar-container-height': properties?.['navigation-navbar-container-height'],
    '--forge-navbar-navigation-navbar-container-padding-default':
      properties?.['navigation-navbar-container-padding-default'],
    '--forge-navbar-navigation-navbar-container-padding-wide': properties?.['navigation-navbar-container-padding-wide'],
    '--forge-navbar-navigation-navbar-container-padding-widest':
      properties?.['navigation-navbar-container-padding-widest'],
    '--forge-navbar-navigation-navbar-end-gap': properties?.['navigation-navbar-end-gap'],
    '--forge-navbar-navigation-navbar-hamburger-bar-color': properties?.['navigation-navbar-hamburger-bar-color'],
    '--forge-navbar-navigation-navbar-hamburger-bar-height': properties?.['navigation-navbar-hamburger-bar-height'],
    '--forge-navbar-navigation-navbar-hamburger-focus-ring': properties?.['navigation-navbar-hamburger-focus-ring'],
    '--forge-navbar-navigation-navbar-hamburger-gap': properties?.['navigation-navbar-hamburger-gap'],
    '--forge-navbar-navigation-navbar-hamburger-padding': properties?.['navigation-navbar-hamburger-padding'],
    '--forge-navbar-navigation-navbar-hamburger-radius': properties?.['navigation-navbar-hamburger-radius'],
    '--forge-navbar-navigation-navbar-hamburger-size': properties?.['navigation-navbar-hamburger-size'],
    '--forge-navbar-navigation-navbar-hamburger-surface-hover':
      properties?.['navigation-navbar-hamburger-surface-hover'],
    '--forge-navbar-navigation-navbar-hamburger-text': properties?.['navigation-navbar-hamburger-text'],
    '--forge-navbar-navigation-navbar-mobile-nav-end-gap': properties?.['navigation-navbar-mobile-nav-end-gap'],
    '--forge-navbar-navigation-navbar-mobile-nav-end-padding-top':
      properties?.['navigation-navbar-mobile-nav-end-padding-top'],
    '--forge-navbar-navigation-navbar-mobile-nav-gap': properties?.['navigation-navbar-mobile-nav-gap'],
    '--forge-navbar-navigation-navbar-mobile-nav-items-gap': properties?.['navigation-navbar-mobile-nav-items-gap'],
    '--forge-navbar-navigation-navbar-mobile-nav-padding-block':
      properties?.['navigation-navbar-mobile-nav-padding-block'],
    '--forge-navbar-navigation-navbar-mobile-nav-padding-inline':
      properties?.['navigation-navbar-mobile-nav-padding-inline'],
    '--forge-navbar-navigation-navbar-start-gap': properties?.['navigation-navbar-start-gap'],
    '--forge-navbar-navigation-navbar-surface': properties?.['navigation-navbar-surface'],
  }) as NavbarStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<NavbarStyleProperties>;
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
  const style = createNavbarStyle(properties.properties);

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
    <div
      className={styles['forge-navbar-host']}
      style={style}
    >
      <header
        className={[
          styles['forge-navbar'],
          sizeStyles[`forge-size--${size}`],
          { [styles['forge-navbar--sticky']]: sticky, [styles['forge-navbar--mobile']]: isMobile },
        ]}
        style={style}
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
