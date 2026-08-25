import {
  classNames,
  hasSlot,
  Slot,
  useEffect,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import styles from './forge-application-layout.module.scss';

/** Severity of the application-wide status banner shown above the header. */
export type StatusLevel = 'none' | 'info' | 'warning' | 'error';

/** Named viewport breakpoint at/above which the sidebar columns render inline. */
export type SidebarBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ApplicationLayoutStyleProperties {
  readonly 'layout-application-border-sidebar'?: string;
  readonly 'layout-application-border-width-sidebar'?: string;
  readonly 'layout-application-padding-status-block'?: string;
  readonly 'layout-application-padding-status-inline'?: string;
  readonly 'layout-application-padding-status-inline-wide'?: string;
  readonly 'layout-application-scrim-default'?: string;
  readonly 'layout-application-shadow-overlay'?: string;
  readonly 'layout-application-surface-default'?: string;
  readonly 'layout-application-surface-sidebar'?: string;
  readonly 'layout-application-transition-duration'?: string;
  readonly 'layout-application-transition-easing'?: string;
  readonly 'layout-application-typography-font-family'?: string;
  readonly 'layout-application-typography-font-size'?: string;
  readonly 'layout-application-typography-font-weight'?: string;
  readonly 'layout-application-typography-letter-spacing'?: string;
  readonly 'layout-application-typography-line-height'?: string;
  readonly 'sidebar-top'?: string;
  readonly 'sidebar-width'?: string;
}

export type ApplicationLayoutStyle = CSSStyleProperties & {
  readonly '--forge-application-layout-layout-application-border-sidebar'?: string | undefined;
  readonly '--forge-application-layout-layout-application-border-width-sidebar'?: string | undefined;
  readonly '--forge-application-layout-layout-application-padding-status-block'?: string | undefined;
  readonly '--forge-application-layout-layout-application-padding-status-inline'?: string | undefined;
  readonly '--forge-application-layout-layout-application-padding-status-inline-wide'?: string | undefined;
  readonly '--forge-application-layout-layout-application-scrim-default'?: string | undefined;
  readonly '--forge-application-layout-layout-application-shadow-overlay'?: string | undefined;
  readonly '--forge-application-layout-layout-application-surface-default'?: string | undefined;
  readonly '--forge-application-layout-layout-application-surface-sidebar'?: string | undefined;
  readonly '--forge-application-layout-layout-application-transition-duration'?: string | undefined;
  readonly '--forge-application-layout-layout-application-transition-easing'?: string | undefined;
  readonly '--forge-application-layout-layout-application-typography-font-family'?: string | undefined;
  readonly '--forge-application-layout-layout-application-typography-font-size'?: string | undefined;
  readonly '--forge-application-layout-layout-application-typography-font-weight'?: string | undefined;
  readonly '--forge-application-layout-layout-application-typography-letter-spacing'?: string | undefined;
  readonly '--forge-application-layout-layout-application-typography-line-height'?: string | undefined;
  readonly '--forge-application-layout-sidebar-top'?: string | undefined;
  readonly '--forge-application-layout-sidebar-width'?: string | undefined;
};

function createApplicationLayoutStyle(
  properties: Readonly<ApplicationLayoutStyleProperties> | undefined,
): ApplicationLayoutStyle | undefined {
  return createForgeStyle({
    '--forge-application-layout-layout-application-border-sidebar': properties?.['layout-application-border-sidebar'],
    '--forge-application-layout-layout-application-border-width-sidebar':
      properties?.['layout-application-border-width-sidebar'],
    '--forge-application-layout-layout-application-padding-status-block':
      properties?.['layout-application-padding-status-block'],
    '--forge-application-layout-layout-application-padding-status-inline':
      properties?.['layout-application-padding-status-inline'],
    '--forge-application-layout-layout-application-padding-status-inline-wide':
      properties?.['layout-application-padding-status-inline-wide'],
    '--forge-application-layout-layout-application-scrim-default': properties?.['layout-application-scrim-default'],
    '--forge-application-layout-layout-application-shadow-overlay': properties?.['layout-application-shadow-overlay'],
    '--forge-application-layout-layout-application-surface-default': properties?.['layout-application-surface-default'],
    '--forge-application-layout-layout-application-surface-sidebar': properties?.['layout-application-surface-sidebar'],
    '--forge-application-layout-layout-application-transition-duration':
      properties?.['layout-application-transition-duration'],
    '--forge-application-layout-layout-application-transition-easing':
      properties?.['layout-application-transition-easing'],
    '--forge-application-layout-layout-application-typography-font-family':
      properties?.['layout-application-typography-font-family'],
    '--forge-application-layout-layout-application-typography-font-size':
      properties?.['layout-application-typography-font-size'],
    '--forge-application-layout-layout-application-typography-font-weight':
      properties?.['layout-application-typography-font-weight'],
    '--forge-application-layout-layout-application-typography-letter-spacing':
      properties?.['layout-application-typography-letter-spacing'],
    '--forge-application-layout-layout-application-typography-line-height':
      properties?.['layout-application-typography-line-height'],
    '--forge-application-layout-sidebar-top': properties?.['sidebar-top'],
    '--forge-application-layout-sidebar-width': properties?.['sidebar-width'],
  }) as ApplicationLayoutStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ApplicationLayoutProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /** Severity of the status banner. Defaults to `'none'` (the banner is hidden). */
  statusLevel?: StatusLevel;
  /** When `true`, the header slot sticks to the top of the viewport on scroll. */
  stickyHeader?: boolean;
  /**
   * Breakpoint at/above which the `startSidebar` / `endSidebar` columns are
   * rendered. Below it the sidebars collapse away (a host typically surfaces
   * their content through the navbar's own mobile menu instead). When omitted
   * the sidebars are always rendered whenever their slot is filled.
   */
  sidebarBreakpoint?: SidebarBreakpoint;
  /** Status-banner content (the `status` named slot). */
  status?: MpChild;
  /** Header / navbar content (the `navbar` named slot). */
  navbar?: MpChild;
  /** Leading sidebar content flanking the start (inline-start) edge of the content (the `startSidebar` named slot). */
  startSidebar?: MpChild;
  /** Trailing sidebar content flanking the end (inline-end) edge of the content (the `endSidebar` named slot). */
  endSidebar?: MpChild;
  /**
   * Force the `startSidebar` column to render even when `sidebarBreakpoint`
   * would otherwise collapse it. Lets a host reveal the collapsed sidebar on
   * demand (e.g. from a navbar toggle button) in the range between the navbar's
   * own mobile breakpoint and `sidebarBreakpoint`. Ignored above the breakpoint,
   * where the sidebar is always shown.
   */
  startSidebarOpen?: boolean;
  /** Force the `endSidebar` column to render even when `sidebarBreakpoint` would otherwise collapse it (see {@link startSidebarOpen}). */
  endSidebarOpen?: boolean;
  /**
   * Called with the next open state when a `startSidebarOpen`-revealed overlay
   * sidebar requests to close (its dismiss backdrop was clicked). Always invoked
   * with `false`, mirroring the `callback-prop` `v-model` convention so a host
   * can clear its `startSidebarOpen` state.
   */
  onStartSidebarOpenChange?: (open: boolean) => void;
  /** Called with the next open state when an `endSidebarOpen`-revealed overlay sidebar requests to close (see {@link onStartSidebarOpenChange}). */
  onEndSidebarOpenChange?: (open: boolean) => void;
  /** Main page content (the `content` named slot). */
  content?: MpChild;
  /** Footer content (the `footer` named slot). */
  footer?: MpChild;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ApplicationLayoutStyleProperties>;
}

/** Minimum viewport width (px) for each named sidebar breakpoint. */
const BREAKPOINT_PX: Record<SidebarBreakpoint, number> = {
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1920,
  xl: 2560,
};

/** Maps each {@link StatusLevel} onto the banner background colour token. */
const STATUS_BACKGROUND: Record<StatusLevel, string> = {
  none: 'transparent',
  info: 'var(--mp-component-layout-application-status-background-info)',
  warning: 'var(--mp-component-layout-application-status-background-warning)',
  error: 'var(--mp-component-layout-application-status-background-error)',
};

/**
 * The banner's ARIA role: `alert` (assertive) for errors, `status` (polite) for
 * info/warning, and none when there is no banner. `role="alert"`/`"status"`
 * imply the matching `aria-live`, so no explicit `aria-live` is set.
 */
function resolveStatusRole(level: StatusLevel): string | undefined {
  if (level === 'error') {
    return 'alert';
  }
  if (level === 'none') {
    return undefined;
  }
  return 'status';
}

/**
 * `ForgeApplicationLayout` — the top-level application shell authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It lays out stacked regions — a colour-coded status banner, a header (for a
 * navbar), a body row (an optional leading sidebar, the main content, and an
 * optional trailing sidebar), and a footer — each exposed as a **named slot**
 * (`status`, `navbar`, `startSidebar`, `content`, `endSidebar`, `footer`). The
 * two sidebar regions are only rendered when their slot is filled (detected with
 * the framework-neutral {@link hasSlot} helper) and stick alongside the content
 * as the page scrolls. The status banner's colour and ARIA role derive from
 * `statusLevel`, and `stickyHeader` pins the header to the top of the viewport.
 *
 * It owns its styling through the co-located CSS Module
 * `forge-application-layout.module.scss` (carried onto every framework by the
 * two-stage compiler, so the component ships its own `@layer mp.layout`
 * CSS). The hashed module class names are assembled with the framework-neutral
 * {@link classNames} helper.
 */
export function ForgeApplicationLayout(properties: Readonly<ApplicationLayoutProperties>): MpElement {
  const style = createApplicationLayoutStyle(properties.properties);

  const {
    statusLevel = 'none',
    stickyHeader = false,
    sidebarBreakpoint,
    startSidebarOpen = false,
    endSidebarOpen = false,
    onStartSidebarOpenChange,
    onEndSidebarOpenChange,
  } = properties;

  // Whether the sidebar columns are currently rendered. With no `sidebarBreakpoint`
  // they are always on; otherwise a reactive `matchMedia` query gates them so they
  // collapse below the breakpoint. During SSR (no `window`) the query is treated as
  // unmatched, so a breakpoint-gated layout renders sidebar-less until hydration.
  const [sidebarsVisible, setSidebarsVisible] = useState(sidebarBreakpoint === undefined);

  useEffect(() => {
    if (sidebarBreakpoint === undefined) {
      setSidebarsVisible(true);
      return;
    }
    if (globalThis.window === undefined || typeof globalThis.matchMedia !== 'function') {
      return;
    }
    const query = globalThis.matchMedia(`(min-width: ${BREAKPOINT_PX[sidebarBreakpoint]}px)`);
    const update = (): void => setSidebarsVisible(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [sidebarBreakpoint]);

  // A sidebar is rendered inline (a sticky column flanking the content) when the
  // breakpoint gate is satisfied. When the gate is *not* satisfied but the host
  // forces it open (`startSidebarOpen` / `endSidebarOpen`), it renders instead as
  // a floating overlay above the page, backed by a click-to-dismiss backdrop.
  const startInline = sidebarsVisible && hasSlot('startSidebar');
  const endInline = sidebarsVisible && hasSlot('endSidebar');
  const startOverlay = !sidebarsVisible && startSidebarOpen && hasSlot('startSidebar');
  const endOverlay = !sidebarsVisible && endSidebarOpen && hasSlot('endSidebar');

  const showStartSidebar = startInline || startOverlay;
  const showEndSidebar = endInline || endOverlay;
  const showBackdrop = startOverlay || endOverlay;

  // Dismiss whichever overlay sidebar(s) are open when the backdrop is clicked.
  const dismissOverlays = (): void => {
    if (startOverlay) onStartSidebarOpenChange?.(false);
    if (endOverlay) onEndSidebarOpenChange?.(false);
  };

  const statusColor = STATUS_BACKGROUND[statusLevel];
  const statusTextColor = statusLevel === 'none' ? undefined : 'var(--mp-component-layout-application-text-status)';
  const statusRole = resolveStatusRole(statusLevel);

  return (
    <div
      class={styles['application-layout']}
      style={style}
    >
      <div
        class={styles['application-layout__status']}
        role={statusRole}
        aria-hidden={statusLevel === 'none' || undefined}
        style={{ backgroundColor: statusColor, color: statusTextColor }}
      >
        <Slot name="status" />
      </div>
      <div
        class={classNames(styles['application-layout__header'], {
          [styles['application-layout__header--sticky']]: stickyHeader,
        })}
      >
        <Slot name="navbar" />
      </div>
      <div class={styles['application-layout__body']}>
        {showBackdrop ? (
          <div
            class={styles['application-layout__backdrop']}
            aria-hidden="true"
            onClick={dismissOverlays}
          />
        ) : undefined}
        {showStartSidebar ? (
          <aside
            class={classNames(styles['application-layout__sidebar'], styles['application-layout__sidebar--start'], {
              [styles['application-layout__sidebar--overlay']]: startOverlay,
            })}
          >
            <Slot name="startSidebar" />
          </aside>
        ) : undefined}
        <main class={styles['application-layout__content']}>
          <Slot name="content" />
        </main>
        {showEndSidebar ? (
          <aside
            class={classNames(styles['application-layout__sidebar'], styles['application-layout__sidebar--end'], {
              [styles['application-layout__sidebar--overlay']]: endOverlay,
            })}
          >
            <Slot name="endSidebar" />
          </aside>
        ) : undefined}
      </div>
      <footer class={styles['application-layout__footer']}>
        <Slot name="footer" />
      </footer>
    </div>
  );
}
