import { classNames, type MpElement, type MpRenderProperty, Slot } from '@mission-platform/forge';

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
