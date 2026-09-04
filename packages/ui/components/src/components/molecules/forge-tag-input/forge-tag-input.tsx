import {
  classNames,
  useEffect,
  useId,
  useState,
  createForgeStyle,
  type ClassValue,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-tag-input.module.scss';

/** Size token controlling the tag input scale. */
export type TagInputSize = 'sm' | 'md' | 'lg';
/** Surface tone of the tag input. */
export type TagInputVariant = 'neutral' | 'primary' | 'error';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface TagInputStyleProperties {
  readonly 'border-width-thick'?: string;
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-raised'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-border-focus'?: string;
  readonly 'color-danger-default'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'duration-slow'?: string;
  readonly 'font-size-lg'?: string;
  readonly 'font-size-sm'?: string;
  readonly 'line-height-tight'?: string;
  readonly 'opacity-disabled'?: string;
  readonly 'radius-full'?: string;
  readonly 'radius-md'?: string;
  readonly 'radius-sm'?: string;
  readonly 'size-checkable-indicator'?: string;
  readonly 'size-height-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
}

export type TagInputStyle = CSSStyleProperties & {
  readonly '--forge-tag-input-border-width-thick'?: string | undefined;
  readonly '--forge-tag-input-border-width-thin'?: string | undefined;
  readonly '--forge-tag-input-color-bg-raised'?: string | undefined;
  readonly '--forge-tag-input-color-bg-surface'?: string | undefined;
  readonly '--forge-tag-input-color-border-default'?: string | undefined;
  readonly '--forge-tag-input-color-border-focus'?: string | undefined;
  readonly '--forge-tag-input-color-danger-default'?: string | undefined;
  readonly '--forge-tag-input-color-primary-default'?: string | undefined;
  readonly '--forge-tag-input-color-text-primary'?: string | undefined;
  readonly '--forge-tag-input-color-text-secondary'?: string | undefined;
  readonly '--forge-tag-input-duration-slow'?: string | undefined;
  readonly '--forge-tag-input-font-size-lg'?: string | undefined;
  readonly '--forge-tag-input-font-size-sm'?: string | undefined;
  readonly '--forge-tag-input-line-height-tight'?: string | undefined;
  readonly '--forge-tag-input-opacity-disabled'?: string | undefined;
  readonly '--forge-tag-input-radius-full'?: string | undefined;
  readonly '--forge-tag-input-radius-md'?: string | undefined;
  readonly '--forge-tag-input-radius-sm'?: string | undefined;
  readonly '--forge-tag-input-size-checkable-indicator'?: string | undefined;
  readonly '--forge-tag-input-size-height-md'?: string | undefined;
  readonly '--forge-tag-input-spacing-1'?: string | undefined;
  readonly '--forge-tag-input-spacing-2'?: string | undefined;
};

function createTagInputStyle(properties: Readonly<TagInputStyleProperties> | undefined): TagInputStyle | undefined {
  return createForgeStyle({
    '--forge-tag-input-border-width-thick': properties?.['border-width-thick'],
    '--forge-tag-input-border-width-thin': properties?.['border-width-thin'],
    '--forge-tag-input-color-bg-raised': properties?.['color-bg-raised'],
    '--forge-tag-input-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-tag-input-color-border-default': properties?.['color-border-default'],
    '--forge-tag-input-color-border-focus': properties?.['color-border-focus'],
    '--forge-tag-input-color-danger-default': properties?.['color-danger-default'],
    '--forge-tag-input-color-primary-default': properties?.['color-primary-default'],
    '--forge-tag-input-color-text-primary': properties?.['color-text-primary'],
    '--forge-tag-input-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-tag-input-duration-slow': properties?.['duration-slow'],
    '--forge-tag-input-font-size-lg': properties?.['font-size-lg'],
    '--forge-tag-input-font-size-sm': properties?.['font-size-sm'],
    '--forge-tag-input-line-height-tight': properties?.['line-height-tight'],
    '--forge-tag-input-opacity-disabled': properties?.['opacity-disabled'],
    '--forge-tag-input-radius-full': properties?.['radius-full'],
    '--forge-tag-input-radius-md': properties?.['radius-md'],
    '--forge-tag-input-radius-sm': properties?.['radius-sm'],
    '--forge-tag-input-size-checkable-indicator': properties?.['size-checkable-indicator'],
    '--forge-tag-input-size-height-md': properties?.['size-height-md'],
    '--forge-tag-input-spacing-1': properties?.['spacing-1'],
    '--forge-tag-input-spacing-2': properties?.['spacing-2'],
  }) as TagInputStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface TagInputProperties {
  /** Controlled list of committed tags. */
  modelValue?: readonly string[];
  /** Visible field label. */
  label?: string;
  /** Visually hide the label while retaining the accessible association. */
  labelHidden?: boolean;
  /** Input placeholder shown while no draft text is present. */
  placeholder?: string;
  /** Helper text shown below the field. */
  hint?: string;
  /** Error message shown below the field. */
  error?: string;
  /** Disable all tag interactions. */
  disabled?: boolean;
  /** Show a busy indicator and suppress all interactions. */
  loading?: boolean;
  /** Prevent adding more than this many tags. `0` prevents all additions. */
  maxTags?: number;
  /** Allow exact duplicate values. Defaults to `false`. */
  allowDuplicates?: boolean;
  /** Input size. Defaults to `'md'`. */
  size?: TagInputSize;
  /** Input tone. Defaults to `'neutral'`. */
  variant?: TagInputVariant;
  /** Mark the field as required. */
  required?: boolean;
  /** Explicit input id. Auto-generated when omitted. */
  id?: string;
  /** Accessible label for the busy indicator. */
  loadingLabel?: string;
  /** Extra class(es) merged onto the root element. */
  className?: ClassValue;
  /** Controlled model update callback. */
  onUpdateModelValue?: (tags: string[]) => void;
  /** Fired after a new tag is committed. */
  onAdd?: (tag: string) => void;
  /** Fired after a tag is removed. */
  onRemove?: (tag: string, index: number) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<TagInputStyleProperties>;
}

function emitTags(properties: Readonly<TagInputProperties>, tags: string[]): void {
  properties.onUpdateModelValue?.(tags);
}

/**
 * `ForgeTagInput` — a controlled, accessible tag editor authored in neutral
 * JSX. Enter or comma commits a trimmed draft, backspace removes the last tag
 * when the draft is empty, and duplicate/max-tag rules are applied before the
 * controlled update callback is fired.
 */
export function ForgeTagInput(properties: Readonly<TagInputProperties>): MpElement {
  const style = createTagInputStyle(properties.properties);

  const {
    modelValue = [],
    label,
    labelHidden = false,
    placeholder = 'Add a tag',
    hint,
    error,
    disabled = false,
    loading = false,
    loadingLabel,
    maxTags,
    allowDuplicates = false,
    size = 'md',
    variant = 'neutral',
    required = false,
  } = properties;
  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;
  const [tags, setTags] = useState<string[]>([...modelValue]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setTags([...modelValue]);
  }, [modelValue]);

  const commit = (rawValue: string): void => {
    const value = rawValue.trim().replace(/,+$/, '').trim();
    if (!value || disabled || loading) {
      return;
    }
    if (maxTags !== undefined && tags.length >= Math.max(0, maxTags)) {
      setDraft('');
      return;
    }
    if (!allowDuplicates && tags.includes(value)) {
      setDraft('');
      return;
    }
    const next = [...tags, value];
    setTags(next);
    setDraft('');
    emitTags(properties, next);
    properties.onAdd?.(value);
  };

  const remove = (index: number): void => {
    if (disabled || loading || index < 0 || index >= tags.length) {
      return;
    }
    const removed = tags[index];
    const next = tags.filter((_, tagIndex) => tagIndex !== index);
    setTags(next);
    emitTags(properties, next);
    properties.onRemove?.(removed, index);
  };

  const className = classNames(
    styles['forge-tag-input'],
    styles[`forge-tag-input--${size}`],
    styles[`forge-tag-input--${variant}`],
    { [styles['forge-tag-input--error']]: !!error, [styles['forge-tag-input--disabled']]: disabled || loading },
    properties.className,
  );

  return (
    <div
      aria-busy={loading}
      className={className}
      style={style}
    >
      {label ? (
        <label
          className={classNames(styles['forge-tag-input__label'], {
            [styles['forge-tag-input__label--hidden']]: labelHidden,
          })}
          for={resolvedId}
        >
          {label}
          {required ? <span aria-hidden="true">*</span> : undefined}
        </label>
      ) : undefined}
      <div className={styles['forge-tag-input__control']}>
        <div className={styles['forge-tag-input__tags']}>
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className={styles['forge-tag-input__tag']}
            >
              <span>{tag}</span>
              <button
                aria-label={`Remove ${tag}`}
                disabled={disabled || loading}
                type="button"
                onClick={() => remove(index)}
              >
                ×
              </button>
            </span>
          ))}
          <input
            id={resolvedId}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : undefined}
            aria-label={label ? undefined : 'Tags'}
            disabled={disabled || loading}
            placeholder={placeholder}
            required={required}
            value={draft}
            onInput={(event: Event) => setDraft((event.target as HTMLInputElement).value)}
            onKeydown={(event: KeyboardEvent) => {
              const input = event.target as HTMLInputElement;
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                commit(input.value);
              } else if (event.key === 'Backspace' && input.value === '' && tags.length > 0) {
                event.preventDefault();
                remove(tags.length - 1);
              }
            }}
          />
        </div>
        {loading ? (
          <span
            aria-label={loadingLabel ?? 'Loading…'}
            className={styles['forge-tag-input__loading']}
            role="status"
          />
        ) : undefined}
      </div>
      {error ? (
        <p
          id={`${resolvedId}-error`}
          className={styles['forge-tag-input__message']}
          role="alert"
        >
          {error}
        </p>
      ) : undefined}
      {!error && hint ? (
        <p
          id={`${resolvedId}-hint`}
          className={styles['forge-tag-input__message']}
        >
          {hint}
        </p>
      ) : undefined}
    </div>
  );
}
