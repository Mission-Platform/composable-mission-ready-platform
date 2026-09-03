import {
  classNames,
  Slot,
  createForgeStyle,
  type MpElement,
  type MpRenderProperty,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import styles from './forge-comparison-table.module.scss';

export type ComparisonTableSize = 'sm' | 'md' | 'lg';
export type ComparisonTableValue = string | number | boolean;

export interface ComparisonItem {
  id: string;
  name: string;
  description?: string;
  price?: string;
  highlighted?: boolean;
  actionLabel?: string;
}

/** @deprecated Use `ComparisonItem`. */
export type ComparisonTablePlan = ComparisonItem;

export interface FeatureRow {
  id: string;
  label: string;
  description?: string;
  values: Record<string, ComparisonTableValue>;
}

/** @deprecated Use `FeatureRow`. */
export type ComparisonTableFeature = FeatureRow;

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ComparisonTableStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-muted'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-border-focus'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-primary-subtle'?: string;
  readonly 'color-text-on-primary'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-weight-bold'?: string;
  readonly 'font-weight-regular'?: string;
  readonly 'font-weight-semibold'?: string;
  readonly 'radius-sm'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
}

export type ComparisonTableStyle = CSSStyleProperties & {
  readonly '--forge-comparison-table-border-width-thick'?: string | undefined;
  readonly '--forge-comparison-table-border-width-thin'?: string | undefined;
  readonly '--forge-comparison-table-color-bg-muted'?: string | undefined;
  readonly '--forge-comparison-table-color-border-default'?: string | undefined;
  readonly '--forge-comparison-table-color-border-focus'?: string | undefined;
  readonly '--forge-comparison-table-color-primary-default'?: string | undefined;
  readonly '--forge-comparison-table-color-primary-subtle'?: string | undefined;
  readonly '--forge-comparison-table-color-text-on-primary'?: string | undefined;
  readonly '--forge-comparison-table-color-text-primary'?: string | undefined;
  readonly '--forge-comparison-table-color-text-secondary'?: string | undefined;
  readonly '--forge-comparison-table-font-size-sm'?: string | undefined;
  readonly '--forge-comparison-table-font-weight-bold'?: string | undefined;
  readonly '--forge-comparison-table-font-weight-regular'?: string | undefined;
  readonly '--forge-comparison-table-font-weight-semibold'?: string | undefined;
  readonly '--forge-comparison-table-radius-sm'?: string | undefined;
  readonly '--forge-comparison-table-spacing-1'?: string | undefined;
  readonly '--forge-comparison-table-spacing-2'?: string | undefined;
  readonly '--forge-comparison-table-spacing-3'?: string | undefined;
  readonly '--forge-comparison-table-spacing-4'?: string | undefined;
};

