import {
  createForgeStyle,
  type ClassValue,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-field-set.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type FieldSetSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface FieldSetStyleProperties {
  readonly border?: string;
  readonly 'border-width'?: string;
  readonly 'content-gap'?: string;
  readonly 'description-margin'?: string;
  readonly 'legend-padding'?: string;
  readonly padding?: string;
  readonly radius?: string;
  readonly surface?: string;
}

export type FieldSetStyle = CSSStyleProperties & {
  readonly '--forge-field-set-border'?: string | undefined;
  readonly '--forge-field-set-border-width'?: string | undefined;
  readonly '--forge-field-set-content-gap'?: string | undefined;
  readonly '--forge-field-set-description-margin'?: string | undefined;
  readonly '--forge-field-set-legend-padding'?: string | undefined;
  readonly '--forge-field-set-padding'?: string | undefined;
  readonly '--forge-field-set-radius'?: string | undefined;
  readonly '--forge-field-set-surface'?: string | undefined;
};

function createFieldSetStyle(properties: Readonly<FieldSetStyleProperties> | undefined): FieldSetStyle | undefined {
  return createForgeStyle({
    '--forge-field-set-border': properties?.['border'],
    '--forge-field-set-border-width': properties?.['border-width'],
    '--forge-field-set-content-gap': properties?.['content-gap'],
    '--forge-field-set-description-margin': properties?.['description-margin'],
    '--forge-field-set-legend-padding': properties?.['legend-padding'],
    '--forge-field-set-padding': properties?.['padding'],
    '--forge-field-set-radius': properties?.['radius'],
    '--forge-field-set-surface': properties?.['surface'],
  }) as FieldSetStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface FieldSetProperties {
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Legend text labelling the group. */
  legend?: string;
  /** Supporting description shown beneath the legend. */
  description?: string;
  /** Disable every form control nested in the group (native `<fieldset disabled>`). */
  disabled?: boolean;
  /** Drop the border/background frame for a borderless group. */
  flush?: boolean;
  /** Size token controlling the group's scale. Defaults to `'md'`. */
  size?: FieldSetSize;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<FieldSetStyleProperties>;
}

/**
 * `ForgeFieldSet` — a semantic grouping container authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * Renders a native `<fieldset>` with an optional `<legend>` and description,
 * giving related controls an accessible label and a consistent frame. It is
 * presentation-only and content-agnostic — pass grouped fields or arbitrary
 * markup through the default slot. Setting `disabled` uses the native
 * `<fieldset disabled>` behaviour. It owns its styling through the co-located
 * CSS Module `forge-field-set.module.scss` and composes the neutral
 * {@link ForgeTypography} for the legend/description text.
 *
 * Substitutions from the original Vue SFC: the `ForgeStack` content wrapper
 * becomes a plain flex `<div>`, and the `legend` named slot is reduced to the
 * `legend` prop (the neutral dialect cannot introspect named-slot presence).
 */
export function ForgeFieldSet(properties: Readonly<FieldSetProperties>): MpElement {
  const style = createFieldSetStyle(properties.properties);

  const { legend, description, disabled = false, flush = false, size = 'md' } = properties;

  return (
    <fieldset
      className={[
        styles['forge-field-set'],
        size ? `forge-size--${size}` : undefined,
        { [styles['forge-field-set--flush']]: flush },
        properties.className,
      ]}
      disabled={disabled ? true : undefined}
      style={style}
    >
      {legend ? (
        <legend className={styles['forge-field-set__legend']}>
          <ForgeTypography
            as="span"
            variant="label"
            weight="semibold"
          >
            {legend}
          </ForgeTypography>
        </legend>
      ) : undefined}
      {description ? (
        <p className={styles['forge-field-set__description']}>
          <ForgeTypography
            as="span"
            color="secondary"
            variant="body-sm"
          >
            {description}
          </ForgeTypography>
        </p>
      ) : undefined}
      <div className={styles['forge-field-set__content']}>{properties.children}</div>
    </fieldset>
  );
}
