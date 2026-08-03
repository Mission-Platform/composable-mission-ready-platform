import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-field-set.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type FieldSetSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface FieldSetProperties extends MpProperties {
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
}

/**
 * `BaseFieldSet` — a semantic grouping container authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * Renders a native `<fieldset>` with an optional `<legend>` and description,
 * giving related controls an accessible label and a consistent frame. It is
 * presentation-only and content-agnostic — pass grouped fields or arbitrary
 * markup through the default slot. Setting `disabled` uses the native
 * `<fieldset disabled>` behaviour. It owns its styling through the co-located
 * CSS Module `base-field-set.module.scss` and composes the neutral
 * {@link BaseTypography} for the legend/description text.
 *
 * Substitutions from the original Vue SFC: the `BaseStack` content wrapper
 * becomes a plain flex `<div>`, and the `legend` named slot is reduced to the
 * `legend` prop (the neutral dialect cannot introspect named-slot presence).
 */
export function BaseFieldSet(properties: Readonly<FieldSetProperties>): MpElement {
  const { legend, description, disabled = false, flush = false, size = 'md' } = properties;

  return (
    <fieldset
      className={[
        styles['base-field-set'],
        sizeStyles[`base-size--${size}`],
        { [styles['base-field-set--flush']]: flush },
      ]}
      disabled={disabled ? true : undefined}
    >
      {legend ? (
        <legend className={styles['base-field-set__legend']}>
          <BaseTypography
            as="span"
            variant="label"
            weight="semibold"
          >
            {legend}
          </BaseTypography>
        </legend>
      ) : undefined}
      {description ? (
        <p className={styles['base-field-set__description']}>
          <BaseTypography
            as="span"
            color="secondary"
            variant="body-sm"
          >
            {description}
          </BaseTypography>
        </p>
      ) : undefined}
      <div className={styles['base-field-set__content']}>{properties.children}</div>
    </fieldset>
  );
}
