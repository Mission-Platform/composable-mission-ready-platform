import {
  classNames,
  h,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MpElement,
  type MpProperties,
} from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-virtual-log-viewer.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type VirtualLogViewerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Severity of a {@link LogEntry}. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** A single log line rendered by {@link BaseVirtualLogViewer}. */
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

export interface VirtualLogViewerProperties extends MpProperties {
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
}

/** Level → text colour token. */
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'var(--mp-color-text-secondary)',
  info: 'var(--mp-color-info-default)',
  warn: 'var(--mp-color-warning-default)',
  error: 'var(--mp-color-danger-default)',
  fatal: 'var(--mp-color-danger-emphasis)',
};

/**
 * `BaseVirtualLogViewer` — a high-performance virtual-scrolling log viewer.
 * Authored once in the neutral JSX dialect and compiled straight to React or
 * Vue by `@mission-platform/vite-plugin-jsx`; it renders only the rows within
 * the viewport while a full-height spacer represents the entire (optionally
 * filtered) log. Scroll position uses the neutral hooks, follow-tail is driven
 * by a {@link useEffect} keyed on the entry count, and each row's click fires
 * the `onSelect` callback. Owns its styling through `base-virtual-log-viewer.module.scss`.
 *
 * The original Vue SFC composed `BaseLogViewerRow`/`BaseLogViewerToolbar`
 * sub-components, used the icons package for the per-level glyph, and a `select`
 * emit. The neutral version inlines the row + toolbar, substitutes a colour-coded
 * `●` glyph for the icons (consistent with the other migrated components), and
 * uses the `onSelect` callback prop; the original's manual-scroll follow-tail
 * suppression is dropped.
 */
export function BaseVirtualLogViewer(properties: Readonly<VirtualLogViewerProperties>): MpElement {
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
      className={[styles['log-viewer'], sizeStyles[`base-size--${size}`]]}
      style={{ height: `${height}px` }}
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
              <BaseTypography
                as="span"
                variant="code"
                color="tertiary"
                className={[styles['log-viewer__line-no']]}
              >
                {index + 1}
              </BaseTypography>
              {showTimestamp && entry.timestamp ? (
                <BaseTypography
                  as="span"
                  variant="code"
                  color="tertiary"
                  className={[styles['log-viewer__timestamp']]}
                >
                  {entry.timestamp}
                </BaseTypography>
              ) : undefined}
              {showLevel ? (
                <span
                  className={[styles['log-viewer__level']]}
                  style={{ color: LEVEL_COLORS[entry.level] }}
                >
                  <span aria-hidden="true">●</span>
                  <BaseTypography
                    as="span"
                    variant="code"
                    color="inherit"
                    className={[styles['log-viewer__level-label']]}
                  >
                    {entry.level.toUpperCase()}
                  </BaseTypography>
                </span>
              ) : undefined}
              <BaseTypography
                as="span"
                variant="code"
                color="inherit"
                className={[styles['log-viewer__message']]}
              >
                {entry.message}
              </BaseTypography>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
