import { ForgeTag, ForgeTypography, ForgeDropdown } from '@mission-platform/components';
import { type ClassValue, h, type MpChild, type MpElement, Slot, useId, useState } from '@mission-platform/forge';
import { ForgeIconChevron } from '@mission-platform/icons';

import styles from './forge-multiselect.module.scss';

/** Canonical control size scale. */
export type MultiselectSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single selectable option. */
export interface MultiselectOption {
  /** Visible label text. */
  label: string;
  /** The value toggled when the option is selected. */
  value: string | number;
  /** Disable just this option. */
  disabled?: boolean;
}

export interface MultiselectProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /**
   * Selected values (controlled via `modelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: (string | number)[];
  /** The selectable options. */
  options?: MultiselectOption[];
  /** Control size. Defaults to `'md'`. */
  size?: MultiselectSize;
  /** Visible label text. */
  label?: string;
  /** Visually hide the label (kept for assistive tech). */
  labelHidden?: boolean;
  /** Helper text shown below the control. */
  hint?: string;
  /** Error message shown below the control (replaces the hint). */
  error?: string;
  /** Placeholder shown in the search input when nothing is selected. */
  placeholder?: string;
  /** Disable the control. */
  disabled?: boolean;
  /** Mark the field as required (renders a `*` after the label). */
  required?: boolean;
  /** Native form-field `name`, submitted by the hidden native `<select multiple>`. */
  name?: string;
  /** Native `autocomplete` token applied to the hidden native `<select multiple>`. */
  autocomplete?: string;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Fired with the next selection (the controlled `v-model` update). */
  onUpdateModelValue?: (value: (string | number)[]) => void;
  /** Fired with the selection whenever it changes. */
  onChange?: (value: (string | number)[]) => void;
}

/**
 * `ForgeMultiselect` — a tag-based multi-select combobox with a search field,
 * authored once in the neutral JSX dialect and compiled straight to React or
 * Vue by `@mission-platform/vite-plugin-forge`.
 *
 * Selected values render as removable {@link ForgeTag} chips; an inline search
 * input filters the remaining options shown in the listbox. Selection is
 * controlled with the established `modelValue` (a `(string | number)[]`) +
 * `onUpdateModelValue`/`onChange` callback-prop convention, and a visually
 * hidden native `<select multiple>` keeps autofill/native submission working.
 * It owns its styling through the co-located CSS Module
 * `forge-multiselect.module.scss`.
 *
 * The filtered listbox is rendered through the write-once **`ForgeDropdown`**
 * (itself compiled to React/Vue), composed via the neutral named-slot **passing**
 * syntax: the tag/search combobox is handed to the dropdown's `trigger` slot
 * (`slot="trigger"`) and the `<ul role="listbox">` becomes its default slot, so
 * the panel is portalled through `<Teleport>` and anchored with CSS Anchor
 * Positioning instead of an in-place list. The internal `useState` open flag is
 * kept in sync with the dropdown via its `onUpdateOpen` callback.
 *
 * Other substitutions from the original Vue SFC: the search query becomes an
 * internal `useState` string; the `useId` composable maps to the
 * framework-native `useId` hook; the chevron is the write-once `@mission-platform/icons`
 * `ForgeIconChevron` (rotated via its `direction` prop, itself compiled to
 * React/Vue); the `useI18n` strings become plain text; and the `v-model` + emits
 * become callback props.
 */
