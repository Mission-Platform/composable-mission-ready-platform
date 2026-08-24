import { classNames, type MpElement, useRef, useState } from '@mission-platform/forge';

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
}

/** A responsive board for moving items between columns. */
export function ForgeKanbanBoard(properties: Readonly<KanbanBoardProperties>): MpElement {
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
