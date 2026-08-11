import { ForgeDropdown, ForgeTypography } from '@mission-platform/components';
import {
  type ClassValue,
  h,
  type MpChild,
  type MpElement,
  Slot,
  useId,
  useRef,
  useState,
} from '@mission-platform/forge';
import { ForgeIconChevron } from '@mission-platform/icons';

import styles from './forge-select.module.scss';

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

export interface SelectProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  /**
   * Extra class(es) merged onto the control's root element. Applied last so
   * the caller wins the cascade.
   */
  className?: ClassValue;
  /**
   * Selected value (controlled via `modelValue`).
   * @model onUpdateModelValue
   */
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
  /**
   * Allow the user to filter the options by typing in the trigger, like
   * {@link ForgeMultiselect}. Defaults to `true`; set to `false` for a plain
   * button trigger without a search field.
   */
  searchable?: boolean;
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
 * `ForgeSelect` — a custom combobox/select authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * By default (`searchable`, the default) the trigger is a text field that filters
 * the options as the user types — mirroring {@link ForgeMultiselect} — so a value
 * can be found by searching rather than scrolling; set `searchable={false}` for a
 * plain button trigger. Either way the listbox is backed by a visually hidden
 * native `<select>` so browser autofill and native form submission keep working.
 * Selection is controlled with the established `modelValue` +
 * `onUpdateModelValue`/`onChange` callback-prop convention. It owns its styling
 * through the co-located CSS Module `forge-select.module.scss`.
 *
 * The floating listbox is rendered through the write-once **`ForgeDropdown`**
 * (itself compiled to React/Vue), composed via the neutral named-slot **passing**
 * syntax: the combobox wrapper is handed to the dropdown's `trigger` slot
 * (`slot="trigger"`) and the `<ul role="listbox">` becomes its default slot, so
 * the panel is portalled through `<Teleport>` and anchored with CSS Anchor
 * Positioning instead of an in-place absolutely-positioned list. The internal
 * `useState` open flag is kept in sync with the dropdown via its
 * `onUpdateOpen` callback.
 *
 * Other substitutions from the original Vue SFC: the `useId` composable maps to
 * the framework-native `useId` hook; the chevron is the write-once
 * `@mission-platform/icons` `ForgeIconChevron` (rotated via its `direction` prop,
 * itself compiled to React/Vue); the `useI18n` strings become plain text; and
 * the `v-model` + emits become callback props. The `start`/`end` named slots are
 * preserved as neutral named slots.
 */
