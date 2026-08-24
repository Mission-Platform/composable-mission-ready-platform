import { classNames, type MpElement, useEffect, useState } from '@mission-platform/forge';

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
export interface StatsSectionProperties {
  stats: StatItem[];
  title?: string;
  columns?: number;
  animated?: boolean;
  variant?: StatsSectionVariant;
  description?: string;
  ariaLabel?: string;
  animationDuration?: number;
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
