import {
  classNames,
  type MpChild,
  type MpElement,
  type MpRenderProperty,
  Slot,
  useState,
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
