import { IconSort } from '@mission-platform/icons';
import {
  classNames,
  h,
  Slot,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MpChild,
  type MpElement,
  type MpProperties,
  type MpRenderProperty,
} from '@mission-platform/jsx';

import sizeStyles from '../size.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type VirtualTableSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Sort direction. Unsorted is represented by `undefined`. */
export type SortDirection = 'asc' | 'desc';

/** A single column definition for {@link BaseVirtualTable}. */
export interface VirtualTableColumn {
  /** The row property this column reads. */
  key: string;
  /** Column header label. */
  label: string;
  /** Optional fixed CSS width (e.g. `'120px'`). */
  width?: string;
  /** Whether the column can be sorted by clicking its header. */
  sortable?: boolean;
  /** Cell text alignment. Defaults to `'left'`. */
  align?: 'left' | 'center' | 'right';
  /** Optional cell formatter; receives the cell value and its row. */
  render?: (value: unknown, row: Record<string, unknown>) => string;
}

/** The scope passed to the scoped `cell` slot. */
export interface VirtualTableCellScope {
  /** The column the cell belongs to. */
  column: VirtualTableColumn;
  /** The full row record the cell is rendered from. */
  row: Record<string, unknown>;
  /** The cell's raw value (`row[column.key]`). */
  value: unknown;
}

export interface VirtualTableProperties extends MpProperties {
  /** The column definitions, left-to-right. */
  columns: VirtualTableColumn[];
  /** The full data array. Only the rows in (or near) the viewport are rendered. */
  rows: Record<string, unknown>[];
  /** Size token controlling the table's font scale. Defaults to `'md'`. */
  size?: VirtualTableSize;
  /** Fixed pixel height of every body row. Defaults to `48`. */
  rowHeight?: number;
  /** Total component height (px), including the sticky header. Defaults to `480`. */
  height?: number;
  /** Extra rows rendered above/below the viewport. Defaults to `3`. */
  overscan?: number;
  /** Zebra-stripe the body rows. */
  striped?: boolean;
  /** Border every column. */
  bordered?: boolean;
  /** Accessible label for the table. */
  caption?: string;
  /** Message shown when there are no rows. Defaults to `'No data available'`. */
  emptyText?: string;
  /** Footer content (the `footer` named slot); falls back to a row-count summary. */
  footer?: MpChild;
  /**
   * Renders every body cell; receives `{ column, row, value }` (a scoped slot /
   * render-prop). Falls back to the column's `render` formatter (or the stringified
   * value), so consumers opt in only for the columns that need custom content.
   */
  cell?: MpRenderProperty<VirtualTableCellScope>;
  /** Fired when the sort changes; receives the column key and the new direction (`undefined` when cleared). */
  onSort?: (key: string, direction: SortDirection | undefined) => void;
  /** Fired when a body row is clicked; receives the row and its absolute index. */
  onRowClick?: (row: Record<string, unknown>, index: number) => void;
}

/** Fixed sticky-header height (px) — matches the original Vue SFC. */
const HEADER_HEIGHT = 44;

/**
 * `BaseVirtualTable` — a virtual-scrolling, sortable data table that renders
 * only the rows within the viewport, so an arbitrarily long `rows` array stays
 * cheap to render. Authored once in the neutral JSX dialect and compiled
 * straight to React or Vue by `@mission-platform/vite-plugin-jsx`; the sort and
 * scroll state use the neutral {@link useState}/{@link useMemo}/{@link useRef}/
 * {@link useEffect} hooks.
 *
 * The sticky header offers click-to-sort columns (cycling asc → desc →
 * unsorted) that fire the `onSort` callback; body rows fire `onRowClick`, and a
 * `footer` named slot falls back to a row-count + sort summary. Like the
 * original it uses `div` + ARIA `role="table|rowgroup|row|columnheader|gridcell"`
 * (instead of native `<table>` elements) to work around Mobile Safari's table
 * layout bug while staying screen-reader accessible.
 *
 * The original Vue SFC was generic over the row type, composed
 * `BaseVirtualTableHead`/`Row`/`Footer` sub-components, used the icons package
 * for the sort glyph, exposed per-column scoped `cell-<key>` slots, and emitted
 * `sort`/`rowClick`. The neutral version uses `Record<string, unknown>` rows,
 * inlines the head/row/footer, renders the write-once `@mission-platform/icons`
 * `IconSort` (which fills the active-direction chevron), and
 * uses the `onSort`/`onRowClick` callback props. Per-cell content is driven by
 * each column's optional `render` formatter, with a single scoped `cell` slot
 * (`{ column, row, value }`) replacing the original's per-column `cell-<key>`
 * slots for fully custom (interactive) cell content.
 */