export function ForgeSelect(properties: Readonly<SelectProperties>): MpElement {
  const {
    modelValue = '',
    options = [],
    size = 'md',
    label,
    labelHidden = false,
    hint,
    error,
    placeholder,
    searchable = true,
    disabled = false,
    required = false,
    name,
    autocomplete,
  } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const triggerReference = useRef<HTMLButtonElement | null>(null);
  const searchReference = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedOption = options.find((option) => option.value === modelValue);
  const displayLabel = selectedOption ? selectedOption.label : (placeholder ?? '');
  const hasPlaceholder = selectedOption === undefined;

  // When searchable and open, the trigger becomes a filtering text field.
  const visibleOptions =
    searchable && searchQuery
      ? options.filter((option) => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
      : options;

  const openDropdown = (): void => {
    if (disabled) {
      return;
    }
    setSearchQuery('');
    setIsOpen(true);
    properties.onFocus?.(new FocusEvent('focus'));
  };

  const closeDropdown = (): void => {
    setIsOpen(false);
    setSearchQuery('');
  };

  const commit = (value: string | number): void => {
    properties.onUpdateModelValue?.(value);
    properties.onChange?.(value);
  };

  const focusTrigger = (): void => {
    if (searchable) {
      searchReference.current?.focus();
    } else {
      triggerReference.current?.focus();
    }
  };

  const selectOption = (option: SelectOption): void => {
    if (option.disabled) {
      return;
    }
    commit(option.value);
    closeDropdown();
    focusTrigger();
  };

  const selectAdjacentOption = (direction: 1 | -1): void => {
    const enabled = visibleOptions.filter((option) => !option.disabled);
    if (enabled.length === 0) {
      return;
    }
    const currentIndex = enabled.findIndex((option) => option.value === modelValue);
    // Default to the first option when the selection is not part of the filtered set.
    const baseIndex = currentIndex === -1 ? (direction === 1 ? -1 : 0) : currentIndex;
    const nextIndex = Math.max(0, Math.min(enabled.length - 1, baseIndex + direction));
    const next = enabled[nextIndex];
    if (next) {
      commit(next.value);
    }
  };

  const selectFirstVisibleOption = (): void => {
    const first = visibleOptions.find((option) => !option.disabled);
    if (first) {
      selectOption(first);
    }
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'Enter': {
        event.preventDefault();
        if (isOpen) {
          if (searchable) {
            selectFirstVisibleOption();
          } else {
            closeDropdown();
          }
        } else {
          openDropdown();
        }

        break;
      }
      case ' ': {
        // In searchable mode a space is a literal query character; only the
        // button trigger toggles the dropdown on Space.
        if (!searchable) {
          event.preventDefault();
          if (isOpen) {
            closeDropdown();
          } else {
            openDropdown();
          }
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

  const handleSearchInput = (event: Event): void => {
    setSearchQuery((event.target as HTMLInputElement).value);
    if (!isOpen) {
      setIsOpen(true);
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
      key="__placeholder__"
      value=""
    >
      {placeholder}
    </option>,
    ...options.map((option) => (
      <option
        key={option.value}
        disabled={option.disabled}
        value={option.value}
      >
        {option.label}
      </option>
    )),
  ];

  const listItems: MpChild[] = visibleOptions.map((option) => (
    <li
      key={option.value}
      aria-disabled={option.disabled || undefined}
      aria-selected={option.value === modelValue}
      className={[
        styles['forge-select__option'],
        {
          [styles['forge-select__option--selected']]: option.value === modelValue,
          [styles['forge-select__option--disabled']]: option.disabled,
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
  if (visibleOptions.length === 0) {
    listItems.push(
      <li
        aria-disabled="true"
        aria-selected="false"
        className={styles['forge-select__empty']}
        role="option"
        tabindex={-1}
      >
        {searchQuery ? `No results for "${searchQuery}"` : 'No options available'}
      </li>,
    );
  }

  // Text shown/typed in the search trigger: the live query while open,
  // otherwise the selected option's label (never the placeholder text).
  const searchValue = isOpen ? searchQuery : selectedOption ? selectedOption.label : '';
  // While open, keep the current selection visible as the input placeholder.
  const searchPlaceholder = isOpen && selectedOption ? selectedOption.label : (placeholder ?? '');

  const triggerControl: MpChild = searchable ? (
    <input
      ref={searchReference}
      id={resolvedId}
      aria-autocomplete="list"
      aria-controls={`${resolvedId}-listbox`}
      aria-describedby={describedBy}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-invalid={error ? 'true' : undefined}
      aria-labelledby={label ? `${resolvedId}-label` : undefined}
      aria-required={required || undefined}
      autocomplete="off"
      className={[
        styles['forge-select__field'],
        {
          [styles['forge-select__field--placeholder']]: hasPlaceholder && !searchValue,
        },
      ]}
      disabled={disabled}
      placeholder={searchPlaceholder}
      required={required}
      role="combobox"
      type="text"
      value={searchValue}
      onBlur={(event: FocusEvent) => properties.onBlur?.(event)}
      onFocus={openDropdown}
      onInput={handleSearchInput}
      onKeydown={handleKeydown}
    />
  ) : (
    <button
      ref={triggerReference}
      id={resolvedId}
      aria-controls={`${resolvedId}-listbox`}
      aria-describedby={describedBy}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-invalid={error ? 'true' : undefined}
      aria-labelledby={label ? `${resolvedId}-label` : undefined}
      aria-required={required || undefined}
      className={[
        styles['forge-select__field'],
        {
          [styles['forge-select__field--placeholder']]: hasPlaceholder,
        },
      ]}
      disabled={disabled}
      role="combobox"
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
  );

  return (
    <div
      className={[
        styles['forge-select'],
        styles[`forge-select--${size}`],
        {
          [styles['forge-select--error']]: !!error,
          [styles['forge-select--disabled']]: disabled,
          [styles['forge-select--open']]: isOpen,
        },
        properties.className,
      ]}
    >
      {label ? (
        <label
          id={`${resolvedId}-label`}
          className={[
            styles['forge-select__label'],
            {
              [styles['forge-select__label--hidden']]: labelHidden,
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
              className={styles['forge-select__required']}
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
        className={styles['forge-select__native']}
        disabled={disabled}
        name={name}
        required={required}
        tabindex={-1}
        value={modelValue}
        onChange={handleNativeChange}
      >
        {nativeOptions}
      </select>
      <ForgeDropdown
        matchTriggerWidth={true}
        open={isOpen}
        onUpdateOpen={(open: boolean) => setIsOpen(open)}
      >
        <div
          className={styles['forge-select__wrapper']}
          slot="trigger"
          onClick={() => {
            if (searchable && !disabled && !isOpen) {
              openDropdown();
              searchReference.current?.focus();
            }
          }}
        >
          <span className={[styles['forge-select__extension'], styles['forge-select__extension--start']]}>
            <Slot name="start" />
          </span>
          {triggerControl}
          <span className={[styles['forge-select__extension'], styles['forge-select__extension--end']]}>
            <Slot name="end" />
          </span>
          <span
            aria-hidden="true"
            className={styles['forge-select__chevron']}
          >
            <ForgeIconChevron
              direction={isOpen ? 'up' : 'down'}
              size="sm"
            />
          </span>
        </div>
        <ul
          id={`${resolvedId}-listbox`}
          aria-labelledby={label ? `${resolvedId}-label` : undefined}
          className={styles['forge-select__listbox']}
          role="listbox"
        >
          {listItems}
        </ul>
      </ForgeDropdown>
      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-select__error']}
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
          className={styles['forge-select__hint']}
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
