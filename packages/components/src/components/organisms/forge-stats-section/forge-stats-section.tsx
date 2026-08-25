import {
  classNames,
  useEffect,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import styles from './forge-stats-section.module.scss';

export interface StatItem {
  id?: string;
  value: string | number;
  label: string;
  icon?: string;
  prefix?: string;
  suffix?: string;
  detail?: string;
}
export type StatsSectionVariant = 'default' | 'cards' | 'minimal';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface StatsSectionStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-text-tertiary'?: string;
  readonly 'duration-fast'?: string;
  readonly 'easing-standard'?: string;
  readonly 'font-size-2xl'?: string;
  readonly 'font-size-4xl'?: string;
  readonly 'font-weight-bold'?: string;
  readonly 'radius-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-6'?: string;
  readonly 'spacing-8'?: string;
}

export type StatsSectionStyle = CSSStyleProperties & {
  readonly '--forge-stats-section-border-width-thick'?: string | undefined;
  readonly '--forge-stats-section-border-width-thin'?: string | undefined;
  readonly '--forge-stats-section-color-border-default'?: string | undefined;
  readonly '--forge-stats-section-color-primary-default'?: string | undefined;
  readonly '--forge-stats-section-color-text-tertiary'?: string | undefined;
  readonly '--forge-stats-section-duration-fast'?: string | undefined;
  readonly '--forge-stats-section-easing-standard'?: string | undefined;
  readonly '--forge-stats-section-font-size-2xl'?: string | undefined;
  readonly '--forge-stats-section-font-size-4xl'?: string | undefined;
  readonly '--forge-stats-section-font-weight-bold'?: string | undefined;
  readonly '--forge-stats-section-radius-md'?: string | undefined;
  readonly '--forge-stats-section-spacing-1'?: string | undefined;
  readonly '--forge-stats-section-spacing-3'?: string | undefined;
  readonly '--forge-stats-section-spacing-4'?: string | undefined;
  readonly '--forge-stats-section-spacing-6'?: string | undefined;
  readonly '--forge-stats-section-spacing-8'?: string | undefined;
};

function createStatsSectionStyle(
  properties: Readonly<StatsSectionStyleProperties> | undefined,
): StatsSectionStyle | undefined {
  return createForgeStyle({
    '--forge-stats-section-border-width-thick': properties?.['border-width-thick'],
    '--forge-stats-section-border-width-thin': properties?.['border-width-thin'],
    '--forge-stats-section-color-border-default': properties?.['color-border-default'],
    '--forge-stats-section-color-primary-default': properties?.['color-primary-default'],
    '--forge-stats-section-color-text-tertiary': properties?.['color-text-tertiary'],
    '--forge-stats-section-duration-fast': properties?.['duration-fast'],
    '--forge-stats-section-easing-standard': properties?.['easing-standard'],
    '--forge-stats-section-font-size-2xl': properties?.['font-size-2xl'],
    '--forge-stats-section-font-size-4xl': properties?.['font-size-4xl'],
    '--forge-stats-section-font-weight-bold': properties?.['font-weight-bold'],
    '--forge-stats-section-radius-md': properties?.['radius-md'],
    '--forge-stats-section-spacing-1': properties?.['spacing-1'],
    '--forge-stats-section-spacing-3': properties?.['spacing-3'],
    '--forge-stats-section-spacing-4': properties?.['spacing-4'],
    '--forge-stats-section-spacing-6': properties?.['spacing-6'],
    '--forge-stats-section-spacing-8': properties?.['spacing-8'],
  }) as StatsSectionStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface StatsSectionProperties {
  stats: StatItem[];
  title?: string;
  columns?: number;
  animated?: boolean;
  variant?: StatsSectionVariant;
  description?: string;
  ariaLabel?: string;
  animationDuration?: number;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<StatsSectionStyleProperties>;
}

interface NumericValue {
  prefix: string;
  number: number;
  suffix: string;
  decimals: number;
}

function parseNumericValue(value: string | number): NumericValue | undefined {
  if (typeof value === 'number')
    return { prefix: '', number: value, suffix: '', decimals: Number.isInteger(value) ? 0 : 2 };
  const match = value.match(/^(\D*)([-+]?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return undefined;
  const numberText = match[2];
  return {
    prefix: match[1],
    number: Number(numberText),
    suffix: match[3],
    decimals: numberText.includes('.') ? numberText.length - numberText.indexOf('.') - 1 : 0,
  };
}

function formatNumericValue(value: NumericValue, number: number): string | number {
  const formatted = value.decimals > 0 ? number.toFixed(value.decimals) : Math.round(number).toString();
  return `${value.prefix}${formatted}${value.suffix}`;
}

export function ForgeStatsSection(properties: Readonly<StatsSectionProperties>): MpElement {
  const style = createStatsSectionStyle(properties.properties);

  const {
    title,
    description,
    stats,
    ariaLabel,
    animated = true,
    animationDuration = 1200,
    columns = 3,
    variant = 'default',
  } = properties;
  const resolvedAriaLabel = ariaLabel ?? title ?? 'Statistics';
  const [animatedValues, setAnimatedValues] = useState<Record<string, string | number>>({});
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (globalThis.window === undefined || typeof globalThis.matchMedia !== 'function') return;
    const query = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!animated || reducedMotion || typeof requestAnimationFrame !== 'function') return;
    const numericStats = stats
      .map((stat, index) => ({ stat, id: stat.id ?? `${stat.label}-${index}`, numeric: parseNumericValue(stat.value) }))
      .filter((entry): entry is { stat: StatItem; id: string; numeric: NumericValue } => entry.numeric !== undefined);
    if (numericStats.length === 0) return;
    let frame = 0;
    const startedAt = typeof performance === 'undefined' ? Date.now() : performance.now();
    const tick = (now: number): void => {
      const progress = Math.min(1, Math.max(0, (now - startedAt) / Math.max(1, animationDuration)));
      const nextValues: Record<string, string | number> = {};
      for (const { id, numeric } of numericStats) {
        nextValues[id] = formatNumericValue(numeric, numeric.number * progress);
      }
      setAnimatedValues(nextValues);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animated, animationDuration, reducedMotion, stats]);

  const columnCount = Math.max(1, Math.floor(columns));
  return (
    <section
      className={classNames(styles['forge-stats-section'], styles[`forge-stats-section--${variant}`], {
        [styles['forge-stats-section--animated']]: animated && !reducedMotion,
      })}
      aria-label={resolvedAriaLabel}
      style={style}
    >
      {title ? <h2>{title}</h2> : undefined}
      {description ? <p className={styles['forge-stats-section__description']}>{description}</p> : undefined}
      <dl
        className={styles['forge-stats-section__grid']}
        style={{ '--forge-stats-columns': columnCount } as Record<string, number>}
      >
        {stats.map((stat, index) => {
          const id = stat.id ?? `${stat.label}-${index}`;
          return (
            <div key={id}>
              {stat.icon ? <span aria-hidden="true">{stat.icon}</span> : undefined}
              <dt>{stat.label}</dt>
              <dd>
                {animatedValues[id] ?? stat.prefix}
                {animatedValues[id] === undefined && typeof stat.value === 'number' ? stat.value : undefined}
                {animatedValues[id] === undefined && typeof stat.value === 'string' ? stat.value : undefined}
                {animatedValues[id] === undefined ? stat.suffix : undefined}
              </dd>
              {stat.detail ? <small>{stat.detail}</small> : undefined}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
