import { ForgeDropdown } from '@mission-platform/float';
import {
  type ClassValue,
  h,
  hasSlot,
  type MpChild,
  type MpElement,
  Slot,
  useId,
  useState,
} from '@mission-platform/forge';
import { ForgeIconCalendar } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import { ForgeCalendar } from '../forge-calendar';

import styles from './forge-date-input.module.scss';

/** Field size (canonical `2xs … 2xl` scale). */
export type DateInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface DateInputProperties {
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /**
   * Selected ISO date (`YYYY-MM-DD`), controlled via `modelValue`.
   * @model onUpdateModelValue
   */
  modelValue?: string;
  /** Visible label text. */
  label?: string;
  /** Visually hide the label (kept for assistive tech). */
  labelHidden?: boolean;
  /** Helper text shown below the field. */
  hint?: string;
  /** Error message shown below the field (replaces the hint). */
  error?: string;
  /** Disable the field. */
  disabled?: boolean;
  /** Mark the field as required (renders a `*` after the label). */
  required?: boolean;
  /** Placeholder shown when no date is selected. Defaults to `'YYYY-MM-DD'`. */
  placeholder?: string;
  /** Field size. Defaults to `'md'`. */
  size?: DateInputSize;
  /** Earliest selectable ISO date (`YYYY-MM-DD`). */
  min?: string;
  /** Latest selectable ISO date (`YYYY-MM-DD`). */
  max?: string;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Leading extension content (the `start` named slot). */
  start?: MpChild;
  /** Trailing extension content (the `end` named slot). */
  end?: MpChild;
  /** Fired with the next ISO date (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string) => void;
  /** Fired with the next ISO date whenever it changes. */
  onChange?: (value: string) => void;
}

/**
 * `ForgeDateInput` — a date picker authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * A trigger button shows the selected ISO date (or a placeholder) and opens a
 * popover that composes the already-migrated {@link ForgeCalendar} month grid. It
 * owns its styling through the co-located CSS Module `forge-date-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `@floating-ui/vue` popup becomes
 * the write-once {@link ForgeDropdown} (which owns the teleported, CSS-anchored
 * panel plus the outside-click/`Escape` dismissal), replacing `useZIndex`; the
 * inline month grid is delegated to `ForgeCalendar`; the `useId` composable
 * maps to the framework-native `useId` hook; the
 * calendar glyph is the write-once `@mission-platform/icons` `ForgeIconCalendar`
 * (itself compiled to React/Vue); the `start`/`end` regions are authored as
 * named slots (`<Slot>`) with their presence detected through the
 * framework-neutral {@link hasSlot} helper; and the `v-model` + `change` emits
 * become the `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeDateInput(properties: Readonly<DateInputProperties>): MpElement {
  const {
    modelValue = '',
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    required = false,
    placeholder = 'YYYY-MM-DD',
    size = 'md',
    min,
    max,
  } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const [open, setOpen] = useState<boolean>(false);

  const toggleOpen = (): void => {
    if (disabled) {
      return;
    }
    setOpen(!open);
  };

  const handleSelect = (next = ''): void => {
    properties.onUpdateModelValue?.(next);
    properties.onChange?.(next);
    setOpen(false);
  };

  return (
    <div
      aria-disabled={disabled ? 'true' : undefined}
      className={[
        styles['forge-date-input'],
        styles[`forge-date-input--${size}`],
        {
          [styles['forge-date-input--error']]: !!error,
          [styles['forge-date-input--disabled']]: disabled,
        },
        properties.className,
      ]}
    >
      {label ? (
        <label
          className={[
            styles['forge-date-input__label'],
            {
              [styles['forge-date-input__label--hidden']]: labelHidden,
            },
          ]}
          for={resolvedId}
        >
          <ForgeTypography
            as="span"
            color="primary"
            variant="label"
          >
            {label}
          </ForgeTypography>
          {required ? (
            <span
              aria-hidden="true"
              className={styles['forge-date-input__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}

      <ForgeDropdown
        matchTriggerWidth={false}
        maxHeight="min(92vh, 720px)"
        open={open}
        onUpdateOpen={(next: boolean) => setOpen(next)}
      >
        <div
          className={styles['forge-date-input__wrapper']}
          slot="trigger"
        >
          {hasSlot('start') ? (
            <span className={[styles['forge-date-input__extension'], styles['forge-date-input__extension--start']]}>
              <Slot name="start" />
            </span>
          ) : undefined}
          <button
            id={resolvedId}
            aria-describedby={describedBy}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-invalid={error ? 'true' : undefined}
            aria-label={label ?? 'Date picker'}
            className={styles['forge-date-input__trigger']}
            type="button"
            onClick={toggleOpen}
          >
            <span
              className={[
                styles['forge-date-input__value'],
                {
                  [styles['forge-date-input__value--placeholder']]: !modelValue,
                },
              ]}
            >
              {modelValue || placeholder}
            </span>
            <span
              aria-hidden="true"
              className={styles['forge-date-input__icon']}
            >
              <ForgeIconCalendar size="sm" />
            </span>
          </button>
          {hasSlot('end') ? (
            <span className={[styles['forge-date-input__extension'], styles['forge-date-input__extension--end']]}>
              <Slot name="end" />
            </span>
          ) : undefined}
        </div>
        <div
          aria-label={`${label ?? 'Date'} calendar`}
          className={styles['forge-date-input__calendar']}
          role="dialog"
        >
          <ForgeCalendar
            flat
            max={max}
            min={min}
            modelValue={modelValue}
            onUpdateModelValue={handleSelect}
          />
        </div>
      </ForgeDropdown>

      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-date-input__error']}
          role="alert"
        >
          <ForgeTypography
            as="span"
            color="inherit"
            variant="caption"
          >
            {error}
          </ForgeTypography>
        </p>
      ) : hint ? (
        <p
          id={`${resolvedId}-hint`}
          className={styles['forge-date-input__hint']}
        >
          <ForgeTypography
            as="span"
            color="secondary"
            variant="caption"
          >
            {hint}
          </ForgeTypography>
        </p>
      ) : undefined}
    </div>
  );
}
