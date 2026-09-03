import { ForgeDropdown } from '@mission-platform/float';
import {
  Slot,
  useId,
  useState,
  createForgeStyle,
  type ClassValue,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeIconChevron } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';

import { ForgeTag } from '../../atoms/forge-tag';

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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface MultiselectStyleProperties {
  readonly 'field-error'?: string;
  readonly 'field-required'?: string;
  readonly 'select-border-default'?: string;
  readonly 'select-border-focus-visible'?: string;
  readonly 'select-border-invalid'?: string;
  readonly 'select-border-width-default'?: string;
  readonly 'select-control-gap'?: string;
  readonly 'select-field-gap'?: string;
  readonly 'select-focus-ring'?: string;
  readonly 'select-focus-ring-invalid'?: string;
  readonly 'select-font-family'?: string;
  readonly 'select-line-height'?: string;
  readonly 'select-option-background-hover'?: string;
  readonly 'select-option-padding-block'?: string;
  readonly 'select-option-padding-inline'?: string;
  readonly 'select-option-text-default'?: string;
  readonly 'select-option-text-disabled'?: string;
  readonly 'select-radius'?: string;
  readonly 'select-size-2xl-font-size'?: string;
  readonly 'select-size-2xl-padding-block'?: string;
  readonly 'select-size-2xl-padding-inline'?: string;
  readonly 'select-size-2xs-font-size'?: string;
  readonly 'select-size-2xs-padding-block'?: string;
  readonly 'select-size-2xs-padding-inline'?: string;
  readonly 'select-size-lg-font-size'?: string;
  readonly 'select-size-lg-padding-block'?: string;
  readonly 'select-size-lg-padding-inline'?: string;
  readonly 'select-size-md-font-size'?: string;
  readonly 'select-size-md-padding-block'?: string;
  readonly 'select-size-md-padding-inline'?: string;
  readonly 'select-size-sm-font-size'?: string;
  readonly 'select-size-sm-padding-block'?: string;
  readonly 'select-size-sm-padding-inline'?: string;
  readonly 'select-size-xl-font-size'?: string;
  readonly 'select-size-xl-padding-block'?: string;
  readonly 'select-size-xl-padding-inline'?: string;
  readonly 'select-size-xs-font-size'?: string;
  readonly 'select-size-xs-padding-block'?: string;
  readonly 'select-size-xs-padding-inline'?: string;
  readonly 'select-surface-default'?: string;
  readonly 'select-surface-disabled'?: string;
  readonly 'select-tag-gap'?: string;
  readonly 'select-text-default'?: string;
  readonly 'select-text-disabled'?: string;
  readonly 'select-text-placeholder'?: string;
  readonly 'select-text-secondary'?: string;
  readonly 'select-transition-duration'?: string;
  readonly 'select-transition-easing'?: string;
}

export type MultiselectStyle = CSSStyleProperties & {
  readonly '--forge-multiselect-field-error'?: string | undefined;
  readonly '--forge-multiselect-field-required'?: string | undefined;
  readonly '--forge-multiselect-select-border-default'?: string | undefined;
  readonly '--forge-multiselect-select-border-focus-visible'?: string | undefined;
  readonly '--forge-multiselect-select-border-invalid'?: string | undefined;
  readonly '--forge-multiselect-select-border-width-default'?: string | undefined;
  readonly '--forge-multiselect-select-control-gap'?: string | undefined;
  readonly '--forge-multiselect-select-field-gap'?: string | undefined;
  readonly '--forge-multiselect-select-focus-ring'?: string | undefined;
  readonly '--forge-multiselect-select-focus-ring-invalid'?: string | undefined;
  readonly '--forge-multiselect-select-font-family'?: string | undefined;
  readonly '--forge-multiselect-select-line-height'?: string | undefined;
  readonly '--forge-multiselect-select-option-background-hover'?: string | undefined;
  readonly '--forge-multiselect-select-option-padding-block'?: string | undefined;
  readonly '--forge-multiselect-select-option-padding-inline'?: string | undefined;
  readonly '--forge-multiselect-select-option-text-default'?: string | undefined;
  readonly '--forge-multiselect-select-option-text-disabled'?: string | undefined;
  readonly '--forge-multiselect-select-radius'?: string | undefined;
  readonly '--forge-multiselect-select-size-2xl-font-size'?: string | undefined;
  readonly '--forge-multiselect-select-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-multiselect-select-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-multiselect-select-size-2xs-font-size'?: string | undefined;
  readonly '--forge-multiselect-select-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-multiselect-select-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-multiselect-select-size-lg-font-size'?: string | undefined;
  readonly '--forge-multiselect-select-size-lg-padding-block'?: string | undefined;
  readonly '--forge-multiselect-select-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-multiselect-select-size-md-font-size'?: string | undefined;
  readonly '--forge-multiselect-select-size-md-padding-block'?: string | undefined;
  readonly '--forge-multiselect-select-size-md-padding-inline'?: string | undefined;
  readonly '--forge-multiselect-select-size-sm-font-size'?: string | undefined;
  readonly '--forge-multiselect-select-size-sm-padding-block'?: string | undefined;
  readonly '--forge-multiselect-select-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-multiselect-select-size-xl-font-size'?: string | undefined;
  readonly '--forge-multiselect-select-size-xl-padding-block'?: string | undefined;
  readonly '--forge-multiselect-select-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-multiselect-select-size-xs-font-size'?: string | undefined;
  readonly '--forge-multiselect-select-size-xs-padding-block'?: string | undefined;
  readonly '--forge-multiselect-select-size-xs-padding-inline'?: string | undefined;
  readonly '--forge-multiselect-select-surface-default'?: string | undefined;
  readonly '--forge-multiselect-select-surface-disabled'?: string | undefined;
  readonly '--forge-multiselect-select-tag-gap'?: string | undefined;
  readonly '--forge-multiselect-select-text-default'?: string | undefined;
  readonly '--forge-multiselect-select-text-disabled'?: string | undefined;
  readonly '--forge-multiselect-select-text-placeholder'?: string | undefined;
  readonly '--forge-multiselect-select-text-secondary'?: string | undefined;
  readonly '--forge-multiselect-select-transition-duration'?: string | undefined;
  readonly '--forge-multiselect-select-transition-easing'?: string | undefined;
};

