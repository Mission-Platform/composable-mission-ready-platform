import {
  classNames,
  hasSlot,
  Slot,
  createForgeStyle,
  type ClassValue,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import { ForgeSpinner } from '@/components/atoms/forge-spinner';

import styles from './forge-metric-card.module.scss';

/** Size token controlling the metric card scale. */
export type MetricCardSize = 'sm' | 'md' | 'lg';
/** Surface tone of the metric card. */
export type MetricCardVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'error';
/** Direction of change represented by a metric trend. */
export type MetricCardTrendDirection = 'up' | 'down' | 'flat';

/** Optional change indicator rendered below the metric value. */
export interface MetricCardTrend {
  /** Change value, for example `'+12%'` or `'-4'`. */
  value: string;
  /** Visual direction. When omitted, numeric values are inferred and other values are neutral. */
  direction?: MetricCardTrendDirection;
  /** Additional context, for example `'vs. last month'`. */
  positive?: boolean;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface MetricCardStyleProperties {
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-error-default'?: string;
  readonly 'color-error-text'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-success-default'?: string;
  readonly 'color-success-text'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'color-warning-default'?: string;
  readonly 'font-size-2xl'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-weight-bold'?: string;
  readonly 'line-height-tight'?: string;
  readonly 'radius-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-6'?: string;
}

export type MetricCardStyle = CSSStyleProperties & {
  readonly '--forge-metric-card-border-width-thin'?: string | undefined;
  readonly '--forge-metric-card-color-bg-surface'?: string | undefined;
  readonly '--forge-metric-card-color-border-default'?: string | undefined;
  readonly '--forge-metric-card-color-error-default'?: string | undefined;
  readonly '--forge-metric-card-color-error-text'?: string | undefined;
  readonly '--forge-metric-card-color-primary-default'?: string | undefined;
  readonly '--forge-metric-card-color-success-default'?: string | undefined;
  readonly '--forge-metric-card-color-success-text'?: string | undefined;
  readonly '--forge-metric-card-color-text-primary'?: string | undefined;
  readonly '--forge-metric-card-color-text-secondary'?: string | undefined;
  readonly '--forge-metric-card-color-warning-default'?: string | undefined;
  readonly '--forge-metric-card-font-size-2xl'?: string | undefined;
  readonly '--forge-metric-card-font-size-sm'?: string | undefined;
  readonly '--forge-metric-card-font-weight-bold'?: string | undefined;
  readonly '--forge-metric-card-line-height-tight'?: string | undefined;
  readonly '--forge-metric-card-radius-md'?: string | undefined;
  readonly '--forge-metric-card-spacing-1'?: string | undefined;
  readonly '--forge-metric-card-spacing-3'?: string | undefined;
  readonly '--forge-metric-card-spacing-4'?: string | undefined;
  readonly '--forge-metric-card-spacing-6'?: string | undefined;
};

function createMetricCardStyle(
  properties: Readonly<MetricCardStyleProperties> | undefined,
): MetricCardStyle | undefined {
  return createForgeStyle({
    '--forge-metric-card-border-width-thin': properties?.['border-width-thin'],
    '--forge-metric-card-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-metric-card-color-border-default': properties?.['color-border-default'],
    '--forge-metric-card-color-error-default': properties?.['color-error-default'],
    '--forge-metric-card-color-error-text': properties?.['color-error-text'],
    '--forge-metric-card-color-primary-default': properties?.['color-primary-default'],
    '--forge-metric-card-color-success-default': properties?.['color-success-default'],
    '--forge-metric-card-color-success-text': properties?.['color-success-text'],
    '--forge-metric-card-color-text-primary': properties?.['color-text-primary'],
    '--forge-metric-card-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-metric-card-color-warning-default': properties?.['color-warning-default'],
    '--forge-metric-card-font-size-2xl': properties?.['font-size-2xl'],
    '--forge-metric-card-font-size-sm': properties?.['font-size-sm'],
    '--forge-metric-card-font-weight-bold': properties?.['font-weight-bold'],
    '--forge-metric-card-line-height-tight': properties?.['line-height-tight'],
    '--forge-metric-card-radius-md': properties?.['radius-md'],
    '--forge-metric-card-spacing-1': properties?.['spacing-1'],
    '--forge-metric-card-spacing-3': properties?.['spacing-3'],
    '--forge-metric-card-spacing-4': properties?.['spacing-4'],
    '--forge-metric-card-spacing-6': properties?.['spacing-6'],
  }) as MetricCardStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface MetricCardProperties {
  /** Short name of the metric. */
  label: string;
  /** Primary metric value. */
  value: MpChild;
  /** Optional change indicator. */
  trend?: MetricCardTrend;
  /** Leading content such as an icon. */
  icon?: MpChild;
  /** Intrinsic size. Defaults to `'md'`. */
  size?: MetricCardSize;
  /** Show a loading indicator while retaining the card structure. */
  loading?: boolean;
  /** Accessible label for the loading indicator. */
  loadingLabel?: string;
  /** Explicit root id. */
  id?: string;
  /** Extra class(es) merged onto the root element. */
  className?: ClassValue;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<MetricCardStyleProperties>;
}

function inferTrendDirection(value: MpChild): MetricCardTrendDirection {
  if (typeof value === 'number') {
    return value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  }
  if (typeof value === 'string') {
    const numericValue = Number.parseFloat(value.replaceAll(/[^0-9+-.]/g, ''));
    if (!Number.isNaN(numericValue)) {
      return numericValue > 0 ? 'up' : numericValue < 0 ? 'down' : 'flat';
    }
  }
  return 'flat';
}

/**
 * `ForgeMetricCard` — a compact metric summary authored once in neutral JSX.
 * It keeps the value, trend, loading state, and supporting content in one
 * accessible article while leaving visual treatments to its CSS Module.
 */
export function ForgeMetricCard(properties: Readonly<MetricCardProperties>): MpElement {
  const style = createMetricCardStyle(properties.properties);

  const { label, value, trend, icon, size = 'md', loading = false } = properties;
  const trendDirection = trend ? (trend.direction ?? inferTrendDirection(trend.value)) : undefined;
  const trendTone = trend?.positive === undefined ? trendDirection : trend.positive ? 'up' : 'down';
  const className = classNames(
    styles['forge-metric-card'],
    styles[`forge-metric-card--${size}`],
    { [styles['forge-metric-card--loading']]: loading },
    properties.className,
  );

  return (
    <article
      aria-busy={loading}
      className={className}
      id={properties.id}
      style={style}
    >
      <div className={styles['forge-metric-card__header']}>
        {icon !== undefined || hasSlot('icon') ? (
          <span className={styles['forge-metric-card__icon']}>
            <Slot name="icon">{icon}</Slot>
          </span>
        ) : undefined}
        <ForgeTypography
          as="span"
          color="secondary"
          variant="label"
        >
          {label}
        </ForgeTypography>
      </div>
      <div className={styles['forge-metric-card__value']}>
        {loading ? (
          <ForgeSpinner
            label={properties.loadingLabel ?? 'Loading…'}
            size="sm"
          />
        ) : (
          value
        )}
      </div>
      {(trend && trendDirection) || hasSlot('trend') ? (
        <div
          className={classNames(styles['forge-metric-card__trend'], styles[`forge-metric-card__trend--${trendTone}`])}
        >
          {trend ? (
            <>
              <span>{trend.value}</span>
            </>
          ) : undefined}
        </div>
      ) : undefined}
      {hasSlot('footer') ? (
        <div className={styles['forge-metric-card__footer']}>
          <Slot name="footer" />
        </div>
      ) : undefined}
    </article>
  );
}
