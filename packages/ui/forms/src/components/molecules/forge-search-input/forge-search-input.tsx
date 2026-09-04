import { useId, useRef, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge-jsx';
import { ForgeIconClose, ForgeIconSearch } from '@mission-platform/icons';

import styles from './forge-search-input.module.scss';

/** Size token (canonical `2xs … 2xl` scale). */
export type SearchInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface SearchInputStyleProperties {
  readonly 'input-border-default'?: string;
  readonly 'input-border-focus-visible'?: string;
  readonly 'input-border-width'?: string;
  readonly 'input-focus-ring'?: string;
  readonly 'input-font-family'?: string;
  readonly 'input-radius'?: string;
  readonly 'input-search-clear-radius'?: string;
  readonly 'input-search-clear-text-default'?: string;
  readonly 'input-search-clear-text-hover'?: string;
  readonly 'input-search-gap'?: string;
  readonly 'input-search-icon-text'?: string;
  readonly 'input-search-spinner-border-width'?: string;
  readonly 'input-search-spinner-duration'?: string;
  readonly 'input-search-spinner-radius'?: string;
  readonly 'input-size-2xl-font-size'?: string;
  readonly 'input-size-2xl-padding-block'?: string;
  readonly 'input-size-2xl-padding-inline'?: string;
  readonly 'input-size-2xs-font-size'?: string;
  readonly 'input-size-2xs-padding-block'?: string;
  readonly 'input-size-2xs-padding-inline'?: string;
  readonly 'input-size-lg-font-size'?: string;
  readonly 'input-size-lg-padding-block'?: string;
  readonly 'input-size-lg-padding-inline'?: string;
  readonly 'input-size-md-font-size'?: string;
  readonly 'input-size-md-padding-block'?: string;
  readonly 'input-size-md-padding-inline'?: string;
  readonly 'input-size-sm-font-size'?: string;
  readonly 'input-size-sm-padding-block'?: string;
  readonly 'input-size-sm-padding-inline'?: string;
  readonly 'input-size-xl-font-size'?: string;
  readonly 'input-size-xl-padding-block'?: string;
  readonly 'input-size-xl-padding-inline'?: string;
  readonly 'input-size-xs-font-size'?: string;
  readonly 'input-size-xs-padding-block'?: string;
  readonly 'input-size-xs-padding-inline'?: string;
  readonly 'input-surface-default'?: string;
  readonly 'input-surface-disabled'?: string;
  readonly 'input-text-default'?: string;
  readonly 'input-text-disabled'?: string;
  readonly 'input-text-placeholder'?: string;
}

export type SearchInputStyle = CSSStyleProperties & {
  readonly '--forge-search-input-input-border-default'?: string | undefined;
  readonly '--forge-search-input-input-border-focus-visible'?: string | undefined;
  readonly '--forge-search-input-input-border-width'?: string | undefined;
  readonly '--forge-search-input-input-focus-ring'?: string | undefined;
  readonly '--forge-search-input-input-font-family'?: string | undefined;
  readonly '--forge-search-input-input-radius'?: string | undefined;
  readonly '--forge-search-input-input-search-clear-radius'?: string | undefined;
  readonly '--forge-search-input-input-search-clear-text-default'?: string | undefined;
  readonly '--forge-search-input-input-search-clear-text-hover'?: string | undefined;
  readonly '--forge-search-input-input-search-gap'?: string | undefined;
  readonly '--forge-search-input-input-search-icon-text'?: string | undefined;
  readonly '--forge-search-input-input-search-spinner-border-width'?: string | undefined;
  readonly '--forge-search-input-input-search-spinner-duration'?: string | undefined;
  readonly '--forge-search-input-input-search-spinner-radius'?: string | undefined;
  readonly '--forge-search-input-input-size-2xl-font-size'?: string | undefined;
  readonly '--forge-search-input-input-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-search-input-input-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-search-input-input-size-2xs-font-size'?: string | undefined;
  readonly '--forge-search-input-input-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-search-input-input-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-search-input-input-size-lg-font-size'?: string | undefined;
  readonly '--forge-search-input-input-size-lg-padding-block'?: string | undefined;
  readonly '--forge-search-input-input-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-search-input-input-size-md-font-size'?: string | undefined;
  readonly '--forge-search-input-input-size-md-padding-block'?: string | undefined;
  readonly '--forge-search-input-input-size-md-padding-inline'?: string | undefined;
  readonly '--forge-search-input-input-size-sm-font-size'?: string | undefined;
  readonly '--forge-search-input-input-size-sm-padding-block'?: string | undefined;
  readonly '--forge-search-input-input-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-search-input-input-size-xl-font-size'?: string | undefined;
  readonly '--forge-search-input-input-size-xl-padding-block'?: string | undefined;
  readonly '--forge-search-input-input-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-search-input-input-size-xs-font-size'?: string | undefined;
  readonly '--forge-search-input-input-size-xs-padding-block'?: string | undefined;
  readonly '--forge-search-input-input-size-xs-padding-inline'?: string | undefined;
  readonly '--forge-search-input-input-surface-default'?: string | undefined;
  readonly '--forge-search-input-input-surface-disabled'?: string | undefined;
  readonly '--forge-search-input-input-text-default'?: string | undefined;
  readonly '--forge-search-input-input-text-disabled'?: string | undefined;
  readonly '--forge-search-input-input-text-placeholder'?: string | undefined;
};

function createSearchInputStyle(
  properties: Readonly<SearchInputStyleProperties> | undefined,
): SearchInputStyle | undefined {
  return createForgeStyle({
    '--forge-search-input-input-border-default': properties?.['input-border-default'],
    '--forge-search-input-input-border-focus-visible': properties?.['input-border-focus-visible'],
    '--forge-search-input-input-border-width': properties?.['input-border-width'],
    '--forge-search-input-input-focus-ring': properties?.['input-focus-ring'],
    '--forge-search-input-input-font-family': properties?.['input-font-family'],
    '--forge-search-input-input-radius': properties?.['input-radius'],
    '--forge-search-input-input-search-clear-radius': properties?.['input-search-clear-radius'],
    '--forge-search-input-input-search-clear-text-default': properties?.['input-search-clear-text-default'],
    '--forge-search-input-input-search-clear-text-hover': properties?.['input-search-clear-text-hover'],
    '--forge-search-input-input-search-gap': properties?.['input-search-gap'],
    '--forge-search-input-input-search-icon-text': properties?.['input-search-icon-text'],
    '--forge-search-input-input-search-spinner-border-width': properties?.['input-search-spinner-border-width'],
    '--forge-search-input-input-search-spinner-duration': properties?.['input-search-spinner-duration'],
    '--forge-search-input-input-search-spinner-radius': properties?.['input-search-spinner-radius'],
    '--forge-search-input-input-size-2xl-font-size': properties?.['input-size-2xl-font-size'],
    '--forge-search-input-input-size-2xl-padding-block': properties?.['input-size-2xl-padding-block'],
    '--forge-search-input-input-size-2xl-padding-inline': properties?.['input-size-2xl-padding-inline'],
    '--forge-search-input-input-size-2xs-font-size': properties?.['input-size-2xs-font-size'],
    '--forge-search-input-input-size-2xs-padding-block': properties?.['input-size-2xs-padding-block'],
    '--forge-search-input-input-size-2xs-padding-inline': properties?.['input-size-2xs-padding-inline'],
    '--forge-search-input-input-size-lg-font-size': properties?.['input-size-lg-font-size'],
    '--forge-search-input-input-size-lg-padding-block': properties?.['input-size-lg-padding-block'],
    '--forge-search-input-input-size-lg-padding-inline': properties?.['input-size-lg-padding-inline'],
    '--forge-search-input-input-size-md-font-size': properties?.['input-size-md-font-size'],
    '--forge-search-input-input-size-md-padding-block': properties?.['input-size-md-padding-block'],
    '--forge-search-input-input-size-md-padding-inline': properties?.['input-size-md-padding-inline'],
    '--forge-search-input-input-size-sm-font-size': properties?.['input-size-sm-font-size'],
    '--forge-search-input-input-size-sm-padding-block': properties?.['input-size-sm-padding-block'],
    '--forge-search-input-input-size-sm-padding-inline': properties?.['input-size-sm-padding-inline'],
    '--forge-search-input-input-size-xl-font-size': properties?.['input-size-xl-font-size'],
    '--forge-search-input-input-size-xl-padding-block': properties?.['input-size-xl-padding-block'],
    '--forge-search-input-input-size-xl-padding-inline': properties?.['input-size-xl-padding-inline'],
    '--forge-search-input-input-size-xs-font-size': properties?.['input-size-xs-font-size'],
    '--forge-search-input-input-size-xs-padding-block': properties?.['input-size-xs-padding-block'],
    '--forge-search-input-input-size-xs-padding-inline': properties?.['input-size-xs-padding-inline'],
    '--forge-search-input-input-surface-default': properties?.['input-surface-default'],
    '--forge-search-input-input-surface-disabled': properties?.['input-surface-disabled'],
    '--forge-search-input-input-text-default': properties?.['input-text-default'],
    '--forge-search-input-input-text-disabled': properties?.['input-text-disabled'],
    '--forge-search-input-input-text-placeholder': properties?.['input-text-placeholder'],
  }) as SearchInputStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<SearchInputStyleProperties>;
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
  const style = createSearchInputStyle(properties.properties);

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
      style={style}
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
