import {
  Slot,
  classNames,
  useMemo,
  useState,
  createForgeStyle,
  type MpElement,
  type MpChild,
  type MpRenderProperty,
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
  /** Optional sticky column pinning. */
  fixed?: 'left' | 'right';
  /** Optional cell formatter; receives the cell value and its row. */
  render?: (value: unknown, row: Record<string, unknown>) => string;
}

/** The scope passed to the scoped `cell` slot. */
export interface TableCellScope {
  /** The column the cell belongs to. */
  column: TableColumn;
  /** The full row record the cell is rendered from. */
  row: Record<string, unknown>;
  /** The cell's raw value (`row[column.key]`). */
  value: unknown;
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
  /**
   * Renders every body cell; receives `{ column, row, value }` (a scoped slot /
   * render-prop). Falls back to the column's `render` formatter (or the stringified
   * value), so consumers opt in only for the columns that need custom content.
   */
  cell?: MpRenderProperty<TableCellScope>;
  /** Fired when the sort changes; receives the column key and the new direction (`undefined` when cleared). */
  onSort?: (key: string, direction: SortDirection | undefined) => void;

  /** Whether rows can be selected with checkboxes. */
  selectable?: boolean;
  /** Keys of the currently selected rows. */
  selectedRowKeys?: string[];
  /** Default selected row keys when uncontrolled. */
  defaultSelectedRowKeys?: string[];
  /** Callback fired when row selection changes. */
  onSelectionChange?: (selectedRowKeys: string[]) => void;
  /** Callback fired when an individual row is selected/deselected. */
  onSelectRow?: (row: Record<string, unknown>, selected: boolean) => void;
  /** Custom row key getter. Defaults to reading `row.id` or `row.key` or fallback to row index. */
  rowKey?: string | ((row: Record<string, unknown>) => string);

