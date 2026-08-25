import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';

import styles from './forge-skeleton.module.scss';

/** The shape the skeleton placeholder is rendered as. */
export type SkeletonShape = 'line' | 'circle' | 'block';
/** Colour tone of the placeholder — the canonical colour set (`neutral` is the plain grey). */
export type SkeletonVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Size token — canonical 2xs → 2xl scale. */
export type SkeletonSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface SkeletonStyleProperties {
  readonly 'feedback-skeleton-background-critical'?: string;
  readonly 'feedback-skeleton-background-default'?: string;
  readonly 'feedback-skeleton-background-error'?: string;
  readonly 'feedback-skeleton-background-info'?: string;
  readonly 'feedback-skeleton-background-primary'?: string;
  readonly 'feedback-skeleton-background-secondary'?: string;
  readonly 'feedback-skeleton-background-success'?: string;
  readonly 'feedback-skeleton-background-tertiary'?: string;
  readonly 'feedback-skeleton-background-warning'?: string;
  readonly 'feedback-skeleton-radius-block'?: string;
  readonly 'feedback-skeleton-radius-circle'?: string;
  readonly 'feedback-skeleton-radius-default'?: string;
  readonly 'feedback-skeleton-radius-line'?: string;
  readonly 'feedback-skeleton-shimmer'?: string;
}

export type SkeletonStyle = CSSStyleProperties & {
  readonly '--forge-skeleton-feedback-skeleton-background-critical'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-background-default'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-background-error'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-background-info'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-background-primary'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-background-secondary'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-background-success'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-background-tertiary'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-background-warning'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-radius-block'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-radius-circle'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-radius-default'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-radius-line'?: string | undefined;
  readonly '--forge-skeleton-feedback-skeleton-shimmer'?: string | undefined;
};

function createSkeletonStyle(properties: Readonly<SkeletonStyleProperties> | undefined): SkeletonStyle | undefined {
  return createForgeStyle({
    '--forge-skeleton-feedback-skeleton-background-critical': properties?.['feedback-skeleton-background-critical'],
    '--forge-skeleton-feedback-skeleton-background-default': properties?.['feedback-skeleton-background-default'],
    '--forge-skeleton-feedback-skeleton-background-error': properties?.['feedback-skeleton-background-error'],
    '--forge-skeleton-feedback-skeleton-background-info': properties?.['feedback-skeleton-background-info'],
    '--forge-skeleton-feedback-skeleton-background-primary': properties?.['feedback-skeleton-background-primary'],
    '--forge-skeleton-feedback-skeleton-background-secondary': properties?.['feedback-skeleton-background-secondary'],
    '--forge-skeleton-feedback-skeleton-background-success': properties?.['feedback-skeleton-background-success'],
    '--forge-skeleton-feedback-skeleton-background-tertiary': properties?.['feedback-skeleton-background-tertiary'],
    '--forge-skeleton-feedback-skeleton-background-warning': properties?.['feedback-skeleton-background-warning'],
    '--forge-skeleton-feedback-skeleton-radius-block': properties?.['feedback-skeleton-radius-block'],
    '--forge-skeleton-feedback-skeleton-radius-circle': properties?.['feedback-skeleton-radius-circle'],
    '--forge-skeleton-feedback-skeleton-radius-default': properties?.['feedback-skeleton-radius-default'],
    '--forge-skeleton-feedback-skeleton-radius-line': properties?.['feedback-skeleton-radius-line'],
    '--forge-skeleton-feedback-skeleton-shimmer': properties?.['feedback-skeleton-shimmer'],
  }) as SkeletonStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface SkeletonProperties {
  /** Placeholder shape. Defaults to `'line'`. */
  shape?: SkeletonShape;
  /** Explicit CSS width override (e.g. `'60%'`). */
  width?: string;
  /** Explicit CSS height override (e.g. `'4rem'`). */
  height?: string;
  /** Whether the shimmer animation plays. Defaults to `true`. */
  animated?: boolean;
  /** Size token controlling the intrinsic scale. Defaults to `'md'`. */
  size?: SkeletonSize;
  /** Colour tone of the placeholder. Defaults to `'neutral'`. */
  variant?: SkeletonVariant;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<SkeletonStyleProperties>;
}

/**
 * `ForgeSkeleton` — a loading placeholder authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders an `aria-hidden` block in one of three shapes (`line`/`circle`/
 * `block`) with an optional shimmer animation, accepting explicit `width`/
 * `height` overrides. It owns its styling through the co-located CSS Module
 * `forge-skeleton.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 */
export function ForgeSkeleton(properties: Readonly<SkeletonProperties>): MpElement {
  const propertyStyle = createSkeletonStyle(properties.properties);

  const { shape = 'line', width, height, animated = true, size = 'md', variant = 'neutral' } = properties;

  const className = classNames(
    styles['forge-skeleton'],
    styles[`forge-skeleton--${shape}`],
    styles[`forge-skeleton--${variant}`],
    size ? `forge-size--${size}` : undefined,
    {
      [styles['forge-skeleton--animated']]: animated,
    },
  );

  const style: Record<string, string> = {};
  if (width !== undefined) {
    style.width = width;
  }
  if (height !== undefined) {
    style.height = height;
  }

  return (
    <span
      className={className}
      style={{ ...style, ...propertyStyle }}
      aria-hidden="true"
    />
  );
}
