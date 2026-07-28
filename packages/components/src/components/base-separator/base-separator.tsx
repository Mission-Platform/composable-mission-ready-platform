import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import sizeStyles from '../size.module.scss';
import spacingStyles from '../spacing.module.scss';

import styles from './base-separator.module.scss';

/** Layout direction of the separator. */
export type SeparatorOrientation = 'horizontal' | 'vertical';
/** Line style. */
export type SeparatorVariant = 'solid' | 'dashed' | 'dotted';
/** Spacing applied as margin around the separator. */
export type SeparatorSpacing = 'none' | 'sm' | 'md' | 'lg' | 'xl';
/** Size token — canonical 2xs → 2xl scale (scales the optional label). */
export type SeparatorSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Named `padding`/`margin` scale; each step maps to a named `--mp-spacing-*` design token. */
export type SpacingScale = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface SeparatorProperties extends MpProperties {
  /** Layout direction. Defaults to `'horizontal'`. */
  orientation?: SeparatorOrientation;
  /** Line style. Defaults to `'solid'`. */
  variant?: SeparatorVariant;
  /** Margin applied along the main axis. Defaults to `'md'`. */
  spacing?: SeparatorSpacing;
  /** When `true`, removes the separator from the accessibility tree. */
  decorative?: boolean;
  /** Size token (scales the optional label). Defaults to `'md'`. */
  size?: SeparatorSize;
  /** Outer margin (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token. Overrides `spacing` when set. */
  margin?: SpacingScale;
  /** Inner padding (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token. */
  padding?: SpacingScale;
}

/**
 * `BaseSeparator` — a visual separator / divider authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * Renders a horizontal or vertical rule (`<hr>`) used to separate groups of
 * content. When default-slot content is provided (horizontal only) it renders
 * a centred label between two lines instead. By default it exposes
 * `role="separator"` with the appropriate `aria-orientation`; set `decorative`
 * to mark it purely presentational (`role="none"`).
 *
 * It owns its styling through the co-located CSS Module
 * `base-separator.module.scss` (carried onto every framework by the two-stage
 * compiler, so the component ships its own `@layer mp.components` CSS). The
 * hashed module class names are assembled with the framework-neutral
 * {@link classNames} helper.
 */
export function BaseSeparator(properties: Readonly<SeparatorProperties>): MpElement {
  const {
    orientation = 'horizontal',
    variant = 'solid',
    spacing = 'md',
    decorative = false,
    size = 'md',
    padding,
    margin,
  } = properties;
  const sizeClass = sizeStyles[`base-size--${size}`];

  const role = decorative ? 'none' : 'separator';
  const hasLabel = orientation === 'horizontal' && properties.children !== undefined;
  // Optional `padding`/`margin` (named `2xs … 2xl` scale) resolve to the shared
  // token-driven spacing classes (a set `margin` overrides `spacing`).
  const paddingClass = padding ? spacingStyles[`base-spacing--padding-${padding}`] : undefined;
  const marginClass = margin ? spacingStyles[`base-spacing--margin-${margin}`] : undefined;

  return hasLabel ? (
    <div
      className={[
        styles['base-separator'],
        styles['base-separator--labelled'],
        styles[`base-separator--${variant}`],
        styles[`base-separator--spacing-${spacing}`],
        sizeClass,
        paddingClass,
        marginClass,
      ]}
      role={role}
      aria-orientation={decorative ? undefined : 'horizontal'}
    >
      <span className={styles['base-separator__line']} />
      <span className={styles['base-separator__label']}>{properties.children}</span>
      <span className={styles['base-separator__line']} />
    </div>
  ) : (
    <hr
      className={[
        styles['base-separator'],
        styles[`base-separator--${orientation}`],
        styles[`base-separator--${variant}`],
        styles[`base-separator--spacing-${spacing}`],
        sizeClass,
        paddingClass,
        marginClass,
      ]}
      role={role}
      aria-orientation={decorative ? undefined : orientation}
    />
  );
}
