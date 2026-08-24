import { classNames, type ClassValue, type MpElement, useEffect, useId, useState } from '@mission-platform/forge';

import styles from './forge-tag-input.module.scss';

/** Size token controlling the tag input scale. */
export type TagInputSize = 'sm' | 'md' | 'lg';
/** Surface tone of the tag input. */
export type TagInputVariant = 'neutral' | 'primary' | 'error';

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
