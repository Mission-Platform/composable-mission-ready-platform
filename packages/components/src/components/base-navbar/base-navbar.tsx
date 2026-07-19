import { h, Slot, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseDrawer } from '../base-drawer';
import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-navbar.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type NavbarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Alignment of the default-slot (centre) navigation items. */
export type NavbarAlign = 'start' | 'center' | 'end';

export interface NavbarProperties extends MpProperties {
  /** Size token controlling the navbar's scale. Defaults to `'md'`. */
  size?: NavbarSize;
  /** Brand text shown in the start region (overridable via the `brand` slot). */
  brand?: string;
  /** Stick the navbar to the top of the viewport on scroll. */
  sticky?: boolean;
  /** Title for the mobile navigation drawer (defaults to `brand`). */
  mobileTitle?: string;
  /** Alignment of the default-slot (centre) navigation items. Defaults to `'start'`. */
  align?: NavbarAlign;
}

/**
 * `BaseNavbar` — the top application navigation bar authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It lays out a `brand` slot, the centred default slot (navigation items), and
 * an `end` slot, collapsing on mobile (below the `sm` breakpoint, via CSS) to a
 * hamburger button that toggles a {@link BaseDrawer} mirroring the default +
 * `end` slots. The open state is held locally with the neutral `useState` hook.
 *
 * It composes the write-once {@link BaseDrawer} and {@link BaseTypography}, owns
 * its styling through the co-located `base-navbar.module.scss`, and returns its
 * header + drawer under a single `display: contents` host (the neutral dialect
 * has no multi-root fragment return).
 */
export function BaseNavbar(properties: Readonly<NavbarProperties>): MpElement {
  const { brand, sticky = false, mobileTitle, align = 'start', size = 'md' } = properties;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const header = (
    <header
      classNames={[
        styles['base-navbar'],
        sizeStyles[`base-size--${size}`],
        { [styles['base-navbar--sticky']]: sticky },
      ]}
    >
      <nav
        aria-label="Main navigation"
        classNames={styles['base-navbar__container']}
      >
        <div classNames={styles['base-navbar__start']}>
          <Slot name="brand">
            {brand ? (
              <BaseTypography
                as="span"
                variant="h6"
                color="primary"
              >
                {brand}
              </BaseTypography>
            ) : undefined}
          </Slot>
        </div>
        <div classNames={[styles['base-navbar__center'], styles[`base-navbar__center--${align}`]]}>
          <Slot />
        </div>
        <div classNames={styles['base-navbar__end']}>
          <Slot name="end" />
        </div>
        <button
          type="button"
          classNames={styles['base-navbar__hamburger']}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span classNames={styles['base-navbar__hamburger-bar']} />
          <span classNames={styles['base-navbar__hamburger-bar']} />
          <span classNames={styles['base-navbar__hamburger-bar']} />
        </button>
      </nav>
    </header>
  );

  const drawer = (
    <BaseDrawer
      open={sidebarOpen}
      title={mobileTitle ?? brand}
      placement="start"
      size="sm"
      onOpenChange={(next: boolean) => setSidebarOpen(next)}
    >
      <nav
        aria-label="Mobile navigation"
        classNames={styles['base-navbar__mobile-nav']}
      >
        <div classNames={styles['base-navbar__mobile-nav-items']}>
          <Slot />
        </div>
        <div classNames={styles['base-navbar__mobile-nav-end']}>
          <Slot name="end" />
        </div>
      </nav>
    </BaseDrawer>
  );

  return h('div', { class: styles['base-navbar-host'] }, header, drawer);
}
