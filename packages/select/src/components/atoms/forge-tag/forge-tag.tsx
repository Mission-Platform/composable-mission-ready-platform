import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';
import { ForgeIconClose } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-tag.module.scss';

/** Canonical 2xs → 2xl size scale. */
export type TagSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Tone of the tag. */
export type TagVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface TagStyleProperties {
  readonly 'border-width-focus'?: string;
  readonly 'critical-background'?: string;
  readonly 'critical-text'?: string;
  readonly 'disabled-background'?: string;
  readonly 'disabled-text'?: string;
  readonly 'error-background'?: string;
  readonly 'error-text'?: string;
  readonly 'font-family'?: string;
  readonly gap?: string;
  readonly 'info-background'?: string;
  readonly 'info-text'?: string;
  readonly 'line-height'?: string;
  readonly 'neutral-background'?: string;
  readonly 'neutral-text'?: string;
  readonly 'primary-background'?: string;
  readonly 'primary-text'?: string;
  readonly radius?: string;
  readonly 'remove-hover-opacity'?: string;
  readonly 'secondary-background'?: string;
  readonly 'secondary-text'?: string;
  readonly 'size-2xl-font-size'?: string;
  readonly 'size-2xl-padding-block'?: string;
  readonly 'size-2xl-padding-inline'?: string;
  readonly 'size-2xs-font-size'?: string;
  readonly 'size-2xs-padding-block'?: string;
  readonly 'size-2xs-padding-inline'?: string;
  readonly 'size-lg-font-size'?: string;
  readonly 'size-lg-padding-block'?: string;
  readonly 'size-lg-padding-inline'?: string;
  readonly 'size-md-font-size'?: string;
  readonly 'size-md-padding-block'?: string;
  readonly 'size-md-padding-inline'?: string;
  readonly 'size-sm-font-size'?: string;
  readonly 'size-sm-padding-block'?: string;
  readonly 'size-sm-padding-inline'?: string;
  readonly 'size-xl-font-size'?: string;
  readonly 'size-xl-padding-block'?: string;
  readonly 'size-xl-padding-inline'?: string;
  readonly 'size-xs-font-size'?: string;
  readonly 'size-xs-padding-block'?: string;
  readonly 'size-xs-padding-inline'?: string;
  readonly 'success-background'?: string;
  readonly 'success-text'?: string;
  readonly 'tertiary-background'?: string;
  readonly 'tertiary-text'?: string;
  readonly 'warning-background'?: string;
  readonly 'warning-text'?: string;
}

export type TagStyle = CSSStyleProperties & {
  readonly '--forge-tag-border-width-focus'?: string | undefined;
  readonly '--forge-tag-critical-background'?: string | undefined;
  readonly '--forge-tag-critical-text'?: string | undefined;
  readonly '--forge-tag-disabled-background'?: string | undefined;
  readonly '--forge-tag-disabled-text'?: string | undefined;
  readonly '--forge-tag-error-background'?: string | undefined;
  readonly '--forge-tag-error-text'?: string | undefined;
  readonly '--forge-tag-font-family'?: string | undefined;
  readonly '--forge-tag-gap'?: string | undefined;
  readonly '--forge-tag-info-background'?: string | undefined;
  readonly '--forge-tag-info-text'?: string | undefined;
  readonly '--forge-tag-line-height'?: string | undefined;
  readonly '--forge-tag-neutral-background'?: string | undefined;
  readonly '--forge-tag-neutral-text'?: string | undefined;
  readonly '--forge-tag-primary-background'?: string | undefined;
  readonly '--forge-tag-primary-text'?: string | undefined;
  readonly '--forge-tag-radius'?: string | undefined;
  readonly '--forge-tag-remove-hover-opacity'?: string | undefined;
  readonly '--forge-tag-secondary-background'?: string | undefined;
  readonly '--forge-tag-secondary-text'?: string | undefined;
  readonly '--forge-tag-size-2xl-font-size'?: string | undefined;
  readonly '--forge-tag-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-tag-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-tag-size-2xs-font-size'?: string | undefined;
  readonly '--forge-tag-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-tag-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-tag-size-lg-font-size'?: string | undefined;
  readonly '--forge-tag-size-lg-padding-block'?: string | undefined;
  readonly '--forge-tag-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-tag-size-md-font-size'?: string | undefined;
  readonly '--forge-tag-size-md-padding-block'?: string | undefined;
  readonly '--forge-tag-size-md-padding-inline'?: string | undefined;
  readonly '--forge-tag-size-sm-font-size'?: string | undefined;
  readonly '--forge-tag-size-sm-padding-block'?: string | undefined;
  readonly '--forge-tag-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-tag-size-xl-font-size'?: string | undefined;
  readonly '--forge-tag-size-xl-padding-block'?: string | undefined;
  readonly '--forge-tag-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-tag-size-xs-font-size'?: string | undefined;
  readonly '--forge-tag-size-xs-padding-block'?: string | undefined;
  readonly '--forge-tag-size-xs-padding-inline'?: string | undefined;
  readonly '--forge-tag-success-background'?: string | undefined;
  readonly '--forge-tag-success-text'?: string | undefined;
  readonly '--forge-tag-tertiary-background'?: string | undefined;
  readonly '--forge-tag-tertiary-text'?: string | undefined;
  readonly '--forge-tag-warning-background'?: string | undefined;
  readonly '--forge-tag-warning-text'?: string | undefined;
};

