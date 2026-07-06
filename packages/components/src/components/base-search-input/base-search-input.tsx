import { IconClose, IconSearch } from '@mission-platform/icons';
import { h, useRef, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { nextFieldId } from '../field-id';

import styles from './base-search-input.module.scss';

/** Size token (canonical `2xs … 2xl` scale). */
export type SearchInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface SearchInputProperties extends MpProperties {
  /** Query value (controlled via `modelValue` + `onUpdateModelValue`). */
  modelValue?: string;
  /** Placeholder text. Defaults to `'Search…'`. */
  placeholder?: string;
  /** Field size. Defaults to `'md'`. */
  size?: SearchInputSize;
  /** Disable the control. */
  disabled?: boolean;
  /** Show a loading spinner in place of the search glyph. */
  loading?: boolean;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Accessible label for the clear button. Defaults to `'Clear search'`. */
  clearLabel?: string;
  /** Accessible label for the loading spinner. Defaults to `'Searching…'`. */
  loadingLabel?: string;
  /** Fired with the next value (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string) => void;
  /** Fired with the current value when the user presses Enter. */
  onSearch?: (value: string) => void;
  /** Fired when the field is cleared (clear button or Escape). */
  onClear?: () => void;
}

/**
 * `BaseSearchInput` — search field authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-jsx`.
 *
 * A `type="search"` field with a leading search glyph (or loading spinner) and a
 * trailing clear button shown when there is a value. Enter fires `onSearch`,
 * Escape clears. It owns its styling through the co-located CSS Module
 * `base-search-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `useId` composable becomes the
 * shared `nextFieldId` helper resolved once in a `useRef`; the search/clear icons
 * are the write-once `@mission-platform/icons` `IconSearch`/`IconClose`
 * (themselves compiled to React/Vue); the `useI18n` labels become plain string
 * props; and the `v-model` + `search`/`clear` emits become the
 * `onUpdateModelValue`/`onSearch`/`onClear` callback props.
 */
export function BaseSearchInput(properties: SearchInputProperties): MpElement {
  const {
    modelValue = '',
    placeholder = 'Search…',
    size = 'md',
    disabled = false,
    loading = false,
    clearLabel = 'Clear search',
    loadingLabel = 'Searching…',
  } = properties;

  const idReference = useRef<string>(properties.id ?? nextFieldId('mp-search'));
  const resolvedId = idReference.current;
  const inputReference = useRef<HTMLInputElement | null>(null);

  const hasValue = modelValue.length > 0;

  const handleInput = (event: Event): void => {
    properties.onUpdateModelValue?.((event.target as HTMLInputElement).value);
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      properties.onSearch?.(modelValue);
    } else if (event.key === 'Escape') {
      handleClear();
    }
  };

  const handleClear = (): void => {
    properties.onUpdateModelValue?.('');
    properties.onClear?.();
    inputReference.current?.focus();
  };

  return (
    <div
      classNames={[
        styles['base-search-input'],
        styles[`base-search-input--${size}`],
        {
          [styles['base-search-input--disabled']]: disabled,
        },
      ]}
    >
      <div classNames={styles['base-search-input__wrapper']}>
        <span
          aria-hidden={loading ? undefined : 'true'}
          classNames={styles['base-search-input__search-icon']}
        >
          {loading ? (
            <span
              aria-label={loadingLabel}
              classNames={styles['base-search-input__spinner']}
              role="status"
            />
          ) : (
            <IconSearch size="sm" />
          )}
        </span>
        <input
          ref={inputReference}
          id={resolvedId}
          aria-busy={loading ? 'true' : undefined}
          classNames={styles['base-search-input__field']}
          disabled={disabled}
          placeholder={placeholder}
          type="search"
          value={modelValue}
          onInput={handleInput}
          onKeydown={handleKeydown}
        />
        {hasValue ? (
          <button
            aria-label={clearLabel}
            classNames={styles['base-search-input__clear']}
            type="button"
            onClick={handleClear}
          >
            <IconClose size="sm" />
          </button>
        ) : undefined}
      </div>
    </div>
  );
}
