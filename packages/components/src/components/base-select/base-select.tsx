import { IconChevron } from '@mission-platform/icons';
import { h, Slot, useRef, useState, type MpChild, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseDropdown } from '../base-dropdown';
import { BaseTypography } from '../base-typography';
import { nextFieldId } from '../field-id';

import styles from './base-select.module.scss';

/** Canonical control size scale. */
export type SelectSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single selectable option. */
export interface SelectOption {
  /** Visible label text. */
  label: string;
  /** The value chosen when the option is selected. */
  value: string | number;
  /** Disable just this option. */
  disabled?: boolean;
}

export interface SelectProperties extends MpProperties {
  /** Selected value (controlled via `modelValue`). */
  modelValue?: string | number;
  /** The selectable options. */
  options?: SelectOption[];
  /** Control size. Defaults to `'md'`. */
  size?: SelectSize;
  /** Visible label text. */
  label?: string;
  /** Visually hide the label (kept for assistive tech). */
  labelHidden?: boolean;
  /** Helper text shown below the control. */
  hint?: string;
  /** Error message shown below the control (replaces the hint). */
  error?: string;
  /** Placeholder shown when no option is selected. */
  placeholder?: string;
  /** Disable the control. */
  disabled?: boolean;
  /** Mark the field as required (renders a `*` after the label). */
  required?: boolean;
  /** Native form-field `name`, submitted by the hidden native `<select>`. */
  name?: string;
  /** Native `autocomplete` token applied to the hidden native `<select>`. */
  autocomplete?: string;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Fired with the next value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string | number) => void;
  /** Fired with the chosen value whenever the selection changes. */
  onChange?: (value: string | number) => void;
  /** Fired when the trigger loses focus. */
  onBlur?: (event: FocusEvent) => void;
  /** Fired when the control opens / the trigger gains focus. */
  onFocus?: (event: FocusEvent) => void;
}

/**
 * `BaseSelect` — a custom combobox/select authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It renders a button trigger plus a listbox of options, backed by a visually
 * hidden native `<select>` so browser autofill and native form submission keep
 * working. Selection is controlled with the established `modelValue` +
 * `onUpdateModelValue`/`onChange` callback-prop convention. It owns its styling
 * through the co-located CSS Module `base-select.module.scss`.
 *
 * The floating listbox is rendered through the write-once **`BaseDropdown`**
 * (itself compiled to React/Vue), composed via the neutral named-slot **passing**
 * syntax: the combobox wrapper is handed to the dropdown's `trigger` slot
 * (`slot="trigger"`) and the `<ul role="listbox">` becomes its default slot, so
 * the panel is portalled through `<Teleport>` and anchored with CSS Anchor
 * Positioning instead of an in-place absolutely-positioned list. The internal
 * `useState` open flag is kept in sync with the dropdown via its
 * `onUpdateOpen` callback.
 *
 * Other substitutions from the original Vue SFC: the `useId` composable becomes
 * the shared `nextFieldId` helper; the chevron is the write-once
 * `@mission-platform/icons` `IconChevron` (rotated via its `direction` prop,
 * itself compiled to React/Vue); the `useI18n` strings become plain text; and
 * the `v-model` + emits become callback props. The `start`/`end` named slots are
 * preserved as neutral named slots.
 */