function createTagStyle(properties: Readonly<TagStyleProperties> | undefined): TagStyle | undefined {
  return createForgeStyle({
    '--forge-tag-border-width-focus': properties?.['border-width-focus'],
    '--forge-tag-critical-background': properties?.['critical-background'],
    '--forge-tag-critical-text': properties?.['critical-text'],
    '--forge-tag-disabled-background': properties?.['disabled-background'],
    '--forge-tag-disabled-text': properties?.['disabled-text'],
    '--forge-tag-error-background': properties?.['error-background'],
    '--forge-tag-error-text': properties?.['error-text'],
    '--forge-tag-font-family': properties?.['font-family'],
    '--forge-tag-gap': properties?.['gap'],
    '--forge-tag-info-background': properties?.['info-background'],
    '--forge-tag-info-text': properties?.['info-text'],
    '--forge-tag-line-height': properties?.['line-height'],
    '--forge-tag-neutral-background': properties?.['neutral-background'],
    '--forge-tag-neutral-text': properties?.['neutral-text'],
    '--forge-tag-primary-background': properties?.['primary-background'],
    '--forge-tag-primary-text': properties?.['primary-text'],
    '--forge-tag-radius': properties?.['radius'],
    '--forge-tag-remove-hover-opacity': properties?.['remove-hover-opacity'],
    '--forge-tag-secondary-background': properties?.['secondary-background'],
    '--forge-tag-secondary-text': properties?.['secondary-text'],
    '--forge-tag-size-2xl-font-size': properties?.['size-2xl-font-size'],
    '--forge-tag-size-2xl-padding-block': properties?.['size-2xl-padding-block'],
    '--forge-tag-size-2xl-padding-inline': properties?.['size-2xl-padding-inline'],
    '--forge-tag-size-2xs-font-size': properties?.['size-2xs-font-size'],
    '--forge-tag-size-2xs-padding-block': properties?.['size-2xs-padding-block'],
    '--forge-tag-size-2xs-padding-inline': properties?.['size-2xs-padding-inline'],
    '--forge-tag-size-lg-font-size': properties?.['size-lg-font-size'],
    '--forge-tag-size-lg-padding-block': properties?.['size-lg-padding-block'],
    '--forge-tag-size-lg-padding-inline': properties?.['size-lg-padding-inline'],
    '--forge-tag-size-md-font-size': properties?.['size-md-font-size'],
    '--forge-tag-size-md-padding-block': properties?.['size-md-padding-block'],
    '--forge-tag-size-md-padding-inline': properties?.['size-md-padding-inline'],
    '--forge-tag-size-sm-font-size': properties?.['size-sm-font-size'],
    '--forge-tag-size-sm-padding-block': properties?.['size-sm-padding-block'],
    '--forge-tag-size-sm-padding-inline': properties?.['size-sm-padding-inline'],
    '--forge-tag-size-xl-font-size': properties?.['size-xl-font-size'],
    '--forge-tag-size-xl-padding-block': properties?.['size-xl-padding-block'],
    '--forge-tag-size-xl-padding-inline': properties?.['size-xl-padding-inline'],
    '--forge-tag-size-xs-font-size': properties?.['size-xs-font-size'],
    '--forge-tag-size-xs-padding-block': properties?.['size-xs-padding-block'],
    '--forge-tag-size-xs-padding-inline': properties?.['size-xs-padding-inline'],
    '--forge-tag-success-background': properties?.['success-background'],
    '--forge-tag-success-text': properties?.['success-text'],
    '--forge-tag-tertiary-background': properties?.['tertiary-background'],
    '--forge-tag-tertiary-text': properties?.['tertiary-text'],
    '--forge-tag-warning-background': properties?.['warning-background'],
    '--forge-tag-warning-text': properties?.['warning-text'],
  }) as TagStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface TagProperties {
  /** The tag's text. */
  label: string;
  /** Size token. Defaults to `'md'`. */
  size?: TagSize;
  /** Tone. Defaults to `'neutral'`. */
  variant?: TagVariant;
  /** Whether the tag is non-interactive/dimmed. */
  disabled?: boolean;
  /** When `true`, renders a remove (×) button that fires `onRemove`. */
  removable?: boolean;
  /** Fired when the remove button is activated. */
  onRemove?: () => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<TagStyleProperties>;
}

/**
 * `ForgeTag` — a compact, rounded label authored once in the neutral JSX dialect
 * and compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * It renders its `label` (via the composed neutral {@link ForgeTypography}) with
 * a tone/size, and — when `removable` and not `disabled` — a remove button that
 * fires the `onRemove` callback. It owns its styling through the co-located CSS
 * Module `forge-tag.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 *
 * The remove button renders the write-once `@mission-platform/icons`
 * `ForgeIconClose` (itself compiled to React/Vue) and fires the cross-framework
 * callback-prop `onRemove` (the Vue `remove` emit substitute).
 */
export function ForgeTag(properties: Readonly<TagProperties>): MpElement {
  const style = createTagStyle(properties.properties);

  const { label, size = 'md', variant = 'neutral', disabled = false, removable = false } = properties;

  const className = classNames(styles['forge-tag'], styles[`forge-tag--${size}`], styles[`forge-tag--${variant}`], {
    [styles['forge-tag--disabled']]: disabled,
  });

  const handleRemove = (): void => {
    properties.onRemove?.();
  };

  return (
    <span
      className={className}
      style={style}
    >
      <span className={styles['forge-tag__label']}>
        <ForgeTypography
          as="span"
          color="inherit"
          variant="caption"
          weight="medium"
        >
          {label}
        </ForgeTypography>
      </span>
      {removable && !disabled ? (
        <button
          className={styles['forge-tag__remove']}
          type="button"
          aria-label={`Remove ${label}`}
          onClick={handleRemove}
        >
          <ForgeIconClose size="2xs" />
        </button>
      ) : undefined}
    </span>
  );
}
