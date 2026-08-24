import { type MpElement, useEffect, useState } from '@mission-platform/forge';

import styles from './forge-transfer-list.module.scss';

export interface TransferItem {
  id: string;
  label: string;
  disabled?: boolean;
  description?: string;
}
export type TransferListTitles = readonly [string, string] | { source: string; target: string };
export interface TransferListProperties {
  sourceItems: TransferItem[];
  modelValue?: string[];
  titles?: TransferListTitles;
  searchable?: boolean;
  maxSelections?: number;
  onUpdateModelValue?: (targetIds: string[]) => void;
  onChange?: (targetIds: string[], items: TransferItem[]) => void;
}

export function ForgeTransferList(properties: Readonly<TransferListProperties>): MpElement {
  const { sourceItems, titles = ['Available items', 'Selected items'], searchable = false, maxSelections } = properties;
  const [target, setTarget] = useState(properties.modelValue ?? []);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (properties.modelValue !== undefined) setTarget(properties.modelValue);
  }, [properties.modelValue]);
  const items = sourceItems;
  const sourceTitle = 'source' in titles ? titles.source : titles[0];
  const targetTitle = 'target' in titles ? titles.target : titles[1];
  const matches = (item: TransferItem): boolean => item.label.toLowerCase().includes(query.trim().toLowerCase());
  const available = items.filter((item) => !target.includes(item.id) && matches(item));
  const selectedItems = items.filter((item) => target.includes(item.id) && matches(item));
  const toggle = (id: string): void =>
    setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  const move = (toTarget: boolean): void => {
    const moving = selected.filter((id) => !target.includes(id));
    if (toTarget && maxSelections !== undefined && target.length + moving.length > maxSelections) return;
    const next = toTarget ? [...target, ...moving] : target.filter((id) => !selected.includes(id));
    setTarget(next);
    setSelected([]);
    properties.onUpdateModelValue?.(next);
    properties.onChange?.(
      next,
      items.filter((item) => next.includes(item.id)),
    );
  };
  const list = (listItems: TransferItem[], label: string, searchLabel: string): MpElement => (
    <div className={styles['forge-transfer-list__group']}>
      <h2>{label}</h2>
      {searchable ? (
        <label className={styles['forge-transfer-list__search']}>
          <span>{searchLabel}</span>
          <input
            type="search"
            aria-label={searchLabel}
            value={query}
            onInput={(event: Event) => setQuery((event.target as HTMLInputElement).value)}
          />
        </label>
      ) : undefined}
      <ul aria-label={label}>
        {listItems.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                disabled={item.disabled}
                onChange={() => toggle(item.id)}
              />
              <span>{item.label}</span>
              {item.description ? <small>{item.description}</small> : undefined}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <section
      className={styles['forge-transfer-list']}
      aria-label="Transfer items"
    >
      {list(available, sourceTitle, 'Search available')}
      <div className={styles['forge-transfer-list__controls']}>
        <button
          type="button"
          aria-label="Move selected right"
          disabled={
            !selected.some((id) => available.some((item) => item.id === id)) ||
            (maxSelections !== undefined && target.length >= maxSelections)
          }
          onClick={() => move(true)}
        >
          →
        </button>
        <button
          type="button"
          aria-label="Move selected left"
          disabled={!selected.some((id) => selectedItems.some((item) => item.id === id))}
          onClick={() => move(false)}
        >
          ←
        </button>
      </div>
      {list(selectedItems, targetTitle, 'Search selected')}
    </section>
  );
}
