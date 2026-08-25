import {
  classNames,
  hasSlot,
  Slot,
  useEffect,
  useId,
  useRef,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type MpRenderProperty,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import styles from './forge-mention-input.module.scss';

export interface MentionItem {
  id: string;
  label: string;
  avatar?: string;
  subtitle?: string;
}

export interface MentionSuggestionScope {
  suggestion: MentionItem;
  index: number;
  active: boolean;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface MentionInputStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-border-focus'?: string;
  readonly 'color-danger-default'?: string;
  readonly 'color-danger-text'?: string;
  readonly 'color-primary-subtle'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'font-weight-semibold'?: string;
  readonly 'line-height-normal'?: string;
  readonly 'opacity-disabled'?: string;
  readonly 'radius-md'?: string;
  readonly 'shadow-md'?: string;
  readonly 'size-pad-block-md'?: string;
  readonly 'size-pad-inline-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
}

export type MentionInputStyle = CSSStyleProperties & {
  readonly '--forge-mention-input-border-width-thick'?: string | undefined;
  readonly '--forge-mention-input-border-width-thin'?: string | undefined;
  readonly '--forge-mention-input-color-bg-surface'?: string | undefined;
  readonly '--forge-mention-input-color-border-default'?: string | undefined;
  readonly '--forge-mention-input-color-border-focus'?: string | undefined;
  readonly '--forge-mention-input-color-danger-default'?: string | undefined;
  readonly '--forge-mention-input-color-danger-text'?: string | undefined;
  readonly '--forge-mention-input-color-primary-subtle'?: string | undefined;
  readonly '--forge-mention-input-color-text-primary'?: string | undefined;
  readonly '--forge-mention-input-color-text-secondary'?: string | undefined;
  readonly '--forge-mention-input-font-size-sm'?: string | undefined;
  readonly '--forge-mention-input-font-weight-semibold'?: string | undefined;
  readonly '--forge-mention-input-line-height-normal'?: string | undefined;
  readonly '--forge-mention-input-opacity-disabled'?: string | undefined;
  readonly '--forge-mention-input-radius-md'?: string | undefined;
  readonly '--forge-mention-input-shadow-md'?: string | undefined;
  readonly '--forge-mention-input-size-pad-block-md'?: string | undefined;
  readonly '--forge-mention-input-size-pad-inline-md'?: string | undefined;
  readonly '--forge-mention-input-spacing-1'?: string | undefined;
  readonly '--forge-mention-input-spacing-2'?: string | undefined;
  readonly '--forge-mention-input-spacing-3'?: string | undefined;
};

function createMentionInputStyle(
  properties: Readonly<MentionInputStyleProperties> | undefined,
): MentionInputStyle | undefined {
  return createForgeStyle({
    '--forge-mention-input-border-width-thick': properties?.['border-width-thick'],
    '--forge-mention-input-border-width-thin': properties?.['border-width-thin'],
    '--forge-mention-input-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-mention-input-color-border-default': properties?.['color-border-default'],
    '--forge-mention-input-color-border-focus': properties?.['color-border-focus'],
    '--forge-mention-input-color-danger-default': properties?.['color-danger-default'],
    '--forge-mention-input-color-danger-text': properties?.['color-danger-text'],
    '--forge-mention-input-color-primary-subtle': properties?.['color-primary-subtle'],
    '--forge-mention-input-color-text-primary': properties?.['color-text-primary'],
    '--forge-mention-input-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-mention-input-font-size-sm': properties?.['font-size-sm'],
    '--forge-mention-input-font-weight-semibold': properties?.['font-weight-semibold'],
    '--forge-mention-input-line-height-normal': properties?.['line-height-normal'],
    '--forge-mention-input-opacity-disabled': properties?.['opacity-disabled'],
    '--forge-mention-input-radius-md': properties?.['radius-md'],
    '--forge-mention-input-shadow-md': properties?.['shadow-md'],
    '--forge-mention-input-size-pad-block-md': properties?.['size-pad-block-md'],
    '--forge-mention-input-size-pad-inline-md': properties?.['size-pad-inline-md'],
    '--forge-mention-input-spacing-1': properties?.['spacing-1'],
    '--forge-mention-input-spacing-2': properties?.['spacing-2'],
    '--forge-mention-input-spacing-3': properties?.['spacing-3'],
  }) as MentionInputStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface MentionInputProperties {
  children?: MpChild | readonly MpChild[];
  modelValue: string;
  items: MentionItem[];
  loading?: boolean;
  /** @deprecated Use `items`. */
  suggestions?: MentionItem[];
  trigger?: string;
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  id?: string;
  rows?: number;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  suggestion?: MpRenderProperty<MentionSuggestionScope>;
  onUpdateModelValue?: (value: string) => void;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  onMention?: (item: MentionItem) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<MentionInputStyleProperties>;
}

function escaped(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/** A textarea with accessible, keyboard-navigable mention suggestions. */
export function ForgeMentionInput(properties: Readonly<MentionInputProperties>): MpElement {
  const style = createMentionInputStyle(properties.properties);

  const generatedId = useId();
  const id = properties.id ?? generatedId;
  const listId = `${id}-suggestions`;
  const {
    trigger = '@',
    placeholder = 'Write a message…',
    label,
    hint,
    error,
    rows = 3,
    maxLength,
    required = false,
    disabled = false,
    loading = false,
  } = properties;
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(properties.modelValue ?? '');
  useEffect(() => {
    setValue(properties.modelValue ?? '');
  }, [properties.modelValue]);
  const availableItems = properties.items ?? properties.suggestions ?? [];
  const suggestions = availableItems.filter((suggestion) =>
    suggestion.label.toLowerCase().includes(query.toLowerCase()),
  );
  const updateQuery = (inputValue: string, cursor: number): void => {
    const match = trigger
      ? inputValue.slice(0, cursor).match(new RegExp(String.raw`${escaped(trigger)}([\w-]*)$`))
      : undefined;
    const nextQuery = match?.[1] ?? '';
    const matchingSuggestions = availableItems.filter((suggestion) =>
      suggestion.label.toLowerCase().includes(nextQuery.toLowerCase()),
    );
    setQuery(nextQuery);
    setActiveIndex(0);
    setOpen(!!match && matchingSuggestions.length > 0);
    properties.onSearch?.(nextQuery);
  };
  const updateValue = (event: Event): void => {
    const target = event.target as HTMLTextAreaElement;
    setValue(target.value);
    properties.onUpdateModelValue?.(target.value);
    properties.onChange?.(target.value);
    updateQuery(target.value, target.selectionStart ?? target.value.length);
  };
  const choose = (suggestion: MentionItem): void => {
    const target = inputReference.current;
    if (!target) return;
    const cursor = target.selectionStart ?? target.value.length;
    const before = target.value
      .slice(0, cursor)
      .replace(new RegExp(String.raw`${escaped(trigger)}[\w-]*$`), `${trigger}${suggestion.label} `);
    const nextValue = before + target.value.slice(cursor);
    setValue(nextValue);
    properties.onUpdateModelValue?.(nextValue);
    properties.onChange?.(nextValue);
    properties.onMention?.(suggestion);
    setOpen(false);
    setQuery('');
  };
  const inputReference = useRef<HTMLTextAreaElement | null>(null);
  const onKeydown = (event: KeyboardEvent): void => {
    if (!open || suggestions.length === 0) return;
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        setActiveIndex((activeIndex + 1) % suggestions.length);

        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        setActiveIndex((activeIndex - 1 + suggestions.length) % suggestions.length);

        break;
      }
      case 'Enter':
      case 'Tab': {
        event.preventDefault();
        const activeSuggestion = suggestions[activeIndex];
        if (activeSuggestion) {
          choose(activeSuggestion);
        }

        break;
      }
      case 'Escape': {
        setOpen(false);

        break;
      }
      // No default
    }
  };

  return (
    <div
      className={classNames(styles['forge-mention-input'], {
        [styles['forge-mention-input--error']]: !!error,
        [styles['forge-mention-input--disabled']]: disabled,
      })}
      style={style}
    >
      {label ? (
        <label
          className={styles['forge-mention-input__label']}
          for={id}
        >
          {label}
        </label>
      ) : undefined}
      <div className={styles['forge-mention-input__control']}>
        <textarea
          ref={inputReference}
          id={id}
          aria-autocomplete="list"
          aria-activedescendant={
            open && suggestions[activeIndex] ? `${listId}-${suggestions[activeIndex].id}` : undefined
          }
          aria-controls={open ? listId : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-expanded={open ? 'true' : 'false'}
          aria-invalid={error ? 'true' : undefined}
          role="combobox"
          className={styles['forge-mention-input__textarea']}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          required={required}
          rows={rows}
          value={value}
          onInput={updateValue}
          onKeydown={onKeydown}
        />
        {loading ? <span className={styles['forge-mention-input__loading']}>Loading…</span> : undefined}
        {!loading && open && suggestions.length > 0 ? (
          <ul
            id={listId}
            className={styles['forge-mention-input__suggestions']}
            role="listbox"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`${listId}-${suggestion.id}`}
                aria-selected={index === activeIndex ? 'true' : 'false'}
                className={styles['forge-mention-input__suggestion']}
                role="option"
                onClick={() => choose(suggestion)}
              >
                <Slot
                  name="suggestion"
                  suggestion={suggestion}
                  index={index}
                  active={index === activeIndex}
                >
                  {suggestion.label}
                </Slot>
              </li>
            ))}
          </ul>
        ) : undefined}
      </div>
      {error ? (
        <p
          id={`${id}-error`}
          className={styles['forge-mention-input__error']}
          role="alert"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className={styles['forge-mention-input__hint']}
        >
          {hint}
        </p>
      ) : undefined}
      {hasSlot('footer') ? (
        <div className={styles['forge-mention-input__footer']}>
          <Slot name="footer" />
        </div>
      ) : undefined}
      {properties.children ? (
        <div className={styles['forge-mention-input__content']}>
          <Slot>{properties.children}</Slot>
        </div>
      ) : undefined}
    </div>
  );
}
