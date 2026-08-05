import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

import styles from './forge-icon-table-row-add.module.scss';

export interface IconTableRowAddProperties extends MpProperties {
  /** Width and height — named size token ('2xs' → '2xl') or pixel number. */
  size?: number | string;
  /** Stroke colour. Defaults to `currentColor`. */
  color?: string;
  /** Accessible label. Omit to hide the icon from assistive technology. */
  ariaLabel?: string;
}

/**
 * `ForgeIconTableRowAdd` — an icon authored once in the neutral JSX dialect.
 *
 * It compiles cleanly to both Vue 3 and React via the vite-plugin-forge
 * two-stage compiler. The icon ships its own `@layer mp.icons` CSS through the
 * co-located CSS Module `forge-icon-table-row-add.module.scss`.
 */
export function ForgeIconTableRowAdd(properties: Readonly<IconTableRowAddProperties>): MpElement {
  const size = properties.size ?? 'md';
  const sizeValue = typeof size === 'number' ? size : mapTokenToPixels(size);
  const color = properties.color ?? 'currentColor';

  return (
    <div className={styles['forge-icon-table-row-add']}>
      <svg
        aria-hidden={!properties.ariaLabel}
        aria-label={properties.ariaLabel ?? 'Add Table Row'}
        height={sizeValue}
        stroke={color}
        width={sizeValue}
        fill="none"
        role="img"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width={2}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M3 3h18v10H3z" />
        <line
          x1={9}
          x2={9}
          y1={3}
          y2={13}
        />
        <line
          x1={15}
          x2={15}
          y1={3}
          y2={13}
        />
        <line
          x1={12}
          x2={12}
          y1={17}
          y2={23}
        />
        <line
          x1={9}
          x2={15}
          y1={20}
          y2={20}
        />
      </svg>
    </div>
  );
}

/** Map named size tokens to pixel values. */
function mapTokenToPixels(token: string): number {
  const sizes: Record<string, number> = {
    '2xs': 12,
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
    '2xl': 48,
  };
  return sizes[token] ?? 24;
}
