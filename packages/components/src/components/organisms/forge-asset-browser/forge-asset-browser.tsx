import {
  classNames,
  Slot,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type MpRenderProperty,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import styles from './forge-asset-browser.module.scss';

export type AssetBrowserSize = 'sm' | 'md' | 'lg';
export type AssetBrowserValue = string | string[];

export interface AssetBrowserItem {
  id: string;
  name: string;
  src: string;
  alt?: string;
  type?: string;
  metadata?: string;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface AssetBrowserStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-border-focus'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-primary-subtle'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-weight-semibold'?: string;
  readonly 'radius-md'?: string;
  readonly 'radius-sm'?: string;
  readonly 'size-pad-block-md'?: string;
  readonly 'size-pad-inline-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-8'?: string;
}

export type AssetBrowserStyle = CSSStyleProperties & {
  readonly '--forge-asset-browser-border-width-thick'?: string | undefined;
  readonly '--forge-asset-browser-border-width-thin'?: string | undefined;
  readonly '--forge-asset-browser-color-bg-muted'?: string | undefined;
  readonly '--forge-asset-browser-color-bg-surface'?: string | undefined;
  readonly '--forge-asset-browser-color-border-default'?: string | undefined;
  readonly '--forge-asset-browser-color-border-focus'?: string | undefined;
  readonly '--forge-asset-browser-color-primary-default'?: string | undefined;
  readonly '--forge-asset-browser-color-primary-subtle'?: string | undefined;
  readonly '--forge-asset-browser-color-text-primary'?: string | undefined;
  readonly '--forge-asset-browser-color-text-secondary'?: string | undefined;
  readonly '--forge-asset-browser-font-size-sm'?: string | undefined;
  readonly '--forge-asset-browser-font-weight-semibold'?: string | undefined;
  readonly '--forge-asset-browser-radius-md'?: string | undefined;
  readonly '--forge-asset-browser-radius-sm'?: string | undefined;
  readonly '--forge-asset-browser-size-pad-block-md'?: string | undefined;
  readonly '--forge-asset-browser-size-pad-inline-md'?: string | undefined;
  readonly '--forge-asset-browser-spacing-1'?: string | undefined;
  readonly '--forge-asset-browser-spacing-2'?: string | undefined;
  readonly '--forge-asset-browser-spacing-3'?: string | undefined;
  readonly '--forge-asset-browser-spacing-4'?: string | undefined;
  readonly '--forge-asset-browser-spacing-8'?: string | undefined;
};

function createAssetBrowserStyle(
  properties: Readonly<AssetBrowserStyleProperties> | undefined,
): AssetBrowserStyle | undefined {
  return createForgeStyle({
    '--forge-asset-browser-border-width-thick': properties?.['border-width-thick'],
    '--forge-asset-browser-border-width-thin': properties?.['border-width-thin'],
    '--forge-asset-browser-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-asset-browser-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-asset-browser-color-border-default': properties?.['color-border-default'],
    '--forge-asset-browser-color-border-focus': properties?.['color-border-focus'],
    '--forge-asset-browser-color-primary-default': properties?.['color-primary-default'],
    '--forge-asset-browser-color-primary-subtle': properties?.['color-primary-subtle'],
    '--forge-asset-browser-color-text-primary': properties?.['color-text-primary'],
    '--forge-asset-browser-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-asset-browser-font-size-sm': properties?.['font-size-sm'],
    '--forge-asset-browser-font-weight-semibold': properties?.['font-weight-semibold'],
    '--forge-asset-browser-radius-md': properties?.['radius-md'],
    '--forge-asset-browser-radius-sm': properties?.['radius-sm'],
    '--forge-asset-browser-size-pad-block-md': properties?.['size-pad-block-md'],
    '--forge-asset-browser-size-pad-inline-md': properties?.['size-pad-inline-md'],
    '--forge-asset-browser-spacing-1': properties?.['spacing-1'],
    '--forge-asset-browser-spacing-2': properties?.['spacing-2'],
    '--forge-asset-browser-spacing-3': properties?.['spacing-3'],
    '--forge-asset-browser-spacing-4': properties?.['spacing-4'],
    '--forge-asset-browser-spacing-8': properties?.['spacing-8'],
  }) as AssetBrowserStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface AssetBrowserProperties {
  items: AssetBrowserItem[];
  view?: 'grid' | 'list';
  selectable?: boolean;
  uploadable?: boolean;
  breadcrumb?: AssetBrowserBreadcrumb[];
  searchPlaceholder?: string;
  ariaLabel?: string;
  emptyText?: string;
  item?: MpRenderProperty<AssetBrowserItemScope>;
  empty?: MpChild;
  onSelect?: (asset: AssetBrowserItem) => void;
  onUpload?: (files: File[]) => void;
  onBreadcrumbClick?: (item: AssetBrowserBreadcrumb) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<AssetBrowserStyleProperties>;
}

export interface AssetBrowserBreadcrumb {
  label: string;
  href?: string;
}

export interface AssetBrowserItemScope {
  item: AssetBrowserItem;
  selected: boolean;
}

export function ForgeAssetBrowser(properties: Readonly<AssetBrowserProperties>): MpElement {
  const style = createAssetBrowserStyle(properties.properties);

  const {
    items,
    view = 'grid',
    selectable = true,
    uploadable = false,
    breadcrumb,
    searchPlaceholder = 'Search assets',
    ariaLabel = 'Asset browser',
    emptyText = 'No assets found',
  } = properties;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const filteredAssets = items.filter((asset) => asset.name.toLowerCase().includes(query.trim().toLowerCase()));

  const select = (asset: AssetBrowserItem): void => {
    if (!selectable) return;
    const next = selected.includes(asset.id) ? selected.filter((id) => id !== asset.id) : [asset.id];
    setSelected(next);
    properties.onSelect?.(asset);
  };

  return (
    <section
      aria-label={ariaLabel}
      className={classNames(styles['forge-asset-browser'], styles[`forge-asset-browser--${view}`])}
      style={style}
    >
      {breadcrumb && breadcrumb.length > 0 ? (
        <nav
          aria-label="Asset location"
          className={styles['forge-asset-browser__breadcrumb']}
        >
          {breadcrumb.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`}>
              {index > 0 ? <span aria-hidden="true"> / </span> : undefined}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  onClick={() => properties.onBreadcrumbClick?.(crumb)}
                >
                  {crumb.label}
                </a>
              ) : (
                crumb.label
              )}
            </span>
          ))}
        </nav>
      ) : undefined}
      <label className={styles['forge-asset-browser__search-label']}>
        <span>Search assets</span>
        <input
          aria-label="Search assets"
          className={styles['forge-asset-browser__search']}
          type="search"
          placeholder={searchPlaceholder}
          value={query}
          onInput={(event: Event) => setQuery((event.target as HTMLInputElement).value)}
        />
      </label>
      {uploadable ? (
        <label className={styles['forge-asset-browser__upload']}>
          Upload assets
          <input
            type="file"
            multiple
            onChange={(event: Event) => properties.onUpload?.([...((event.target as HTMLInputElement).files ?? [])])}
          />
        </label>
      ) : undefined}
      {filteredAssets.length === 0 ? (
        <p className={styles['forge-asset-browser__empty']}>
          <Slot name="empty">{properties.empty ?? emptyText}</Slot>
        </p>
      ) : (
        <ul
          className={styles['forge-asset-browser__grid']}
          role="listbox"
          aria-multiselectable={selectable ? 'true' : undefined}
        >
          {filteredAssets.map((asset) => {
            const isSelected = selected.includes(asset.id);
            return (
              <li
                key={asset.id}
                className={styles['forge-asset-browser__item']}
              >
                <button
                  aria-label={asset.name}
                  aria-selected={selectable ? isSelected : undefined}
                  className={classNames(styles['forge-asset-browser__asset'], {
                    [styles['forge-asset-browser__asset--selected']]: isSelected,
                  })}
                  role="option"
                  type="button"
                  disabled={!selectable}
                  onClick={() => select(asset)}
                >
                  <Slot
                    name="item"
                    item={asset}
                    selected={isSelected}
                  >
                    <img
                      className={styles['forge-asset-browser__image']}
                      src={asset.src}
                      alt={asset.alt ?? asset.name}
                    />
                    <span className={styles['forge-asset-browser__name']}>{asset.name}</span>
                    {asset.metadata ? (
                      <span className={styles['forge-asset-browser__metadata']}>{asset.metadata}</span>
                    ) : undefined}
                  </Slot>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
