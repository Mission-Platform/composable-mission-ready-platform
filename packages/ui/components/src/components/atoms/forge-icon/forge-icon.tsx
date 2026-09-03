import { classNames, Dynamic, type MpComponent, type MpElement } from '@mission-platform/forge';
import * as iconCatalog from '@mission-platform/icons';

import styles from './forge-icon.module.scss';

/** A catalog name such as `forge-icon-check`; unknown names use the fallback icon. */
export type IconName = string;
/** Icon size mapped to the catalog's pixel dimensions. */
export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

export interface IconProperties {
  /** Catalog name. Both `check` and `forge-icon-check` are accepted. */
  name: IconName;
  /** Width and height passed to the catalog icon. Defaults to `'md'`. */
  size?: IconSize;
  /** Accessible name. Without one, the entire wrapper is decorative. */
  ariaLabel?: string;
  /** CSS color passed to the catalog icon. */
  color?: string;
}

type CatalogIconProperties = { size?: number; ariaLabel?: string };
type CatalogIcon = MpComponent<CatalogIconProperties>;
type IconExports = Record<string, unknown>;

const SIZE_MAP: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

/** Convert a catalog name into the generated component export name. */
function toExportName(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
}

/** Resolve only catalog entries and callable exports; otherwise return the safe alert fallback. */
function resolveIcon(name: string): CatalogIcon {
  const normalized = name.startsWith('forge-icon-') ? name : `forge-icon-${name}`;
  const candidate = (iconCatalog as IconExports)[toExportName(normalized)];
  if (typeof candidate === 'function') {
    return candidate as CatalogIcon;
  }
  return iconCatalog.ForgeIconAlert as CatalogIcon;
}

/**
 * Framework-neutral icon facade backed by the reviewed `@mission-platform/icons`
 * catalog. Resolution is data-driven and unknown names never render an invalid
 * component; the wrapper owns the accessible name so catalog SVGs remain silent.
 */
export function ForgeIcon(properties: Readonly<IconProperties>): MpElement {
  const { size = 'md', ariaLabel, color = 'currentColor' } = properties;
  const className = classNames(styles['forge-icon']);
  const icon = resolveIcon(properties.name);

  return (
    <span
      aria-hidden={ariaLabel ? undefined : 'true'}
      aria-label={ariaLabel}
      className={className}
      role="img"
    >
      <Dynamic
        is={icon}
        ariaLabel={undefined}
        color={color}
        size={SIZE_MAP[size]}
      />
    </span>
  );
}
