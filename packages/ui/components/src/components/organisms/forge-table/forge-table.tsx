import {
  classNames,
  useMemo,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import { ForgeIconChevron } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface TableStyleProperties {
  readonly 'data-table-bordered-border'?: string;
  readonly 'data-table-bordered-border-width'?: string;
  readonly 'data-table-caption-padding-block'?: string;
  readonly 'data-table-caption-padding-inline'?: string;
  readonly 'data-table-cell-padding-block'?: string;
  readonly 'data-table-cell-padding-block-wide'?: string;
  readonly 'data-table-cell-padding-inline'?: string;
  readonly 'data-table-cell-padding-inline-wide'?: string;
  readonly 'data-table-empty-padding-block'?: string;
  readonly 'data-table-empty-padding-inline'?: string;
  readonly 'data-table-font-size'?: string;
  readonly 'data-table-head-surface'?: string;
  readonly 'data-table-header-border'?: string;
  readonly 'data-table-header-content-gap'?: string;
  readonly 'data-table-header-padding-block'?: string;
  readonly 'data-table-header-padding-block-wide'?: string;
  readonly 'data-table-header-padding-inline'?: string;
  readonly 'data-table-header-padding-inline-wide'?: string;
  readonly 'data-table-header-sortable-hover-surface'?: string;
  readonly 'data-table-header-sortable-hover-text'?: string;
  readonly 'data-table-loading-radius'?: string;
  readonly 'data-table-loading-surface'?: string;
  readonly 'data-table-row-border'?: string;
  readonly 'data-table-row-hover-surface'?: string;
  readonly 'data-table-row-striped-surface'?: string;
  readonly 'data-table-sort-font-size'?: string;
  readonly 'data-table-sort-opacity'?: string;
  readonly 'data-table-spinner-animation-duration'?: string;
  readonly 'data-table-spinner-animation-easing'?: string;
  readonly 'data-table-spinner-border'?: string;
  readonly 'data-table-spinner-border-width'?: string;
  readonly 'data-table-spinner-radius'?: string;
  readonly 'data-table-spinner-size'?: string;
  readonly 'data-table-tone-align-center-border'?: string;
  readonly 'data-table-tone-align-center-head-surface'?: string;
  readonly 'data-table-tone-align-right-border'?: string;
  readonly 'data-table-tone-align-right-head-surface'?: string;
  readonly 'data-table-tone-bordered-border'?: string;
  readonly 'data-table-tone-bordered-head-surface'?: string;
  readonly 'data-table-tone-hoverable-border'?: string;
  readonly 'data-table-tone-hoverable-head-surface'?: string;
  readonly 'data-table-tone-sortable-border'?: string;
  readonly 'data-table-tone-sortable-head-surface'?: string;
  readonly 'data-table-tone-striped-border'?: string;
  readonly 'data-table-tone-striped-head-surface'?: string;
  readonly 'data-table-wrapper-border'?: string;
  readonly 'data-table-wrapper-border-width'?: string;
  readonly 'data-table-wrapper-radius'?: string;
}

export type TableStyle = CSSStyleProperties & {
  readonly '--forge-table-data-table-bordered-border'?: string | undefined;
  readonly '--forge-table-data-table-bordered-border-width'?: string | undefined;
  readonly '--forge-table-data-table-caption-padding-block'?: string | undefined;
  readonly '--forge-table-data-table-caption-padding-inline'?: string | undefined;
  readonly '--forge-table-data-table-cell-padding-block'?: string | undefined;
  readonly '--forge-table-data-table-cell-padding-block-wide'?: string | undefined;
  readonly '--forge-table-data-table-cell-padding-inline'?: string | undefined;
  readonly '--forge-table-data-table-cell-padding-inline-wide'?: string | undefined;
  readonly '--forge-table-data-table-empty-padding-block'?: string | undefined;
  readonly '--forge-table-data-table-empty-padding-inline'?: string | undefined;
  readonly '--forge-table-data-table-font-size'?: string | undefined;
  readonly '--forge-table-data-table-head-surface'?: string | undefined;
  readonly '--forge-table-data-table-header-border'?: string | undefined;
  readonly '--forge-table-data-table-header-content-gap'?: string | undefined;
  readonly '--forge-table-data-table-header-padding-block'?: string | undefined;
  readonly '--forge-table-data-table-header-padding-block-wide'?: string | undefined;
  readonly '--forge-table-data-table-header-padding-inline'?: string | undefined;
  readonly '--forge-table-data-table-header-padding-inline-wide'?: string | undefined;
  readonly '--forge-table-data-table-header-sortable-hover-surface'?: string | undefined;
  readonly '--forge-table-data-table-header-sortable-hover-text'?: string | undefined;
  readonly '--forge-table-data-table-loading-radius'?: string | undefined;
  readonly '--forge-table-data-table-loading-surface'?: string | undefined;
  readonly '--forge-table-data-table-row-border'?: string | undefined;
  readonly '--forge-table-data-table-row-hover-surface'?: string | undefined;
  readonly '--forge-table-data-table-row-striped-surface'?: string | undefined;
  readonly '--forge-table-data-table-sort-font-size'?: string | undefined;
  readonly '--forge-table-data-table-sort-opacity'?: string | undefined;
  readonly '--forge-table-data-table-spinner-animation-duration'?: string | undefined;
  readonly '--forge-table-data-table-spinner-animation-easing'?: string | undefined;
  readonly '--forge-table-data-table-spinner-border'?: string | undefined;
  readonly '--forge-table-data-table-spinner-border-width'?: string | undefined;
  readonly '--forge-table-data-table-spinner-radius'?: string | undefined;
  readonly '--forge-table-data-table-spinner-size'?: string | undefined;
  readonly '--forge-table-data-table-tone-align-center-border'?: string | undefined;
  readonly '--forge-table-data-table-tone-align-center-head-surface'?: string | undefined;
  readonly '--forge-table-data-table-tone-align-right-border'?: string | undefined;
  readonly '--forge-table-data-table-tone-align-right-head-surface'?: string | undefined;
  readonly '--forge-table-data-table-tone-bordered-border'?: string | undefined;
  readonly '--forge-table-data-table-tone-bordered-head-surface'?: string | undefined;
  readonly '--forge-table-data-table-tone-hoverable-border'?: string | undefined;
  readonly '--forge-table-data-table-tone-hoverable-head-surface'?: string | undefined;
  readonly '--forge-table-data-table-tone-sortable-border'?: string | undefined;
  readonly '--forge-table-data-table-tone-sortable-head-surface'?: string | undefined;
  readonly '--forge-table-data-table-tone-striped-border'?: string | undefined;
  readonly '--forge-table-data-table-tone-striped-head-surface'?: string | undefined;
  readonly '--forge-table-data-table-wrapper-border'?: string | undefined;
  readonly '--forge-table-data-table-wrapper-border-width'?: string | undefined;
  readonly '--forge-table-data-table-wrapper-radius'?: string | undefined;
};

function createTableStyle(properties: Readonly<TableStyleProperties> | undefined): TableStyle | undefined {
  return createForgeStyle({
    '--forge-table-data-table-bordered-border': properties?.['data-table-bordered-border'],
    '--forge-table-data-table-bordered-border-width': properties?.['data-table-bordered-border-width'],
    '--forge-table-data-table-caption-padding-block': properties?.['data-table-caption-padding-block'],
    '--forge-table-data-table-caption-padding-inline': properties?.['data-table-caption-padding-inline'],
    '--forge-table-data-table-cell-padding-block': properties?.['data-table-cell-padding-block'],
    '--forge-table-data-table-cell-padding-block-wide': properties?.['data-table-cell-padding-block-wide'],
    '--forge-table-data-table-cell-padding-inline': properties?.['data-table-cell-padding-inline'],
    '--forge-table-data-table-cell-padding-inline-wide': properties?.['data-table-cell-padding-inline-wide'],
    '--forge-table-data-table-empty-padding-block': properties?.['data-table-empty-padding-block'],
    '--forge-table-data-table-empty-padding-inline': properties?.['data-table-empty-padding-inline'],
    '--forge-table-data-table-font-size': properties?.['data-table-font-size'],
    '--forge-table-data-table-head-surface': properties?.['data-table-head-surface'],
    '--forge-table-data-table-header-border': properties?.['data-table-header-border'],
    '--forge-table-data-table-header-content-gap': properties?.['data-table-header-content-gap'],
    '--forge-table-data-table-header-padding-block': properties?.['data-table-header-padding-block'],
    '--forge-table-data-table-header-padding-block-wide': properties?.['data-table-header-padding-block-wide'],
    '--forge-table-data-table-header-padding-inline': properties?.['data-table-header-padding-inline'],
    '--forge-table-data-table-header-padding-inline-wide': properties?.['data-table-header-padding-inline-wide'],
    '--forge-table-data-table-header-sortable-hover-surface': properties?.['data-table-header-sortable-hover-surface'],
    '--forge-table-data-table-header-sortable-hover-text': properties?.['data-table-header-sortable-hover-text'],
    '--forge-table-data-table-loading-radius': properties?.['data-table-loading-radius'],
    '--forge-table-data-table-loading-surface': properties?.['data-table-loading-surface'],
    '--forge-table-data-table-row-border': properties?.['data-table-row-border'],
    '--forge-table-data-table-row-hover-surface': properties?.['data-table-row-hover-surface'],
    '--forge-table-data-table-row-striped-surface': properties?.['data-table-row-striped-surface'],
    '--forge-table-data-table-sort-font-size': properties?.['data-table-sort-font-size'],
    '--forge-table-data-table-sort-opacity': properties?.['data-table-sort-opacity'],
    '--forge-table-data-table-spinner-animation-duration': properties?.['data-table-spinner-animation-duration'],
    '--forge-table-data-table-spinner-animation-easing': properties?.['data-table-spinner-animation-easing'],
    '--forge-table-data-table-spinner-border': properties?.['data-table-spinner-border'],
    '--forge-table-data-table-spinner-border-width': properties?.['data-table-spinner-border-width'],
    '--forge-table-data-table-spinner-radius': properties?.['data-table-spinner-radius'],
    '--forge-table-data-table-spinner-size': properties?.['data-table-spinner-size'],
    '--forge-table-data-table-tone-align-center-border': properties?.['data-table-tone-align-center-border'],
    '--forge-table-data-table-tone-align-center-head-surface':
      properties?.['data-table-tone-align-center-head-surface'],
    '--forge-table-data-table-tone-align-right-border': properties?.['data-table-tone-align-right-border'],
    '--forge-table-data-table-tone-align-right-head-surface': properties?.['data-table-tone-align-right-head-surface'],
    '--forge-table-data-table-tone-bordered-border': properties?.['data-table-tone-bordered-border'],
    '--forge-table-data-table-tone-bordered-head-surface': properties?.['data-table-tone-bordered-head-surface'],
    '--forge-table-data-table-tone-hoverable-border': properties?.['data-table-tone-hoverable-border'],
    '--forge-table-data-table-tone-hoverable-head-surface': properties?.['data-table-tone-hoverable-head-surface'],
    '--forge-table-data-table-tone-sortable-border': properties?.['data-table-tone-sortable-border'],
    '--forge-table-data-table-tone-sortable-head-surface': properties?.['data-table-tone-sortable-head-surface'],
    '--forge-table-data-table-tone-striped-border': properties?.['data-table-tone-striped-border'],
    '--forge-table-data-table-tone-striped-head-surface': properties?.['data-table-tone-striped-head-surface'],
    '--forge-table-data-table-wrapper-border': properties?.['data-table-wrapper-border'],
    '--forge-table-data-table-wrapper-border-width': properties?.['data-table-wrapper-border-width'],
    '--forge-table-data-table-wrapper-radius': properties?.['data-table-wrapper-radius'],
  }) as TableStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<TableStyleProperties>;
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
  const style = createTableStyle(properties.properties);

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
                <td
                  className={tdClass}
                  style={style}
                >
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
    <div
      className={[styles['forge-table-wrapper'], size ? `forge-size--${size}` : undefined]}
      style={style}
    >
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
      <table
        className={tableClass}
        style={style}
      >
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
