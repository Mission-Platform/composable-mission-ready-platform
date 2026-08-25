import {
  classNames,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeIconChevron } from '@mission-platform/icons';

import styles from './forge-collapse.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type CollapseSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Colour tone of the disclosure — the canonical colour set (`neutral` is the plain treatment). */
export type CollapseVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface CollapseStyleProperties {
  readonly border?: string;
  readonly 'border-width'?: string;
  readonly 'content-border'?: string;
  readonly 'content-border-width'?: string;
  readonly 'content-padding-block'?: string;
  readonly 'content-padding-inline'?: string;
  readonly 'content-text'?: string;
  readonly 'disabled-border'?: string;
  readonly 'disabled-surface'?: string;
  readonly 'disabled-text'?: string;
  readonly radius?: string;
  readonly 'summary-focus-ring'?: string;
  readonly 'summary-font-weight'?: string;
  readonly 'summary-gap'?: string;
  readonly 'summary-padding-block'?: string;
  readonly 'summary-padding-inline'?: string;
  readonly 'summary-surface-hover'?: string;
  readonly 'summary-text'?: string;
  readonly surface?: string;
  readonly 'tone-disabled-border'?: string;
  readonly 'tone-disabled-text'?: string;
  readonly 'transition-duration'?: string;
  readonly 'transition-easing'?: string;
}

export type CollapseStyle = CSSStyleProperties & {
  readonly '--forge-collapse-border'?: string | undefined;
  readonly '--forge-collapse-border-width'?: string | undefined;
  readonly '--forge-collapse-content-border'?: string | undefined;
  readonly '--forge-collapse-content-border-width'?: string | undefined;
  readonly '--forge-collapse-content-padding-block'?: string | undefined;
  readonly '--forge-collapse-content-padding-inline'?: string | undefined;
  readonly '--forge-collapse-content-text'?: string | undefined;
  readonly '--forge-collapse-disabled-border'?: string | undefined;
  readonly '--forge-collapse-disabled-surface'?: string | undefined;
  readonly '--forge-collapse-disabled-text'?: string | undefined;
  readonly '--forge-collapse-radius'?: string | undefined;
  readonly '--forge-collapse-summary-focus-ring'?: string | undefined;
  readonly '--forge-collapse-summary-font-weight'?: string | undefined;
  readonly '--forge-collapse-summary-gap'?: string | undefined;
  readonly '--forge-collapse-summary-padding-block'?: string | undefined;
  readonly '--forge-collapse-summary-padding-inline'?: string | undefined;
  readonly '--forge-collapse-summary-surface-hover'?: string | undefined;
  readonly '--forge-collapse-summary-text'?: string | undefined;
  readonly '--forge-collapse-surface'?: string | undefined;
  readonly '--forge-collapse-tone-disabled-border'?: string | undefined;
  readonly '--forge-collapse-tone-disabled-text'?: string | undefined;
  readonly '--forge-collapse-transition-duration'?: string | undefined;
  readonly '--forge-collapse-transition-easing'?: string | undefined;
};

function createCollapseStyle(properties: Readonly<CollapseStyleProperties> | undefined): CollapseStyle | undefined {
  return createForgeStyle({
    '--forge-collapse-border': properties?.['border'],
    '--forge-collapse-border-width': properties?.['border-width'],
    '--forge-collapse-content-border': properties?.['content-border'],
    '--forge-collapse-content-border-width': properties?.['content-border-width'],
    '--forge-collapse-content-padding-block': properties?.['content-padding-block'],
    '--forge-collapse-content-padding-inline': properties?.['content-padding-inline'],
    '--forge-collapse-content-text': properties?.['content-text'],
    '--forge-collapse-disabled-border': properties?.['disabled-border'],
    '--forge-collapse-disabled-surface': properties?.['disabled-surface'],
    '--forge-collapse-disabled-text': properties?.['disabled-text'],
    '--forge-collapse-radius': properties?.['radius'],
    '--forge-collapse-summary-focus-ring': properties?.['summary-focus-ring'],
    '--forge-collapse-summary-font-weight': properties?.['summary-font-weight'],
    '--forge-collapse-summary-gap': properties?.['summary-gap'],
    '--forge-collapse-summary-padding-block': properties?.['summary-padding-block'],
    '--forge-collapse-summary-padding-inline': properties?.['summary-padding-inline'],
    '--forge-collapse-summary-surface-hover': properties?.['summary-surface-hover'],
    '--forge-collapse-summary-text': properties?.['summary-text'],
    '--forge-collapse-surface': properties?.['surface'],
    '--forge-collapse-tone-disabled-border': properties?.['tone-disabled-border'],
    '--forge-collapse-tone-disabled-text': properties?.['tone-disabled-text'],
    '--forge-collapse-transition-duration': properties?.['transition-duration'],
    '--forge-collapse-transition-easing': properties?.['transition-easing'],
  }) as CollapseStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface CollapseProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Summary (disclosure trigger) text. Defaults to `'Details'`. */
  summary?: string;
  /** Colour tone of the disclosure. Defaults to `'neutral'`. */
  variant?: CollapseVariant;
  /** Size token controlling the disclosure's scale. Defaults to `'md'`. */
  size?: CollapseSize;
  /** Whether the disclosure starts open. */
  open?: boolean;
  /** Whether the disclosure is non-interactive. */
  disabled?: boolean;
  /** Fired when the disclosure is toggled; receives the new open state. */
  onToggle?: (open: boolean) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<CollapseStyleProperties>;
}

/**
 * `ForgeCollapse` — a native `<details>`-based disclosure authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * The clickable summary text comes from the `summary` prop; the body is the
 * default slot. Toggling fires the `onToggle` callback with the new open state.
 * It owns its styling through the co-located CSS Module
 * `forge-collapse.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 *
 * The original Vue SFC used the `@mission-platform/icons` `ForgeIconChevron`, a
 * `toggle` emit, and a `summary` slot override; the neutral version renders the
 * write-once `@mission-platform/icons` `ForgeIconChevron` rotated purely by the
 * native `[open]` attribute (no JS open-state needed), the cross-framework
 * `onToggle` callback, and a plain `summary` text prop (the slot override is
 * dropped, consistent with how the other migrated components dropped slots that
 * collide with same-named props).
 */
export function ForgeCollapse(properties: Readonly<CollapseProperties>): MpElement {
  const style = createCollapseStyle(properties.properties);

  const { summary = 'Details', open = false, disabled = false, variant = 'neutral', size = 'md' } = properties;

  const className = classNames(
    styles['forge-collapse'],
    styles[`forge-collapse--${variant}`],
    size ? `forge-size--${size}` : undefined,
    {
      [styles['forge-collapse--disabled']]: disabled,
    },
  );

  const handleToggle = (event: Event): void => {
    const target = event.target as HTMLDetailsElement;
    properties.onToggle?.(target.open);
  };

  return (
    <details
      className={className}
      open={open}
      onToggle={handleToggle}
      style={style}
    >
      <summary className={styles['forge-collapse__summary']}>
        <span className={styles['forge-collapse__label']}>{summary}</span>
        <span
          className={styles['forge-collapse__chevron']}
          aria-hidden="true"
        >
          <ForgeIconChevron
            direction="down"
            size="sm"
          />
        </span>
      </summary>
      <div className={styles['forge-collapse__content']}>{properties.children}</div>
    </details>
  );
}