function createMultiselectStyle(
  properties: Readonly<MultiselectStyleProperties> | undefined,
): MultiselectStyle | undefined {
  return createForgeStyle({
    '--forge-multiselect-field-error': properties?.['field-error'],
    '--forge-multiselect-field-required': properties?.['field-required'],
    '--forge-multiselect-select-border-default': properties?.['select-border-default'],
    '--forge-multiselect-select-border-focus-visible': properties?.['select-border-focus-visible'],
    '--forge-multiselect-select-border-invalid': properties?.['select-border-invalid'],
    '--forge-multiselect-select-border-width-default': properties?.['select-border-width-default'],
    '--forge-multiselect-select-control-gap': properties?.['select-control-gap'],
    '--forge-multiselect-select-field-gap': properties?.['select-field-gap'],
    '--forge-multiselect-select-focus-ring': properties?.['select-focus-ring'],
    '--forge-multiselect-select-focus-ring-invalid': properties?.['select-focus-ring-invalid'],
    '--forge-multiselect-select-font-family': properties?.['select-font-family'],
    '--forge-multiselect-select-line-height': properties?.['select-line-height'],
    '--forge-multiselect-select-option-background-hover': properties?.['select-option-background-hover'],
    '--forge-multiselect-select-option-padding-block': properties?.['select-option-padding-block'],
    '--forge-multiselect-select-option-padding-inline': properties?.['select-option-padding-inline'],
    '--forge-multiselect-select-option-text-default': properties?.['select-option-text-default'],
    '--forge-multiselect-select-option-text-disabled': properties?.['select-option-text-disabled'],
    '--forge-multiselect-select-radius': properties?.['select-radius'],
    '--forge-multiselect-select-size-2xl-font-size': properties?.['select-size-2xl-font-size'],
    '--forge-multiselect-select-size-2xl-padding-block': properties?.['select-size-2xl-padding-block'],
    '--forge-multiselect-select-size-2xl-padding-inline': properties?.['select-size-2xl-padding-inline'],
    '--forge-multiselect-select-size-2xs-font-size': properties?.['select-size-2xs-font-size'],
    '--forge-multiselect-select-size-2xs-padding-block': properties?.['select-size-2xs-padding-block'],
    '--forge-multiselect-select-size-2xs-padding-inline': properties?.['select-size-2xs-padding-inline'],
    '--forge-multiselect-select-size-lg-font-size': properties?.['select-size-lg-font-size'],
    '--forge-multiselect-select-size-lg-padding-block': properties?.['select-size-lg-padding-block'],
    '--forge-multiselect-select-size-lg-padding-inline': properties?.['select-size-lg-padding-inline'],
    '--forge-multiselect-select-size-md-font-size': properties?.['select-size-md-font-size'],
    '--forge-multiselect-select-size-md-padding-block': properties?.['select-size-md-padding-block'],
    '--forge-multiselect-select-size-md-padding-inline': properties?.['select-size-md-padding-inline'],
    '--forge-multiselect-select-size-sm-font-size': properties?.['select-size-sm-font-size'],
    '--forge-multiselect-select-size-sm-padding-block': properties?.['select-size-sm-padding-block'],
    '--forge-multiselect-select-size-sm-padding-inline': properties?.['select-size-sm-padding-inline'],
    '--forge-multiselect-select-size-xl-font-size': properties?.['select-size-xl-font-size'],
    '--forge-multiselect-select-size-xl-padding-block': properties?.['select-size-xl-padding-block'],
    '--forge-multiselect-select-size-xl-padding-inline': properties?.['select-size-xl-padding-inline'],
    '--forge-multiselect-select-size-xs-font-size': properties?.['select-size-xs-font-size'],
    '--forge-multiselect-select-size-xs-padding-block': properties?.['select-size-xs-padding-block'],
    '--forge-multiselect-select-size-xs-padding-inline': properties?.['select-size-xs-padding-inline'],
    '--forge-multiselect-select-surface-default': properties?.['select-surface-default'],
    '--forge-multiselect-select-surface-disabled': properties?.['select-surface-disabled'],
    '--forge-multiselect-select-tag-gap': properties?.['select-tag-gap'],
    '--forge-multiselect-select-text-default': properties?.['select-text-default'],
    '--forge-multiselect-select-text-disabled': properties?.['select-text-disabled'],
    '--forge-multiselect-select-text-placeholder': properties?.['select-text-placeholder'],
    '--forge-multiselect-select-text-secondary': properties?.['select-text-secondary'],
    '--forge-multiselect-select-transition-duration': properties?.['select-transition-duration'],
    '--forge-multiselect-select-transition-easing': properties?.['select-transition-easing'],
  }) as MultiselectStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<MultiselectStyleProperties>;
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
  const style = createMultiselectStyle(properties.properties);

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
      style={style}
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
