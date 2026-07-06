import { classNames, h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import sizeStyles from '../size.module.scss';

import styles from './base-skeleton.module.scss';

/** The shape the skeleton placeholder is rendered as. */
export type SkeletonShape = 'line' | 'circle' | 'block';
/** Colour tone of the placeholder — the canonical colour set (`neutral` is the plain grey). */
export type SkeletonVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Size token — canonical 2xs → 2xl scale. */
export type SkeletonSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface SkeletonProperties extends MpProperties {
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
}

/**
 * `BaseSkeleton` — a loading placeholder authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It renders an `aria-hidden` block in one of three shapes (`line`/`circle`/
 * `block`) with an optional shimmer animation, accepting explicit `width`/
 * `height` overrides. It owns its styling through the co-located CSS Module
 * `base-skeleton.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 */
export function BaseSkeleton(properties: SkeletonProperties): MpElement {
  const { shape = 'line', width, height, animated = true, size = 'md', variant = 'neutral' } = properties;

  const className = classNames(
    styles['base-skeleton'],
    styles[`base-skeleton--${shape}`],
    styles[`base-skeleton--${variant}`],
    sizeStyles[`base-size--${size}`],
    {
      [styles['base-skeleton--animated']]: animated,
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
      classNames={className}
      style={style}
      aria-hidden="true"
    />
  );
}
