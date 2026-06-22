import { classNames, h, Slot, type MpChild, type MpElement, type MpProperties } from '@mission-platform/jsx';

import styles from './base-application-layout.module.scss';

/** Severity of the application-wide status banner shown above the header. */
export type StatusLevel = 'none' | 'info' | 'warning' | 'error';

export interface ApplicationLayoutProperties extends MpProperties {
  /** Severity of the status banner. Defaults to `'none'` (the banner is hidden). */
  statusLevel?: StatusLevel;
  /** When `true`, the header slot sticks to the top of the viewport on scroll. */
  stickyHeader?: boolean;
  /** Status-banner content (the `status` named slot). */
  status?: MpChild;
  /** Header / navbar content (the `navbar` named slot). */
  navbar?: MpChild;
  /** Main page content (the `content` named slot). */
  content?: MpChild;
  /** Footer content (the `footer` named slot). */
  footer?: MpChild;
}

/** Maps each {@link StatusLevel} onto the banner background colour token. */
const STATUS_BACKGROUND: Record<StatusLevel, string> = {
  none: 'transparent',
  info: 'var(--mp-color-info-default)',
  warning: 'var(--mp-color-warning-default)',
  error: 'var(--mp-color-danger-default)',
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
 * `BaseApplicationLayout` — the top-level application shell authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It lays out four stacked regions — a colour-coded status banner, a header (for
 * a navbar), the scrollable main content, and a footer — each exposed as a
 * **named slot** (`status`, `navbar`, `content`, `footer`). The status banner's
 * colour and ARIA role derive from `statusLevel`, and `stickyHeader` pins the
 * header to the top of the viewport.
 *
 * It owns its styling through the co-located CSS Module
 * `base-application-layout.module.scss` (carried onto every framework by the
 * two-stage compiler, so the component ships its own `@layer mp.components`
 * CSS). The hashed module class names are assembled with the framework-neutral
 * {@link classNames} helper.
 */
export function BaseApplicationLayout(properties: ApplicationLayoutProperties): MpElement {
  const { statusLevel = 'none', stickyHeader = false } = properties;

  const statusColor = STATUS_BACKGROUND[statusLevel];
  const statusTextColor = statusLevel === 'none' ? undefined : 'var(--mp-color-text-on-primary)';
  const statusRole = resolveStatusRole(statusLevel);

  return (
    <div class={styles['application-layout']}>
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
      <main class={styles['application-layout__content']}>
        <Slot name="content" />
      </main>
      <footer class={styles['application-layout__footer']}>
        <Slot name="footer" />
      </footer>
    </div>
  );
}
