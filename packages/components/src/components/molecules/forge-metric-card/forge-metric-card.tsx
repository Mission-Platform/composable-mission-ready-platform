import { classNames, hasSlot, type ClassValue, type MpChild, type MpElement, Slot } from '@mission-platform/forge';
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
