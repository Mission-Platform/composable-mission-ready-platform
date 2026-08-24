import { classNames, type MpElement } from '@mission-platform/forge';

import styles from './forge-gauge.module.scss';

/** Gauge size. */
export type GaugeSize = 'sm' | 'md' | 'lg';

export interface GaugeProperties {
  /** Current numeric value. */
  value: number;
  /** Minimum numeric value. Defaults to `0`. */
  min?: number;
  /** Maximum numeric value. Defaults to `100`. */
  max?: number;
  /** Gauge size. Defaults to `'md'`. */
  size?: GaugeSize;
  /** Show the rounded percentage beside the label. Defaults to `true`. */
  showValue?: boolean;
  /** Text displayed above the gauge and used as its accessible name. */
  label?: string;
}

const ARC_RADIUS = 45;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;

/**
 * A determinate meter authored in the framework-neutral JSX dialect.
 * Values are clamped to the supplied range and exposed with meter accessibility
 * properties on the circular SVG while the visual fill remains token-driven.
 */
export function ForgeGauge(properties: Readonly<GaugeProperties>): MpElement {
  const { value, min = 0, max = 100, size = 'md', label, showValue = true } = properties;
  const range = max > min ? max - min : 1;
  const clampedValue = Math.min(max, Math.max(min, value));
  const percentage = Math.round(((clampedValue - min) / range) * 100);
  const displayValue = `${percentage}%`;
  const dashOffset = ARC_CIRCUMFERENCE * (1 - percentage / 100);
  const className = classNames(styles['forge-gauge'], styles[`forge-gauge--${size}`]);

  return (
    <div className={className}>
      {label || showValue ? (
        <div className={styles['forge-gauge__header']}>
          {label ? <span className={styles['forge-gauge__label']}>{label}</span> : undefined}
          {showValue ? <span className={styles['forge-gauge__value']}>{displayValue}</span> : undefined}
        </div>
      ) : undefined}
      <div className={styles['forge-gauge__visual']}>
        <svg
          aria-label={label ?? displayValue}
          aria-valuemax={max}
          aria-valuemin={min}
          aria-valuenow={clampedValue}
          className={styles['forge-gauge__svg']}
          viewBox="0 0 100 100"
          role="meter"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className={styles['forge-gauge__track']}
            cx={50}
            cy={50}
            fill="none"
            r={ARC_RADIUS}
            stroke-width={10}
          />
          <circle
            aria-hidden="true"
            className={styles['forge-gauge__arc']}
            cx={50}
            cy={50}
            fill="none"
            r={ARC_RADIUS}
            stroke-dasharray={ARC_CIRCUMFERENCE}
            stroke-dashoffset={dashOffset}
            stroke-width={10}
          />
        </svg>
      </div>
    </div>
  );
}
