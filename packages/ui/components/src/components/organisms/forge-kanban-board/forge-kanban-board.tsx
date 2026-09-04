import {
  classNames,
  useRef,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-kanban-board.module.scss';

export interface KanbanItem {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'error';
}

/** @deprecated Use `KanbanItem`. */
export type KanbanCard = KanbanItem;

export interface KanbanColumn {
  id: string;
  title: string;
  items: KanbanItem[];
  limit?: number;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface KanbanBoardStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-success-default'?: string;
  readonly 'color-text-tertiary'?: string;
  readonly 'color-warning-default'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-size-xs'?: string;
  readonly 'radius-lg'?: string;
  readonly 'radius-md'?: string;
  readonly 'shadow-xs'?: string;
  readonly 'size-height-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
}

export type KanbanBoardStyle = CSSStyleProperties & {
  readonly '--forge-kanban-board-border-width-thick'?: string | undefined;
  readonly '--forge-kanban-board-border-width-thin'?: string | undefined;
  readonly '--forge-kanban-board-color-bg-muted'?: string | undefined;
  readonly '--forge-kanban-board-color-bg-surface'?: string | undefined;
  readonly '--forge-kanban-board-color-border-default'?: string | undefined;
  readonly '--forge-kanban-board-color-success-default'?: string | undefined;
  readonly '--forge-kanban-board-color-text-tertiary'?: string | undefined;
  readonly '--forge-kanban-board-color-warning-default'?: string | undefined;
  readonly '--forge-kanban-board-font-size-sm'?: string | undefined;
  readonly '--forge-kanban-board-font-size-xs'?: string | undefined;
  readonly '--forge-kanban-board-radius-lg'?: string | undefined;
  readonly '--forge-kanban-board-radius-md'?: string | undefined;
  readonly '--forge-kanban-board-shadow-xs'?: string | undefined;
  readonly '--forge-kanban-board-size-height-md'?: string | undefined;
  readonly '--forge-kanban-board-spacing-1'?: string | undefined;
  readonly '--forge-kanban-board-spacing-2'?: string | undefined;
  readonly '--forge-kanban-board-spacing-3'?: string | undefined;
  readonly '--forge-kanban-board-spacing-4'?: string | undefined;
};

function createKanbanBoardStyle(
  properties: Readonly<KanbanBoardStyleProperties> | undefined,
): KanbanBoardStyle | undefined {
  return createForgeStyle({
    '--forge-kanban-board-border-width-thick': properties?.['border-width-thick'],
    '--forge-kanban-board-border-width-thin': properties?.['border-width-thin'],
    '--forge-kanban-board-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-kanban-board-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-kanban-board-color-border-default': properties?.['color-border-default'],
    '--forge-kanban-board-color-success-default': properties?.['color-success-default'],
    '--forge-kanban-board-color-text-tertiary': properties?.['color-text-tertiary'],
    '--forge-kanban-board-color-warning-default': properties?.['color-warning-default'],
    '--forge-kanban-board-font-size-sm': properties?.['font-size-sm'],
    '--forge-kanban-board-font-size-xs': properties?.['font-size-xs'],
    '--forge-kanban-board-radius-lg': properties?.['radius-lg'],
    '--forge-kanban-board-radius-md': properties?.['radius-md'],
    '--forge-kanban-board-shadow-xs': properties?.['shadow-xs'],
    '--forge-kanban-board-size-height-md': properties?.['size-height-md'],
    '--forge-kanban-board-spacing-1': properties?.['spacing-1'],
    '--forge-kanban-board-spacing-2': properties?.['spacing-2'],
    '--forge-kanban-board-spacing-3': properties?.['spacing-3'],
    '--forge-kanban-board-spacing-4': properties?.['spacing-4'],
  }) as KanbanBoardStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface KanbanBoardProperties {
  columns: KanbanColumn[];
  draggable?: boolean;
  columnAddable?: boolean;
  ariaLabel?: string;
  emptyMessage?: string;
  onMove?: (itemId: string, fromColumnId: string, toColumnId: string) => void;
  onColumnAdd?: () => void;
  onItemAdd?: (columnId: string) => void;
  onItemClick?: (item: KanbanItem) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<KanbanBoardStyleProperties>;
}

/** A responsive board for moving items between columns. */
export function ForgeKanbanBoard(properties: Readonly<KanbanBoardProperties>): MpElement {
  const style = createKanbanBoardStyle(properties.properties);

  const {
    ariaLabel = 'Kanban board',
    emptyMessage = 'No items',
    draggable = true,
    columnAddable = false,
    columns,
  } = properties;
  const [boardColumns, setBoardColumns] = useState(columns);
  const draggedItem = useRef<{ itemId: string; columnId: string } | undefined>(undefined);

  const moveItem = (itemId: string, fromId: string, toId: string): void => {
    if (fromId === toId) return;
    const source = boardColumns.find((column) => column.id === fromId);
    const item = source?.items.find((candidate) => candidate.id === itemId);
    const destination = boardColumns.find((column) => column.id === toId);
    if (
      !item ||
      !source ||
      !destination ||
      (destination.limit !== undefined && destination.items.length >= destination.limit)
    )
      return;
    setBoardColumns(
      boardColumns.map((column) => {
        if (column.id === fromId)
          return { ...column, items: column.items.filter((candidate) => candidate.id !== itemId) };
        if (column.id === toId) return { ...column, items: [...column.items, item] };
        return column;
      }),
    );
    properties.onMove?.(itemId, fromId, toId);
  };
  const dropInto = (columnId: string): void => {
    if (draggedItem.current) moveItem(draggedItem.current.itemId, draggedItem.current.columnId, columnId);
    draggedItem.current = undefined;
  };

  return (
    <section
      className={styles['forge-kanban-board']}
      aria-label={ariaLabel}
      style={style}
    >
      <header className={styles['forge-kanban-board__header']}>
        <h2>{ariaLabel}</h2>
        {columnAddable ? (
          <button
            type="button"
            onClick={() => properties.onColumnAdd?.()}
          >
            Add column
          </button>
        ) : undefined}
      </header>
      <div className={styles['forge-kanban-board__columns']}>
        {boardColumns.map((column) => (
          <section
            className={styles['forge-kanban-board__column']}
            key={column.id}
            aria-label={column.title}
            onDragOver={(event: unknown) => (event as { preventDefault: () => void }).preventDefault()}
            onDrop={() => dropInto(column.id)}
          >
            <header className={styles['forge-kanban-board__column-header']}>
              <h3>{column.title}</h3>
              <span aria-label={`${column.items.length} items`}>{column.items.length}</span>
            </header>
            <div className={styles['forge-kanban-board__cards']}>
              {column.items.length === 0 ? (
                <p className={styles['forge-kanban-board__empty']}>{emptyMessage}</p>
              ) : (
                column.items.map((item) => (
                  <article
                    className={classNames(
                      styles['forge-kanban-board__card'],
                      item.tone ? styles[`forge-kanban-board__card--${item.tone}`] : undefined,
                    )}
                    key={item.id}
                    draggable={draggable}
                    onDragStart={() => {
                      draggedItem.current = { itemId: item.id, columnId: column.id };
                    }}
                    onDragEnd={() => {
                      draggedItem.current = undefined;
                    }}
                  >
                    <button
                      type="button"
                      className={styles['forge-kanban-board__item']}
                      onClick={() => properties.onItemClick?.(item)}
                    >
                      {item.title}
                    </button>
                    {item.description ? <p>{item.description}</p> : undefined}
                    {item.assignee ? <small>{item.assignee}</small> : undefined}
                    <label className={styles['forge-kanban-board__move']}>
                      <span>Move to</span>
                      <select
                        aria-label={`Move ${item.title}`}
                        value={column.id}
                        onChange={(event: unknown) =>
                          moveItem(item.id, column.id, (event as { target: { value: string } }).target.value)
                        }
                      >
                        {boardColumns.map((option) => (
                          <option
                            key={option.id}
                            value={option.id}
                          >
                            {option.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => properties.onItemAdd?.(column.id)}
            >
              Add item
            </button>
          </section>
        ))}
      </div>
    </section>
  );
}
