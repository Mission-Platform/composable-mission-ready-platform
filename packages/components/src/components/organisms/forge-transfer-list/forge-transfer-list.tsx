import {
  useEffect,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import styles from './forge-transfer-list.module.scss';

export interface TransferItem {
  id: string;
  label: string;
  disabled?: boolean;
  description?: string;
}
export type TransferListTitles = readonly [string, string] | { source: string; target: string };

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface TransferListStyleProperties {
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-text-tertiary'?: string;
  readonly 'font-size-md'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'opacity-disabled'?: string;
  readonly 'radius-md'?: string;
  readonly 'radius-sm'?: string;
  readonly 'size-height-lg'?: string;
  readonly 'size-height-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-4'?: string;
}

export type TransferListStyle = CSSStyleProperties & {
  readonly '--forge-transfer-list-border-width-thin'?: string | undefined;
  readonly '--forge-transfer-list-color-bg-muted'?: string | undefined;
  readonly '--forge-transfer-list-color-bg-surface'?: string | undefined;
  readonly '--forge-transfer-list-color-border-default'?: string | undefined;
  readonly '--forge-transfer-list-color-text-tertiary'?: string | undefined;
  readonly '--forge-transfer-list-font-size-md'?: string | undefined;
  readonly '--forge-transfer-list-font-size-sm'?: string | undefined;
  readonly '--forge-transfer-list-opacity-disabled'?: string | undefined;
  readonly '--forge-transfer-list-radius-md'?: string | undefined;
  readonly '--forge-transfer-list-radius-sm'?: string | undefined;
  readonly '--forge-transfer-list-size-height-lg'?: string | undefined;
  readonly '--forge-transfer-list-size-height-md'?: string | undefined;
  readonly '--forge-transfer-list-spacing-1'?: string | undefined;
  readonly '--forge-transfer-list-spacing-2'?: string | undefined;
  readonly '--forge-transfer-list-spacing-4'?: string | undefined;
};

function createTransferListStyle(
  properties: Readonly<TransferListStyleProperties> | undefined,
): TransferListStyle | undefined {
  return createForgeStyle({
    '--forge-transfer-list-border-width-thin': properties?.['border-width-thin'],
    '--forge-transfer-list-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-transfer-list-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-transfer-list-color-border-default': properties?.['color-border-default'],
    '--forge-transfer-list-color-text-tertiary': properties?.['color-text-tertiary'],
    '--forge-transfer-list-font-size-md': properties?.['font-size-md'],
    '--forge-transfer-list-font-size-sm': properties?.['font-size-sm'],
    '--forge-transfer-list-opacity-disabled': properties?.['opacity-disabled'],
    '--forge-transfer-list-radius-md': properties?.['radius-md'],
    '--forge-transfer-list-radius-sm': properties?.['radius-sm'],
    '--forge-transfer-list-size-height-lg': properties?.['size-height-lg'],
    '--forge-transfer-list-size-height-md': properties?.['size-height-md'],
    '--forge-transfer-list-spacing-1': properties?.['spacing-1'],
    '--forge-transfer-list-spacing-2': properties?.['spacing-2'],
    '--forge-transfer-list-spacing-4': properties?.['spacing-4'],
  }) as TransferListStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface TransferListProperties {
  sourceItems: TransferItem[];
  modelValue?: string[];
  titles?: TransferListTitles;
  searchable?: boolean;
  maxSelections?: number;
  onUpdateModelValue?: (targetIds: string[]) => void;
  onChange?: (targetIds: string[], items: TransferItem[]) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<TransferListStyleProperties>;
}

export function ForgeTransferList(properties: Readonly<TransferListProperties>): MpElement {
  const style = createTransferListStyle(properties.properties);

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
      style={style}
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
