import { classNames, h, type MpElement, useMemo, useState } from '@mission-platform/forge';
import { ForgeIconChevron } from '@mission-platform/icons';

import { ForgeTypography } from '@/components/atoms/forge-typography';

import sizeStyles from '../../../styles/size.module.scss';

import styles from './forge-table.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type TableSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Sort direction. Unsorted is represented by `undefined`. */
export type SortDirection = 'asc' | 'desc';

/** Colour tone of the table — the canonical colour set (`neutral` is the plain treatment). */
export type TableVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

/** A single column definition. */
export interface TableColumn {
  /** The row property this column reads. */
  key: string;
  /** Column header label. */
  label: string;
  /** Optional fixed width. */
  width?: string;
  /** Whether the column can be sorted by clicking its header. */
  sortable?: boolean;
  /** Cell text alignment. Defaults to `'left'`. */
  align?: 'left' | 'center' | 'right';
  /** Optional cell formatter; receives the cell value and its row. */
  render?: (value: unknown, row: Record<string, unknown>) => string;
}

export interface TableProperties {
  /** The column definitions, left-to-right. */
  columns: TableColumn[];
  /** The data rows. */
  rows: Record<string, unknown>[];
  /** Size token controlling the table's scale. Defaults to `'md'`. */
  size?: TableSize;
  /** Optional table caption. */
  caption?: string;
  /** Zebra-stripe the body rows. */
  striped?: boolean;
  /** Border every cell. */
  bordered?: boolean;
  /** Highlight rows on hover. Defaults to `true`. */
  hoverable?: boolean;
  /** Colour tone of the table (tints the head + borders). Defaults to `'neutral'`. */
  variant?: TableVariant;
  /** Show a loading overlay. */
  loading?: boolean;
  /** Message shown when there are no rows. Defaults to `'No data available'`. */
  emptyText?: string;
  /** Fired when the sort changes; receives the column key and the new direction (`undefined` when cleared). */
  onSort?: (key: string, direction: SortDirection | undefined) => void;
}

/**
 * `ForgeTable` — a sortable data table authored once in the neutral JSX dialect
 * and compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * It renders the `columns`/`rows` as a semantic `<table>`, with click-to-sort
 * headers (cycling asc → desc → unsorted) that fire the `onSort` callback, an
 * optional caption, a loading overlay, and an empty state. Cell text is rendered
 * through the composed neutral {@link ForgeTypography}; sort state is held with
 * the neutral {@link useState}/{@link useMemo} hooks. It owns its styling
 * through the co-located CSS Module `forge-table.module.scss`.
 *
 * The original Vue SFC was generic over the row type, composed
 * `ForgeTableHead`/`ForgeTableBody` sub-components, used a `sort` emit, and exposed
 * per-column scoped `cell-<key>` slots. The neutral version uses
 * `Record<string, unknown>` rows, inlines the head/body, uses the `onSort`
 * callback, and drives per-cell rendering through each column's optional
 * `render` formatter (the scoped cell slots are dropped) — consistent with how
 * the other migrated components dropped scoped slots.
 */
export function ForgeTable(properties: Readonly<TableProperties>): MpElement {
  const {
    columns,
    rows,
    caption,
    striped = false,
    bordered = false,
    hoverable = true,
    loading = false,
    emptyText = 'No data available',
    variant = 'neutral',
    size = 'md',
  } = properties;

  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [sortDirection, setSortDirection] = useState<SortDirection | undefined>(undefined);

  const sortedRows = useMemo(() => {
    if (sortKey === undefined || sortDirection === undefined) {
      return rows;
    }
    return rows.toSorted((a, b) => {
      const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDirection]);

  const toggleSort = (column: TableColumn): void => {
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

  const tableClass = classNames(styles['forge-table'], styles[`forge-table--${variant}`], {
    [styles['forge-table--striped']]: striped,
    [styles['forge-table--bordered']]: bordered,
    [styles['forge-table--hoverable']]: hoverable,
  });

  const headCells = columns.map((column) => {
    const isActive = sortKey === column.key;
    const thClass = classNames(
      styles['forge-table__th'],
      { [styles[`forge-table__th--align-${column.align ?? 'left'}`]]: true },
      { [styles['forge-table__th--sortable']]: Boolean(column.sortable) },
    );
    return (
      <th
        className={thClass}
        scope="col"
        style={column.width ? { width: column.width } : undefined}
        aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
        onClick={() => toggleSort(column)}
      >
        <span className={styles['forge-table__th-content']}>
          <ForgeTypography
            as="span"
            color="primary"
            variant="body-sm"
            weight="semibold"
          >
            {column.label}
          </ForgeTypography>
          {column.sortable && isActive ? (
            <span className={styles['forge-table__sort-icon']}>
              <ForgeIconChevron
                direction={sortDirection === 'asc' ? 'up' : 'down'}
                size="2xs"
              />
            </span>
          ) : undefined}
        </span>
      </th>
    );
  });

  const bodyRows =
    sortedRows.length === 0
      ? [
          <tr className={styles['forge-table__row']}>
            <td
              className={styles['forge-table__empty']}
              colSpan={columns.length}
            >
              <ForgeTypography
                as="span"
                color="secondary"
                variant="body-sm"
              >
                {emptyText}
              </ForgeTypography>
            </td>
          </tr>,
        ]
      : sortedRows.map((row) => (
          <tr className={styles['forge-table__row']}>
            {columns.map((column) => {
              const value = row[column.key];
              const text = column.render ? column.render(value, row) : String(value ?? '');
              const tdClass = classNames(styles['forge-table__td'], {
                [styles[`forge-table__td--align-${column.align ?? 'left'}`]]: true,
              });
              return (
                <td className={tdClass}>
                  <ForgeTypography
                    as="span"
                    color="primary"
                    variant="body-sm"
                  >
                    {text}
                  </ForgeTypography>
                </td>
              );
            })}
          </tr>
        ));

  return (
    <div className={[styles['forge-table-wrapper'], sizeStyles[`forge-size--${size}`]]}>
      {loading ? (
        <div
          className={styles['forge-table__loading']}
          aria-busy="true"
          aria-label="Loading table data"
        >
          <span
            className={styles['forge-table__spinner']}
            role="status"
            aria-label="Loading…"
          />
        </div>
      ) : undefined}
      <table className={tableClass}>
        {caption ? (
          <caption className={styles['forge-table__caption']}>
            <ForgeTypography
              as="span"
              color="primary"
              variant="body-md"
              weight="semibold"
            >
              {caption}
            </ForgeTypography>
          </caption>
        ) : undefined}
        <thead className={styles['forge-table__head']}>
          <tr>{headCells}</tr>
        </thead>
        <tbody>{bodyRows}</tbody>
      </table>
    </div>
  );
}
