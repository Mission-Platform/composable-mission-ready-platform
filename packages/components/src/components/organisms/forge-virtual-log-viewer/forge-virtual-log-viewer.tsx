import {
  classNames,
  useEffect,
  useMemo,
  useRef,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-virtual-log-viewer.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type VirtualLogViewerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Severity of a {@link LogEntry}. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** A single log line rendered by {@link ForgeVirtualLogViewer}. */
export interface LogEntry {
  /** Stable identity for the row. */
  id: string | number;
  /** Severity level. */
  level: LogLevel;
  /** The log message. */
  message: string;
  /** Optional ISO/clock timestamp. */
  timestamp?: string;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface VirtualLogViewerStyleProperties {
  readonly 'code-virtual-log-viewer-border'?: string;
  readonly 'code-virtual-log-viewer-border-width'?: string;
  readonly 'code-virtual-log-viewer-filter-font-family'?: string;
  readonly 'code-virtual-log-viewer-filter-font-size'?: string;
  readonly 'code-virtual-log-viewer-filter-font-weight'?: string;
  readonly 'code-virtual-log-viewer-filter-letter-spacing'?: string;
  readonly 'code-virtual-log-viewer-filter-text'?: string;
  readonly 'code-virtual-log-viewer-level-font-weight'?: string;
  readonly 'code-virtual-log-viewer-level-gap'?: string;
  readonly 'code-virtual-log-viewer-level-letter-spacing'?: string;
  readonly 'code-virtual-log-viewer-level-min-width'?: string;
  readonly 'code-virtual-log-viewer-line-number-border'?: string;
  readonly 'code-virtual-log-viewer-line-number-min-width'?: string;
  readonly 'code-virtual-log-viewer-line-number-padding-inline-end'?: string;
  readonly 'code-virtual-log-viewer-radius'?: string;
  readonly 'code-virtual-log-viewer-row-border'?: string;
  readonly 'code-virtual-log-viewer-row-border-width'?: string;
  readonly 'code-virtual-log-viewer-row-focus-ring'?: string;
  readonly 'code-virtual-log-viewer-row-gap'?: string;
  readonly 'code-virtual-log-viewer-row-hover-surface'?: string;
  readonly 'code-virtual-log-viewer-row-padding-inline'?: string;
  readonly 'code-virtual-log-viewer-row-transition-duration'?: string;
  readonly 'code-virtual-log-viewer-row-transition-easing'?: string;
  readonly 'code-virtual-log-viewer-severity-error'?: string;
  readonly 'code-virtual-log-viewer-severity-error-opacity'?: string;
  readonly 'code-virtual-log-viewer-severity-warn'?: string;
  readonly 'code-virtual-log-viewer-severity-warn-opacity'?: string;
  readonly 'code-virtual-log-viewer-surface'?: string;
  readonly 'code-virtual-log-viewer-timestamp-min-width'?: string;
  readonly 'code-virtual-log-viewer-toolbar-border'?: string;
  readonly 'code-virtual-log-viewer-toolbar-height'?: string;
  readonly 'code-virtual-log-viewer-toolbar-padding-inline'?: string;
  readonly 'code-virtual-log-viewer-toolbar-surface'?: string;
}

export type VirtualLogViewerStyle = CSSStyleProperties & {
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-border'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-border-width'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-filter-font-family'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-filter-font-size'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-filter-font-weight'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-filter-letter-spacing'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-filter-text'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-level-font-weight'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-level-gap'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-level-letter-spacing'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-level-min-width'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-line-number-border'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-line-number-min-width'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-line-number-padding-inline-end'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-radius'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-row-border'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-row-border-width'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-row-focus-ring'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-row-gap'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-row-hover-surface'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-row-padding-inline'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-row-transition-duration'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-row-transition-easing'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-severity-error'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-severity-error-opacity'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-severity-warn'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-severity-warn-opacity'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-surface'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-timestamp-min-width'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-toolbar-border'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-toolbar-height'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-toolbar-padding-inline'?: string | undefined;
  readonly '--forge-virtual-log-viewer-code-virtual-log-viewer-toolbar-surface'?: string | undefined;
};

function createVirtualLogViewerStyle(
  properties: Readonly<VirtualLogViewerStyleProperties> | undefined,
): VirtualLogViewerStyle | undefined {
  return createForgeStyle({
    '--forge-virtual-log-viewer-code-virtual-log-viewer-border': properties?.['code-virtual-log-viewer-border'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-border-width':
      properties?.['code-virtual-log-viewer-border-width'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-filter-font-family':
      properties?.['code-virtual-log-viewer-filter-font-family'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-filter-font-size':
      properties?.['code-virtual-log-viewer-filter-font-size'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-filter-font-weight':
      properties?.['code-virtual-log-viewer-filter-font-weight'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-filter-letter-spacing':
      properties?.['code-virtual-log-viewer-filter-letter-spacing'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-filter-text':
      properties?.['code-virtual-log-viewer-filter-text'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-level-font-weight':
      properties?.['code-virtual-log-viewer-level-font-weight'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-level-gap': properties?.['code-virtual-log-viewer-level-gap'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-level-letter-spacing':
      properties?.['code-virtual-log-viewer-level-letter-spacing'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-level-min-width':
      properties?.['code-virtual-log-viewer-level-min-width'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-line-number-border':
      properties?.['code-virtual-log-viewer-line-number-border'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-line-number-min-width':
      properties?.['code-virtual-log-viewer-line-number-min-width'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-line-number-padding-inline-end':
      properties?.['code-virtual-log-viewer-line-number-padding-inline-end'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-radius': properties?.['code-virtual-log-viewer-radius'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-row-border': properties?.['code-virtual-log-viewer-row-border'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-row-border-width':
      properties?.['code-virtual-log-viewer-row-border-width'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-row-focus-ring':
      properties?.['code-virtual-log-viewer-row-focus-ring'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-row-gap': properties?.['code-virtual-log-viewer-row-gap'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-row-hover-surface':
      properties?.['code-virtual-log-viewer-row-hover-surface'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-row-padding-inline':
      properties?.['code-virtual-log-viewer-row-padding-inline'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-row-transition-duration':
      properties?.['code-virtual-log-viewer-row-transition-duration'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-row-transition-easing':
      properties?.['code-virtual-log-viewer-row-transition-easing'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-severity-error':
      properties?.['code-virtual-log-viewer-severity-error'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-severity-error-opacity':
      properties?.['code-virtual-log-viewer-severity-error-opacity'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-severity-warn':
      properties?.['code-virtual-log-viewer-severity-warn'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-severity-warn-opacity':
      properties?.['code-virtual-log-viewer-severity-warn-opacity'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-surface': properties?.['code-virtual-log-viewer-surface'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-timestamp-min-width':
      properties?.['code-virtual-log-viewer-timestamp-min-width'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-toolbar-border':
      properties?.['code-virtual-log-viewer-toolbar-border'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-toolbar-height':
      properties?.['code-virtual-log-viewer-toolbar-height'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-toolbar-padding-inline':
      properties?.['code-virtual-log-viewer-toolbar-padding-inline'],
    '--forge-virtual-log-viewer-code-virtual-log-viewer-toolbar-surface':
      properties?.['code-virtual-log-viewer-toolbar-surface'],
  }) as VirtualLogViewerStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface VirtualLogViewerProperties {
  /** The full list of log entries. Only the visible window is rendered. */
  entries: LogEntry[];
  /** Size token controlling the viewer's font scale. Defaults to `'md'`. */
  size?: VirtualLogViewerSize;
  /** Fixed row height (px). Defaults to `24`. */
  itemHeight?: number;
  /** Extra rows rendered above/below the viewport. Defaults to `5`. */
  overscan?: number;
  /** Viewport height (px). Defaults to `400`. */
  height?: number;
  /** Show the level column. Defaults to `true`. */
  showLevel?: boolean;
  /** Show the timestamp column. Defaults to `true`. */
  showTimestamp?: boolean;
  /** Auto-scroll to the bottom when new entries arrive. Defaults to `true`. */
  followTail?: boolean;
  /** Case-insensitive substring filter applied to each message. */
  filter?: string;
  /** Fired when a log row is clicked; receives the entry. */
  onSelect?: (entry: LogEntry) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<VirtualLogViewerStyleProperties>;
}

/** Level → text colour token. */
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'var(--mp-component-code-virtual-log-viewer-severity-debug)',
  info: 'var(--mp-component-code-virtual-log-viewer-severity-info)',
  warn: 'var(--mp-component-code-virtual-log-viewer-severity-warn)',
  error: 'var(--mp-component-code-virtual-log-viewer-severity-error)',
  fatal: 'var(--mp-component-code-virtual-log-viewer-severity-fatal)',
};

/**
 * `ForgeVirtualLogViewer` — a high-performance virtual-scrolling log viewer.
 * Authored once in the neutral JSX dialect and compiled straight to React or
 * Vue by `@mission-platform/vite-plugin-forge`; it renders only the rows within
 * the viewport while a full-height spacer represents the entire (optionally
 * filtered) log. Scroll position uses the neutral hooks, follow-tail is driven
 * by a {@link useEffect} keyed on the entry count, and each row's click fires
 * the `onSelect` callback. Owns its styling through `forge-virtual-log-viewer.module.scss`.
 *
 * The original Vue SFC composed `ForgeLogViewerRow`/`ForgeLogViewerToolbar`
 * sub-components, used the icons package for the per-level glyph, and a `select`
 * emit. The neutral version inlines the row + toolbar, substitutes a colour-coded
 * `●` glyph for the icons (consistent with the other migrated components), and
 * uses the `onSelect` callback prop; the original's manual-scroll follow-tail
 * suppression is dropped.
 */
export function ForgeVirtualLogViewer(properties: Readonly<VirtualLogViewerProperties>): MpElement {
  const propertyStyle = createVirtualLogViewerStyle(properties.properties);

  const {
    entries,
    itemHeight = 24,
    overscan = 5,
    height = 400,
    showLevel = true,
    showTimestamp = true,
    followTail = true,
    filter = '',
    size = 'md',
  } = properties;

  const [scrollTop, setScrollTop] = useState(0);
  const containerReference = useRef<HTMLElement | null>(null);

  const filteredEntries = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (query === '') {
      return entries;
    }
    return entries.filter((entry) => entry.message.toLowerCase().includes(query));
  }, [entries, filter]);

  const totalHeight = useMemo(() => filteredEntries.length * itemHeight, [filteredEntries, itemHeight]);

  const startIndex = useMemo(
    () => Math.max(0, Math.floor(scrollTop / itemHeight) - overscan),
    [scrollTop, itemHeight, overscan],
  );

  const endIndex = useMemo(() => {
    const visibleCount = Math.ceil(height / itemHeight);
    return Math.min(filteredEntries.length - 1, Math.floor(scrollTop / itemHeight) + visibleCount + overscan);
  }, [scrollTop, itemHeight, height, overscan, filteredEntries]);

  const offsetY = useMemo(() => startIndex * itemHeight, [startIndex, itemHeight]);

  const visibleRows = useMemo(
    () =>
      filteredEntries.slice(startIndex, endIndex + 1).map((entry, offset) => ({ entry, index: startIndex + offset })),
    [filteredEntries, startIndex, endIndex],
  );

  useEffect(() => {
    const element = containerReference.current;
    if (element === null) {
      return;
    }
    const handleScroll = (event: Event): void => {
      setScrollTop((event.target as HTMLElement).scrollTop);
    };
    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, []);

  // Follow-tail: scroll to the bottom when the entry count changes.
  useEffect(() => {
    if (!followTail) {
      return;
    }
    const element = containerReference.current;
    if (element === null || typeof requestAnimationFrame === 'undefined') {
      return;
    }
    const frame = requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [entries.length, followTail]);

  const toolbar = filter ? (
    <div className={classNames(styles['log-viewer__toolbar'])}>
      <span className={classNames(styles['log-viewer__filter-badge'])}>
        {`${filteredEntries.length} / ${entries.length} matching "${filter}"`}
      </span>
    </div>
  ) : undefined;

  return (
    <div
      className={[styles['log-viewer'], size ? `forge-size--${size}` : undefined]}
      style={{ ...propertyStyle, height: `${height}px` }}
    >
      {toolbar}
      <div
        ref={containerReference}
        className={[styles['log-viewer__scroll']]}
        style={{ height: filter ? `calc(${height}px - 32px)` : `${height}px`, overflowY: 'auto', position: 'relative' }}
      >
        <div
          aria-hidden="true"
          style={{ height: `${totalHeight}px`, position: 'relative', pointerEvents: 'none' }}
        />
        <div
          role="log"
          aria-live="polite"
          aria-atomic="false"
          style={{ position: 'absolute', top: `${offsetY}px`, left: '0', right: '0' }}
        >
          {visibleRows.map(({ entry, index }) => (
            <button
              key={entry.id}
              type="button"
              className={[styles['log-viewer__row'], styles[`log-viewer__row--${entry.level}`]]}
              style={{ height: `${itemHeight}px`, boxSizing: 'border-box' }}
              aria-label={`Log entry ${index + 1}: ${entry.level} — ${entry.message}`}
              onClick={() => properties.onSelect?.(entry)}
            >
              <ForgeTypography
                as="span"
                variant="code"
                color="tertiary"
                className={[styles['log-viewer__line-no']]}
              >
                {index + 1}
              </ForgeTypography>
              {showTimestamp && entry.timestamp ? (
                <ForgeTypography
                  as="span"
                  variant="code"
                  color="tertiary"
                  className={[styles['log-viewer__timestamp']]}
                >
                  {entry.timestamp}
                </ForgeTypography>
              ) : undefined}
              {showLevel ? (
                <span
                  className={[styles['log-viewer__level']]}
                  style={{ color: LEVEL_COLORS[entry.level] }}
                >
                  <span aria-hidden="true">●</span>
                  <ForgeTypography
                    as="span"
                    variant="code"
                    color="inherit"
                    className={[styles['log-viewer__level-label']]}
                  >
                    {entry.level.toUpperCase()}
                  </ForgeTypography>
                </span>
              ) : undefined}
              <ForgeTypography
                as="span"
                variant="code"
                color="inherit"
                className={[styles['log-viewer__message']]}
              >
                {entry.message}
              </ForgeTypography>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