function createComparisonTableStyle(
  properties: Readonly<ComparisonTableStyleProperties> | undefined,
): ComparisonTableStyle | undefined {
  return createForgeStyle({
    '--forge-comparison-table-border-width-thick': properties?.['border-width-thick'],
    '--forge-comparison-table-border-width-thin': properties?.['border-width-thin'],
    '--forge-comparison-table-color-bg-muted': properties?.['color-bg-muted'],
    '--forge-comparison-table-color-border-default': properties?.['color-border-default'],
    '--forge-comparison-table-color-border-focus': properties?.['color-border-focus'],
    '--forge-comparison-table-color-primary-default': properties?.['color-primary-default'],
    '--forge-comparison-table-color-primary-subtle': properties?.['color-primary-subtle'],
    '--forge-comparison-table-color-text-on-primary': properties?.['color-text-on-primary'],
    '--forge-comparison-table-color-text-primary': properties?.['color-text-primary'],
    '--forge-comparison-table-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-comparison-table-font-size-sm': properties?.['font-size-sm'],
    '--forge-comparison-table-font-weight-bold': properties?.['font-weight-bold'],
    '--forge-comparison-table-font-weight-regular': properties?.['font-weight-regular'],
    '--forge-comparison-table-font-weight-semibold': properties?.['font-weight-semibold'],
    '--forge-comparison-table-radius-sm': properties?.['radius-sm'],
    '--forge-comparison-table-spacing-1': properties?.['spacing-1'],
    '--forge-comparison-table-spacing-2': properties?.['spacing-2'],
    '--forge-comparison-table-spacing-3': properties?.['spacing-3'],
    '--forge-comparison-table-spacing-4': properties?.['spacing-4'],
  }) as ComparisonTableStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ComparisonTableProperties {
  items: ComparisonItem[];
  features: FeatureRow[];
  highlightBest?: boolean;
  stickyHeader?: boolean;
  size?: ComparisonTableSize;
  ariaLabel?: string;
  featureLabel?: string;
  header?: MpRenderProperty<ComparisonTableHeaderScope>;
  cell?: MpRenderProperty<ComparisonTableCellScope>;
  onSelectItem?: (item: ComparisonItem) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ComparisonTableStyleProperties>;
}

export interface ComparisonTableHeaderScope {
  item: ComparisonItem;
  index: number;
}

export interface ComparisonTableCellScope {
  item: ComparisonItem;
  feature: FeatureRow;
  value: ComparisonTableValue | undefined;
}

function renderValue(value: ComparisonTableValue | undefined): string {
  if (value === true) return 'Included';
  if (value === false || value === undefined) return '—';
  return String(value);
}

function comparableValue(value: ComparisonTableValue | undefined): number | undefined {
  if (typeof value === 'number') return value;
  if (value === true) return 1;
  return undefined;
}

export function ForgeComparisonTable(properties: Readonly<ComparisonTableProperties>): MpElement {
  const style = createComparisonTableStyle(properties.properties);

  const {
    items,
    features,
    highlightBest = false,
    stickyHeader = false,
    size = 'md',
    ariaLabel = 'Plan comparison',
    featureLabel = 'Features',
  } = properties;

  return (
    <div
      className={classNames(styles['forge-comparison-table'], `forge-size--${size}`, {
        [styles['forge-comparison-table--sticky-header']]: stickyHeader,
      })}
      style={style}
    >
      <table aria-label={ariaLabel}>
        <thead>
          <tr>
            <th scope="col">{featureLabel}</th>
            {items.map((item, index) => (
              <th
                className={classNames({ [styles['forge-comparison-table__highlighted']]: item.highlighted })}
                key={item.id}
                scope="col"
              >
                <Slot
                  name="header"
                  item={item}
                  index={index}
                >
                  <span className={styles['forge-comparison-table__plan-name']}>{item.name}</span>
                  {item.description ? (
                    <span className={styles['forge-comparison-table__plan-description']}>{item.description}</span>
                  ) : undefined}
                  {item.price ? (
                    <span className={styles['forge-comparison-table__price']}>{item.price}</span>
                  ) : undefined}
                  {item.actionLabel ? (
                    <button
                      className={styles['forge-comparison-table__action']}
                      type="button"
                      onClick={() => properties.onSelectItem?.(item)}
                    >
                      {item.actionLabel}
                    </button>
                  ) : undefined}
                </Slot>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.id}>
              <th scope="row">
                {feature.label}
                {feature.description ? <small>{feature.description}</small> : undefined}
              </th>
              {items.map((item) => {
                const value = feature.values[item.id];
                const comparable = comparableValue(value);
                const best =
                  highlightBest &&
                  comparable !== undefined &&
                  items.every((candidate) => {
                    const candidateValue = comparableValue(feature.values[candidate.id]);
                    return candidateValue === undefined || candidateValue <= comparable;
                  });
                return (
                  <td
                    className={classNames({
                      [styles['forge-comparison-table__highlighted']]: item.highlighted || best,
                    })}
                    key={item.id}
                  >
                    <Slot
                      name="cell"
                      item={item}
                      feature={feature}
                      value={value}
                    >
                      {renderValue(value)}
                    </Slot>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