export function BaseVirtualTable(properties: Readonly<VirtualTableProperties>): MpElement {
  const {
    columns,
    rows,
    rowHeight = 48,
    height = 480,
    overscan = 3,
    striped = false,
    bordered = false,
    caption,
    emptyText = 'No data available',
    size = 'md',
  } = properties;

  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [sortDirection, setSortDirection] = useState<SortDirection | undefined>(undefined);
  const [scrollTop, setScrollTop] = useState(0);
  const bodyReference = useRef<HTMLElement | null>(null);

  const sortedRows = useMemo(() => {
    if (sortKey === undefined || sortDirection === undefined) {
      return rows;
    }
    return rows.toSorted((a, b) => {
      const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDirection]);

  const bodyHeight = useMemo(() => height - HEADER_HEIGHT, [height]);
  const totalScrollHeight = useMemo(() => sortedRows.length * rowHeight, [sortedRows, rowHeight]);

  const startIndex = useMemo(
    () => Math.max(0, Math.floor(scrollTop / rowHeight) - overscan),
    [scrollTop, rowHeight, overscan],
  );

  const endIndex = useMemo(() => {
    const visibleCount = Math.ceil(bodyHeight / rowHeight);
    return Math.min(sortedRows.length - 1, Math.floor(scrollTop / rowHeight) + visibleCount + overscan);
  }, [scrollTop, rowHeight, bodyHeight, overscan, sortedRows]);

  const offsetY = useMemo(() => startIndex * rowHeight, [startIndex, rowHeight]);

  const visibleRows = useMemo(
    () => sortedRows.slice(startIndex, endIndex + 1).map((row, offset) => ({ row, index: startIndex + offset })),
    [sortedRows, startIndex, endIndex],
  );

  useEffect(() => {
    const element = bodyReference.current;
    if (element === null) {
      return;
    }
    const handleScroll = (event: Event): void => {
      setScrollTop((event.target as HTMLElement).scrollTop);
    };
    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSort = (column: VirtualTableColumn): void => {
    if (!column.sortable) {
      return;
    }
    let nextKey: string | undefined = column.key;
    let nextDirection: SortDirection | undefined = 'asc';
    if (sortKey === column.key) {
      if (sortDirection === 'asc') {
        nextDirection = 'desc';
      } else {
        nextKey = undefined;
        nextDirection = undefined;
      }
    }
    setSortKey(nextKey);
    setSortDirection(nextDirection);
    properties.onSort?.(column.key, nextDirection);
  };

  return (
    <div
      class={classNames('virtual-table', sizeStyles[`base-size--${size}`])}
      role="table"
      aria-label={caption ?? undefined}
      aria-rowcount={sortedRows.length}
      style={{
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--mp-color-border-default)',
        borderRadius: 'var(--mp-radius-md)',
        overflow: 'hidden',
        background: 'var(--mp-color-bg-surface)',
      }}
    >
      <div
        class="virtual-table__head"
        role="rowgroup"
        style={{
          height: `${HEADER_HEIGHT}px`,
          flexShrink: '0',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '2px solid var(--mp-color-border-strong)',
          background: 'var(--mp-color-bg-sunken)',
          overflow: 'hidden',
        }}
      >
        <div
          role="row"
          style={{ display: 'flex', width: '100%' }}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              role="columnheader"
              tabindex={0}
              aria-sort={
                column.sortable && sortKey === column.key
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : undefined
              }
              style={{
                flex: column.width ? `0 0 ${column.width}` : '1',
                minWidth: column.width ?? '80px',
                padding: '0 var(--mp-spacing-3)',
                fontSize: 'var(--mp-font-size-xs)',
                fontWeight: 'var(--mp-font-weight-semibold)',
                color: 'var(--mp-color-text-secondary)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                textAlign: column.align ?? 'left',
                cursor: column.sortable ? 'pointer' : 'default',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--mp-spacing-1)',
                borderRight: bordered ? '1px solid var(--mp-color-border-default)' : undefined,
              }}
              onClick={() => toggleSort(column)}
            >
              <span>{column.label}</span>
              {column.sortable ? (
                <IconSort
                  active={sortKey === column.key}
                  direction={sortKey === column.key ? sortDirection : undefined}
                  size="2xs"
                />
              ) : undefined}
            </div>
          ))}
        </div>
      </div>

      <div
        ref={bodyReference}
        class="virtual-table__body"
        role="rowgroup"
        tabindex={0}
        style={{ flex: '1', overflowY: 'auto', position: 'relative' }}
      >
        {sortedRows.length === 0 ? (
          <div
            role="row"
            aria-rowindex={1}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: `${bodyHeight}px`,
              color: 'var(--mp-color-text-tertiary)',
              fontSize: 'var(--mp-font-size-sm)',
            }}
          >
            <span
              role="gridcell"
              aria-colspan={columns.length}
            >
              {emptyText}
            </span>
          </div>
        ) : (
          <div
            aria-hidden="true"
            style={{ height: `${totalScrollHeight}px`, position: 'relative', pointerEvents: 'none' }}
          />
        )}

        {sortedRows.length > 0 ? (
          <div style={{ position: 'absolute', top: `${offsetY}px`, left: '0', right: '0' }}>
            {visibleRows.map(({ row, index }) => (
              <div
                key={index}
                class="virtual-table__row"
                role="row"
                tabindex={0}
                aria-rowindex={index + 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: `${rowHeight}px`,
                  borderBottom: '1px solid var(--mp-color-border-default)',
                  backgroundColor:
                    striped && index % 2 !== 0 ? 'var(--mp-color-bg-sunken)' : 'var(--mp-color-bg-surface)',
                  cursor: 'default',
                }}
                onClick={() => properties.onRowClick?.(row, index)}
              >
                {columns.map((column) => {
                  const value = row[column.key];
                  const text = column.render ? column.render(value, row) : String(value ?? '');
                  return (
                    <div
                      key={column.key}
                      role="gridcell"
                      style={{
                        flex: column.width ? `0 0 ${column.width}` : '1',
                        minWidth: column.width ?? '80px',
                        padding: '0 var(--mp-spacing-3)',
                        fontSize: 'var(--mp-font-size-sm)',
                        color: 'var(--mp-color-text-primary)',
                        textAlign: column.align ?? 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        borderRight: bordered ? '1px solid var(--mp-color-border-default)' : undefined,
                      }}
                    >
                      <Slot
                        name="cell"
                        column={column}
                        row={row}
                        value={value}
                      >
                        {text}
                      </Slot>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : undefined}
      </div>

      <div
        class="virtual-table__footer"
        style={{
          flexShrink: '0',
          padding: 'var(--mp-spacing-2) var(--mp-spacing-4)',
          borderTop: '1px solid var(--mp-color-border-default)',
          background: 'var(--mp-color-bg-sunken)',
          fontSize: 'var(--mp-font-size-xs)',
          color: 'var(--mp-color-text-tertiary)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Slot name="footer">
          <span>{sortedRows.length.toLocaleString()} rows</span>
          {sortKey ? (
            <span>
              Sorted by <strong style={{ color: 'var(--mp-color-text-primary)' }}>{sortKey}</strong> ({sortDirection})
            </span>
          ) : undefined}
        </Slot>
      </div>
    </div>
  );
}