export function ForgeMultiselect(properties: Readonly<MultiselectProperties>): MpElement {
  const {
    modelValue = [],
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

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedValueSet = new Set<string | number>(modelValue);
  const selectedOptions = options.filter((option) => selectedValueSet.has(option.value));
  const availableOptions = options.filter((option) => {
    const notSelected = !selectedValueSet.has(option.value);
    const matchesSearch = !searchQuery || option.label.toLowerCase().includes(searchQuery.toLowerCase());
    return notSelected && matchesSearch;
  });

  const commit = (next: (string | number)[]): void => {
    properties.onUpdateModelValue?.(next);
    properties.onChange?.(next);
  };

  const selectOption = (option: MultiselectOption): void => {
    if (option.disabled) {
      return;
    }
    commit([...modelValue, option.value]);
    setSearchQuery('');
  };

  const removeOption = (value: string | number): void => {
    commit(modelValue.filter((entry) => entry !== value));
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (event.key === 'Backspace' && !searchQuery && selectedOptions.length > 0) {
      const last = selectedOptions.at(-1);
      if (last) {
        removeOption(last.value);
      }
    }
  };

  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const nativeOptions: MpChild[] = options.map((option) => (
    <option
      key={option.value}
      disabled={option.disabled}
      selected={selectedValueSet.has(option.value)}
      value={option.value}
    >
      {option.label}
    </option>
  ));

  const tagChips: MpChild[] = selectedOptions.map((option) => (
    <ForgeTag
      key={option.value}
      disabled={disabled}
      label={option.label}
      removable
      size={size === 'lg' ? 'md' : 'sm'}
      variant="primary"
      onRemove={() => removeOption(option.value)}
    />
  ));
  tagChips.push(
    <input
      id={resolvedId}
      aria-autocomplete="list"
      aria-controls={`${resolvedId}-listbox`}
      aria-describedby={describedBy}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-invalid={error ? 'true' : undefined}
      autocomplete="off"
      className={styles['forge-multiselect__input']}
      disabled={disabled}
      placeholder={selectedOptions.length === 0 ? (placeholder ?? 'Select options…') : undefined}
      required={required ? modelValue.length === 0 : false}
      role="combobox"
      type="text"
      value={searchQuery}
      onFocus={() => setIsOpen(true)}
      onInput={(event: Event) => setSearchQuery((event.target as HTMLInputElement).value)}
      onKeydown={handleKeydown}
    />,
  );

  const listItems: MpChild[] = availableOptions.map((option) => (
    <li
      key={option.value}
      aria-disabled={option.disabled || undefined}
      aria-selected="false"
      className={[
        styles['forge-multiselect__option'],
        {
          [styles['forge-multiselect__option--disabled']]: option.disabled,
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
  if (availableOptions.length === 0) {
    listItems.push(
      <li
        aria-disabled="true"
        aria-selected="false"
        className={styles['forge-multiselect__empty']}
        role="option"
        tabindex={-1}
      >
        {searchQuery ? `No results for "${searchQuery}"` : 'No options available'}
      </li>,
    );
  }

  return (
    <div
      className={[
        styles['forge-multiselect'],
        styles[`forge-multiselect--${size}`],
        {
          [styles['forge-multiselect--error']]: !!error,
          [styles['forge-multiselect--disabled']]: disabled,
          [styles['forge-multiselect--open']]: isOpen,
        },
        properties.className,
      ]}
    >
      {label ? (
        <label
          className={[
            styles['forge-multiselect__label'],
            {
              [styles['forge-multiselect__label--hidden']]: labelHidden,
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
              className={styles['forge-multiselect__required']}
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
        className={styles['forge-multiselect__native']}
        disabled={disabled}
        multiple
        name={name}
        required={required ? modelValue.length === 0 : false}
        tabindex={-1}
      >
        {nativeOptions}
      </select>
      <ForgeDropdown
        matchTriggerWidth={true}
        open={isOpen}
        onUpdateOpen={(open: boolean) => setIsOpen(open)}
      >
        <div
          className={styles['forge-multiselect__wrapper']}
          slot="trigger"
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
        >
          <div className={styles['forge-multiselect__control']}>
            <span className={[styles['forge-multiselect__extension'], styles['forge-multiselect__extension--start']]}>
              <Slot name="start" />
            </span>
            <div className={styles['forge-multiselect__tags']}>{tagChips}</div>
            <span className={[styles['forge-multiselect__extension'], styles['forge-multiselect__extension--end']]}>
              <Slot name="end" />
            </span>
            <span
              aria-hidden="true"
              className={styles['forge-multiselect__chevron']}
            >
              <ForgeIconChevron
                direction={isOpen ? 'up' : 'down'}
                size="sm"
              />
            </span>
          </div>
        </div>
        <ul
          id={`${resolvedId}-listbox`}
          className={styles['forge-multiselect__listbox']}
          role="listbox"
        >
          {listItems}
        </ul>
      </ForgeDropdown>
      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-multiselect__error']}
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
          className={styles['forge-multiselect__hint']}
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