  /** Whether rows can be expanded with an accordion toggle. */
  expandable?: boolean;
  /** Keys of the currently expanded rows. */
  expandedRowKeys?: string[];
  /** Default expanded row keys when uncontrolled. */
  defaultExpandedRowKeys?: string[];
  /** Callback fired when row expansion changes. */
  onExpansionChange?: (expandedRowKeys: string[]) => void;
  /** Render function for the expanded row content. */
  expandedRowRender?: (row: Record<string, unknown>) => MpChild;

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
    selectable = false,
    selectedRowKeys: controlledSelectedRowKeys,
    defaultSelectedRowKeys = [],
    onSelectionChange,
    onSelectRow,
    rowKey,
    expandable = false,
    expandedRowKeys: controlledExpandedRowKeys,
    defaultExpandedRowKeys = [],
    onExpansionChange,
    expandedRowRender,
  } = properties;

  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [sortDirection, setSortDirection] = useState<SortDirection | undefined>(undefined);
  const [internalSelectedRowKeys, setInternalSelectedRowKeys] = useState<string[]>(defaultSelectedRowKeys);
  const [internalExpandedRowKeys, setInternalExpandedRowKeys] = useState<string[]>(defaultExpandedRowKeys);

  const selectedRowKeys = controlledSelectedRowKeys ?? internalSelectedRowKeys;
  const expandedRowKeys = controlledExpandedRowKeys ?? internalExpandedRowKeys;

  const selectedKeysSet = useMemo(() => new Set(selectedRowKeys), [selectedRowKeys]);
  const expandedKeysSet = useMemo(() => new Set(expandedRowKeys), [expandedRowKeys]);

  const getRowKey = (row: Record<string, unknown>, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    if (typeof rowKey === 'string' && row[rowKey] !== undefined) {
      return String(row[rowKey]);
    }
    if (row.id !== undefined) {
      return String(row.id);
    }
    if (row.key !== undefined) {
      return String(row.key);
    }
    return String(index);
  };

  const sortedRows = useMemo(() => {
    if (sortKey === undefined || sortDirection === undefined) {
      return rows;
    }
    return rows.toSorted((a, b) => {
      const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDirection]);

  const allRowKeys = useMemo(() => sortedRows.map((r, i) => getRowKey(r, i)), [sortedRows, rowKey]);

  const isAllSelected = sortedRows.length > 0 && allRowKeys.every((k) => selectedKeysSet.has(k));

  const toggleSelectAll = (): void => {
    const nextKeys = isAllSelected ? [] : [...allRowKeys];
    if (controlledSelectedRowKeys === undefined) {
      setInternalSelectedRowKeys(nextKeys);
    }
    onSelectionChange?.(nextKeys);
  };

  const toggleRowSelect = (row: Record<string, unknown>, key: string): void => {
    const isSelected = selectedKeysSet.has(key);
    const nextKeys = isSelected ? selectedRowKeys.filter((k) => k !== key) : [...selectedRowKeys, key];
    if (controlledSelectedRowKeys === undefined) {
      setInternalSelectedRowKeys(nextKeys);
    }
    onSelectRow?.(row, !isSelected);
    onSelectionChange?.(nextKeys);
  };

  const toggleRowExpand = (key: string): void => {
    const isExpanded = expandedKeysSet.has(key);
    const nextKeys = isExpanded ? expandedRowKeys.filter((k) => k !== key) : [...expandedRowKeys, key];
    if (controlledExpandedRowKeys === undefined) {
      setInternalExpandedRowKeys(nextKeys);
    }
    onExpansionChange?.(nextKeys);
  };

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

  const onHeaderKeyDown = (event: unknown, column: TableColumn): void => {
    if (!column.sortable) {
      return;
    }
    const key = (event as { key?: string }).key;
    if (key === 'Enter' || key === ' ') {
      (event as { preventDefault?: () => void }).preventDefault?.();
      toggleSort(column);
    }
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
      { [styles['forge-table__th--fixed-left']]: column.fixed === 'left' },
      { [styles['forge-table__th--fixed-right']]: column.fixed === 'right' },
    );
    return (
      <th
        className={thClass}
        scope="col"
        tabindex={column.sortable ? 0 : undefined}
        style={column.width ? { width: column.width } : undefined}
        aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
        onClick={() => toggleSort(column)}
        onKeyDown={(event: unknown) => onHeaderKeyDown(event, column)}
        onKeydown={(event: unknown) => onHeaderKeyDown(event, column)}
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

  const hasExpand = expandable || Boolean(expandedRowRender);
  const totalColSpan = columns.length + (selectable ? 1 : 0) + (hasExpand ? 1 : 0);

  const bodyRows =
    sortedRows.length === 0
      ? [
          <tr className={styles['forge-table__row']}>
            <td
              className={styles['forge-table__empty']}
              colSpan={totalColSpan}
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
      : sortedRows.flatMap((row, index) => {
          const rowKeyStr = getRowKey(row, index);
          const isSelected = selectedKeysSet.has(rowKeyStr);
          const isExpanded = expandedKeysSet.has(rowKeyStr);
          const rowClass = classNames(styles['forge-table__row'], {
            [styles['forge-table__row--selected']]: isSelected,
          });

          const mainRow = (
            <tr className={rowClass}>
              {selectable ? (
                <td className={classNames(styles['forge-table__td'], styles['forge-table__td--selection'])}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    aria-label={`Select row ${rowKeyStr}`}
                    onChange={() => toggleRowSelect(row, rowKeyStr)}
                  />
                </td>
              ) : undefined}
              {hasExpand ? (
                <td className={classNames(styles['forge-table__td'], styles['forge-table__td--expand'])}>
                  <button
                    type="button"
                    className={styles['forge-table__expand-button']}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                    onClick={() => toggleRowExpand(rowKeyStr)}
                  >
                    <ForgeIconChevron
                      direction={isExpanded ? 'down' : 'right'}
                      size="2xs"
                    />
                  </button>
                </td>
              ) : undefined}
              {columns.map((column) => {
                const value = row[column.key];
                const text = column.render ? column.render(value, row) : String(value ?? '');
                const tdClass = classNames(styles['forge-table__td'], {
                  [styles[`forge-table__td--align-${column.align ?? 'left'}`]]: true,
                  [styles['forge-table__td--fixed-left']]: column.fixed === 'left',
                  [styles['forge-table__td--fixed-right']]: column.fixed === 'right',
                });
                return (
                  <td
                    className={tdClass}
                    style={style}
                  >
                    <Slot
                      name="cell"
                      column={column}
                      row={row}
                      value={value}
                    >
                      <ForgeTypography
                        as="span"
                        color="primary"
                        variant="body-sm"
                      >
                        {text}
                      </ForgeTypography>
                    </Slot>
                  </td>
                );
              })}
            </tr>
          );

          if (isExpanded && expandedRowRender) {
            const detailRow = (
              <tr className={classNames(styles['forge-table__row'], styles['forge-table__expanded-row'])}>
                <td
                  className={styles['forge-table__expanded-cell']}
                  colSpan={totalColSpan}
                >
                  {expandedRowRender(row)}
                </td>
              </tr>
            );
            return [mainRow, detailRow];
          }

          return [mainRow];
        });

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
          <tr>
            {selectable ? (
              <th
                className={classNames(styles['forge-table__th'], styles['forge-table__th--selection'])}
                scope="col"
              >
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  aria-label="Select all rows"
                  onChange={toggleSelectAll}
                />
              </th>
            ) : undefined}
            {hasExpand ? (
              <th
                className={classNames(styles['forge-table__th'], styles['forge-table__th--expand'])}
                scope="col"
                aria-label="Expand row"
              />
            ) : undefined}
            {headCells}
          </tr>
        </thead>
        <tbody>{bodyRows}</tbody>
      </table>
    </div>
  );
}