export function BaseSelect(properties: SelectProperties): MpElement {
  const {
    modelValue = '',
    options = [],
    size = 'md',
    label,
    labelHidden = false,
    hint,
    error,
    placeholder,
    disabled = false,
    required = false,
    name,
    autocomplete,
  } = properties;

  const idReference = useRef<string>(properties.id ?? nextFieldId('mp-select'));
  const resolvedId = idReference.current;
  const triggerReference = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const selectedOption = options.find((option) => option.value === modelValue);
  const displayLabel = selectedOption ? selectedOption.label : (placeholder ?? '');
  const hasPlaceholder = selectedOption === undefined;

  const openDropdown = (): void => {
    if (disabled) {
      return;
    }
    setIsOpen(true);
    properties.onFocus?.(new FocusEvent('focus'));
  };

  const closeDropdown = (): void => {
    setIsOpen(false);
  };

  const commit = (value: string | number): void => {
    properties.onUpdateModelValue?.(value);
    properties.onChange?.(value);
  };

  const selectOption = (option: SelectOption): void => {
    if (option.disabled) {
      return;
    }
    commit(option.value);
    closeDropdown();
    triggerReference.current?.focus();
  };

  const selectAdjacentOption = (direction: 1 | -1): void => {
    const enabled = options.filter((option) => !option.disabled);
    if (enabled.length === 0) {
      return;
    }
    const currentIndex = enabled.findIndex((option) => option.value === modelValue);
    const nextIndex = Math.max(0, Math.min(enabled.length - 1, currentIndex + direction));
    const next = enabled[nextIndex];
    if (next) {
      commit(next.value);
    }
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (isOpen) {
          closeDropdown();
        } else {
          openDropdown();
        }

        break;
      }
      case 'Escape': {
        closeDropdown();

        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        if (isOpen) {
          selectAdjacentOption(1);
        } else {
          openDropdown();
        }

        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        selectAdjacentOption(-1);

        break;
      }
      // No default
    }
  };

  const handleNativeChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement;
    const matched = options.find((option) => String(option.value) === target.value);
    commit(matched ? matched.value : '');
  };

  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const nativeOptions: MpChild[] = [
    <option
      selected={hasPlaceholder}
      value=""
    >
      {placeholder}
    </option>,
    ...options.map((option) => (
      <option
        key={option.value}
        disabled={option.disabled}
        selected={option.value === modelValue}
        value={option.value}
      >
        {option.label}
      </option>
    )),
  ];

  const listItems: MpChild[] = options.map((option) => (
    <li
      key={option.value}
      aria-disabled={option.disabled || undefined}
      aria-selected={option.value === modelValue}
      classNames={[
        styles['base-select__option'],
        {
          [styles['base-select__option--selected']]: option.value === modelValue,
          [styles['base-select__option--disabled']]: option.disabled,
        },
      ]}
      role="option"
      tabindex={-1}
      onMousedown={(event: MouseEvent) => {
        event.preventDefault();
        selectOption(option);
      }}
    >
      {option.label}
    </li>
  ));
  if (options.length === 0) {
    listItems.push(
      <li
        aria-disabled="true"
        aria-selected="false"
        classNames={styles['base-select__empty']}
        role="option"
        tabindex={-1}
      >
        No options available
      </li>,
    );
  }

  return (
    <div
      classNames={[
        styles['base-select'],
        styles[`base-select--${size}`],
        {
          [styles['base-select--error']]: !!error,
          [styles['base-select--disabled']]: disabled,
          [styles['base-select--open']]: isOpen,
        },
      ]}
    >
      {label ? (
        <label
          id={`${resolvedId}-label`}
          classNames={[
            styles['base-select__label'],
            {
              [styles['base-select__label--hidden']]: labelHidden,
            },
          ]}
          for={resolvedId}
        >
          <BaseTypography
            as="span"
            color="primary"
            variant="label"
          >
            {label}
          </BaseTypography>
          {required ? (
            <span
              aria-hidden="true"
              classNames={styles['base-select__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}
      <select
        id={`${resolvedId}-native`}
        aria-hidden="true"
        autocomplete={autocomplete}
        classNames={styles['base-select__native']}
        disabled={disabled}
        name={name}
        required={required}
        tabindex={-1}
        onChange={handleNativeChange}
      >
        {nativeOptions}
      </select>
      <BaseDropdown
        matchTriggerWidth={true}
        open={isOpen}
        onUpdateOpen={(open: boolean) => setIsOpen(open)}
      >
        <div
          aria-controls={`${resolvedId}-listbox`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-labelledby={label ? `${resolvedId}-label` : undefined}
          aria-required={required || undefined}
          classNames={styles['base-select__wrapper']}
          role="combobox"
          slot="trigger"
        >
          <span classNames={[styles['base-select__extension'], styles['base-select__extension--start']]}>
            <Slot name="start" />
          </span>
          <button
            ref={triggerReference}
            id={resolvedId}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : undefined}
            classNames={[
              styles['base-select__field'],
              {
                [styles['base-select__field--placeholder']]: hasPlaceholder,
              },
            ]}
            disabled={disabled}
            type="button"
            onBlur={(event: FocusEvent) => properties.onBlur?.(event)}
            onClick={() => {
              if (isOpen) {
                closeDropdown();
              } else {
                openDropdown();
              }
            }}
            onKeydown={handleKeydown}
          >
            {displayLabel || '\u00A0'}
          </button>
          <span classNames={[styles['base-select__extension'], styles['base-select__extension--end']]}>
            <Slot name="end" />
          </span>
          <span
            aria-hidden="true"
            classNames={styles['base-select__chevron']}
          >
            <IconChevron
              direction={isOpen ? 'up' : 'down'}
              size="sm"
            />
          </span>
        </div>
        <ul
          id={`${resolvedId}-listbox`}
          aria-labelledby={label ? `${resolvedId}-label` : undefined}
          classNames={styles['base-select__listbox']}
          role="listbox"
        >
          {listItems}
        </ul>
      </BaseDropdown>
      {error ? (
        <p
          id={`${resolvedId}-error`}
          classNames={styles['base-select__error']}
          role="alert"
        >
          <BaseTypography
            as="span"
            color="inherit"
            variant="caption"
          >
            {error}
          </BaseTypography>
        </p>
      ) : hint ? (
        <p
          id={`${resolvedId}-hint`}
          classNames={styles['base-select__hint']}
        >
          <BaseTypography
            as="span"
            color="secondary"
            variant="caption"
          >
            {hint}
          </BaseTypography>
        </p>
      ) : undefined}
    </div>
  );
}
