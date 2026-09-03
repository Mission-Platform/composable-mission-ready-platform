import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';

import styles from './forge-gauge.module.scss';

/** Gauge size. */
export type GaugeSize = 'sm' | 'md' | 'lg';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface GaugeStyleProperties {
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'feedback-gauge-fill'?: string;
  readonly 'feedback-gauge-gap'?: string;
  readonly 'feedback-gauge-label-font-size'?: string;
  readonly 'feedback-gauge-label-gap'?: string;
  readonly 'feedback-gauge-max-size'?: string;
  readonly 'feedback-gauge-track'?: string;
  readonly 'feedback-gauge-transition-duration'?: string;
  readonly 'feedback-gauge-transition-easing'?: string;
  readonly 'font-family-sans'?: string;
  readonly 'font-weight-medium'?: string;
  readonly 'line-height-tight'?: string;
  readonly 'size-lg'?: string;
  readonly 'size-md'?: string;
  readonly 'size-sm'?: string;
}

export type GaugeStyle = CSSStyleProperties & {
  readonly '--forge-gauge-color-text-primary'?: string | undefined;
  readonly '--forge-gauge-color-text-secondary'?: string | undefined;
  readonly '--forge-gauge-feedback-gauge-fill'?: string | undefined;
  readonly '--forge-gauge-feedback-gauge-gap'?: string | undefined;
  readonly '--forge-gauge-feedback-gauge-label-font-size'?: string | undefined;
  readonly '--forge-gauge-feedback-gauge-label-gap'?: string | undefined;
  readonly '--forge-gauge-feedback-gauge-max-size'?: string | undefined;
  readonly '--forge-gauge-feedback-gauge-track'?: string | undefined;
  readonly '--forge-gauge-feedback-gauge-transition-duration'?: string | undefined;
  readonly '--forge-gauge-feedback-gauge-transition-easing'?: string | undefined;
  readonly '--forge-gauge-font-family-sans'?: string | undefined;
  readonly '--forge-gauge-font-weight-medium'?: string | undefined;
  readonly '--forge-gauge-line-height-tight'?: string | undefined;
  readonly '--forge-gauge-size-lg'?: string | undefined;
  readonly '--forge-gauge-size-md'?: string | undefined;
  readonly '--forge-gauge-size-sm'?: string | undefined;
};

function createGaugeStyle(properties: Readonly<GaugeStyleProperties> | undefined): GaugeStyle | undefined {
  return createForgeStyle({
    '--forge-gauge-color-text-primary': properties?.['color-text-primary'],
    '--forge-gauge-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-gauge-feedback-gauge-fill': properties?.['feedback-gauge-fill'],
    '--forge-gauge-feedback-gauge-gap': properties?.['feedback-gauge-gap'],
    '--forge-gauge-feedback-gauge-label-font-size': properties?.['feedback-gauge-label-font-size'],
    '--forge-gauge-feedback-gauge-label-gap': properties?.['feedback-gauge-label-gap'],
    '--forge-gauge-feedback-gauge-max-size': properties?.['feedback-gauge-max-size'],
    '--forge-gauge-feedback-gauge-track': properties?.['feedback-gauge-track'],
    '--forge-gauge-feedback-gauge-transition-duration': properties?.['feedback-gauge-transition-duration'],
    '--forge-gauge-feedback-gauge-transition-easing': properties?.['feedback-gauge-transition-easing'],
    '--forge-gauge-font-family-sans': properties?.['font-family-sans'],
    '--forge-gauge-font-weight-medium': properties?.['font-weight-medium'],
    '--forge-gauge-line-height-tight': properties?.['line-height-tight'],
    '--forge-gauge-size-lg': properties?.['size-lg'],
    '--forge-gauge-size-md': properties?.['size-md'],
    '--forge-gauge-size-sm': properties?.['size-sm'],
  }) as GaugeStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<GaugeStyleProperties>;
}

const ARC_RADIUS = 45;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;

/**
 * A determinate meter authored in the framework-neutral JSX dialect.
 * Values are clamped to the supplied range and exposed with meter accessibility
 * properties on the circular SVG while the visual fill remains token-driven.
 */
export function ForgeGauge(properties: Readonly<GaugeProperties>): MpElement {
  const style = createGaugeStyle(properties.properties);

  const { value, min = 0, max = 100, size = 'md', label, showValue = true } = properties;
  const range = max > min ? max - min : 1;
  const clampedValue = Math.min(max, Math.max(min, value));
  const percentage = Math.round(((clampedValue - min) / range) * 100);
  const displayValue = `${percentage}%`;
  const dashOffset = ARC_CIRCUMFERENCE * (1 - percentage / 100);
  const className = classNames(styles['forge-gauge'], styles[`forge-gauge--${size}`]);

  return (
    <div
      className={className}
      style={style}
    >
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
