import { type MpElement, useId, useRef } from '@mission-platform/forge';
import { ForgeIconClose, ForgeIconSearch } from '@mission-platform/icons';

import styles from './forge-search-input.module.scss';

/** Size token (canonical `2xs … 2xl` scale). */
export type SearchInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface SearchInputProperties {
  /**
   * Query value (controlled via `modelValue` + `onUpdateModelValue`).
   * @model onUpdateModelValue
   */
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
 * `ForgeSearchInput` — search field authored once in the neutral JSX dialect and
 * compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * A `type="search"` field with a leading search glyph (or loading spinner) and a
 * trailing clear button shown when there is a value. Enter fires `onSearch`,
 * Escape clears. It owns its styling through the co-located CSS Module
 * `forge-search-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `useId` composable maps straight
 * to the framework-native `useId` hook; the search/clear icons
 * are the write-once `@mission-platform/icons` `ForgeIconSearch`/`ForgeIconClose`
 * (themselves compiled to React/Vue); the `useI18n` labels become plain string
 * props; and the `v-model` + `search`/`clear` emits become the
 * `onUpdateModelValue`/`onSearch`/`onClear` callback props.
 */
export function ForgeSearchInput(properties: Readonly<SearchInputProperties>): MpElement {
  const {
    modelValue = '',
    placeholder = 'Search…',
    size = 'md',
    disabled = false,
    loading = false,
    clearLabel = 'Clear search',
    loadingLabel = 'Searching…',
  } = properties;

  const generatedId = useId();
  const resolvedId = properties.id ?? generatedId;
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
      className={[
        styles['forge-search-input'],
        styles[`forge-search-input--${size}`],
        {
          [styles['forge-search-input--disabled']]: disabled,
        },
      ]}
    >
      <div className={styles['forge-search-input__wrapper']}>
        <span
          aria-hidden={loading ? undefined : 'true'}
          className={styles['forge-search-input__search-icon']}
        >
          {loading ? (
            <span
              aria-label={loadingLabel}
              className={styles['forge-search-input__spinner']}
              role="status"
            />
          ) : (
            <ForgeIconSearch size="sm" />
          )}
        </span>
        <input
          ref={inputReference}
          id={resolvedId}
          aria-busy={loading ? 'true' : undefined}
          className={styles['forge-search-input__field']}
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
            className={styles['forge-search-input__clear']}
            type="button"
            onClick={handleClear}
          >
            <ForgeIconClose size="sm" />
          </button>
        ) : undefined}
      </div>
    </div>
  );
}
