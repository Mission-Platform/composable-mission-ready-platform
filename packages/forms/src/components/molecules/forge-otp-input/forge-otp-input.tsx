import { useEffect, useRef, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';

import styles from './forge-otp-input.module.scss';

/** Character set accepted by the OTP cells. */
export type OtpInputType = 'numeric' | 'alphanumeric' | 'text';

/** Cell sizing scale — canonical 2xs → 2xl scale. */
export type OtpInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface OtpInputStyleProperties {
  readonly 'input-otp-border-default'?: string;
  readonly 'input-otp-border-focus'?: string;
  readonly 'input-otp-border-width'?: string;
  readonly 'input-otp-disabled-opacity'?: string;
  readonly 'input-otp-focus-ring'?: string;
  readonly 'input-otp-font-family'?: string;
  readonly 'input-otp-font-weight'?: string;
  readonly 'input-otp-gap'?: string;
  readonly 'input-otp-radius'?: string;
  readonly 'input-otp-size-2xl-cell'?: string;
  readonly 'input-otp-size-2xl-font-size'?: string;
  readonly 'input-otp-size-2xs-cell'?: string;
  readonly 'input-otp-size-2xs-font-size'?: string;
  readonly 'input-otp-size-lg-cell'?: string;
  readonly 'input-otp-size-lg-font-size'?: string;
  readonly 'input-otp-size-md-cell'?: string;
  readonly 'input-otp-size-md-font-size'?: string;
  readonly 'input-otp-size-sm-cell'?: string;
  readonly 'input-otp-size-sm-font-size'?: string;
  readonly 'input-otp-size-xl-cell'?: string;
  readonly 'input-otp-size-xl-font-size'?: string;
  readonly 'input-otp-size-xs-cell'?: string;
  readonly 'input-otp-size-xs-font-size'?: string;
  readonly 'input-otp-surface'?: string;
  readonly 'input-otp-text'?: string;
  readonly 'otp-cell-size'?: string;
  readonly 'otp-font-size'?: string;
}

export type OtpInputStyle = CSSStyleProperties & {
  readonly '--forge-otp-input-input-otp-border-default'?: string | undefined;
  readonly '--forge-otp-input-input-otp-border-focus'?: string | undefined;
  readonly '--forge-otp-input-input-otp-border-width'?: string | undefined;
  readonly '--forge-otp-input-input-otp-disabled-opacity'?: string | undefined;
  readonly '--forge-otp-input-input-otp-focus-ring'?: string | undefined;
  readonly '--forge-otp-input-input-otp-font-family'?: string | undefined;
  readonly '--forge-otp-input-input-otp-font-weight'?: string | undefined;
  readonly '--forge-otp-input-input-otp-gap'?: string | undefined;
  readonly '--forge-otp-input-input-otp-radius'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-2xl-cell'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-2xl-font-size'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-2xs-cell'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-2xs-font-size'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-lg-cell'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-lg-font-size'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-md-cell'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-md-font-size'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-sm-cell'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-sm-font-size'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-xl-cell'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-xl-font-size'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-xs-cell'?: string | undefined;
  readonly '--forge-otp-input-input-otp-size-xs-font-size'?: string | undefined;
  readonly '--forge-otp-input-input-otp-surface'?: string | undefined;
  readonly '--forge-otp-input-input-otp-text'?: string | undefined;
  readonly '--forge-otp-input-otp-cell-size'?: string | undefined;
  readonly '--forge-otp-input-otp-font-size'?: string | undefined;
};

function createOtpInputStyle(properties: Readonly<OtpInputStyleProperties> | undefined): OtpInputStyle | undefined {
  return createForgeStyle({
    '--forge-otp-input-input-otp-border-default': properties?.['input-otp-border-default'],
    '--forge-otp-input-input-otp-border-focus': properties?.['input-otp-border-focus'],
    '--forge-otp-input-input-otp-border-width': properties?.['input-otp-border-width'],
    '--forge-otp-input-input-otp-disabled-opacity': properties?.['input-otp-disabled-opacity'],
    '--forge-otp-input-input-otp-focus-ring': properties?.['input-otp-focus-ring'],
    '--forge-otp-input-input-otp-font-family': properties?.['input-otp-font-family'],
    '--forge-otp-input-input-otp-font-weight': properties?.['input-otp-font-weight'],
    '--forge-otp-input-input-otp-gap': properties?.['input-otp-gap'],
    '--forge-otp-input-input-otp-radius': properties?.['input-otp-radius'],
    '--forge-otp-input-input-otp-size-2xl-cell': properties?.['input-otp-size-2xl-cell'],
    '--forge-otp-input-input-otp-size-2xl-font-size': properties?.['input-otp-size-2xl-font-size'],
    '--forge-otp-input-input-otp-size-2xs-cell': properties?.['input-otp-size-2xs-cell'],
    '--forge-otp-input-input-otp-size-2xs-font-size': properties?.['input-otp-size-2xs-font-size'],
    '--forge-otp-input-input-otp-size-lg-cell': properties?.['input-otp-size-lg-cell'],
    '--forge-otp-input-input-otp-size-lg-font-size': properties?.['input-otp-size-lg-font-size'],
    '--forge-otp-input-input-otp-size-md-cell': properties?.['input-otp-size-md-cell'],
    '--forge-otp-input-input-otp-size-md-font-size': properties?.['input-otp-size-md-font-size'],
    '--forge-otp-input-input-otp-size-sm-cell': properties?.['input-otp-size-sm-cell'],
    '--forge-otp-input-input-otp-size-sm-font-size': properties?.['input-otp-size-sm-font-size'],
    '--forge-otp-input-input-otp-size-xl-cell': properties?.['input-otp-size-xl-cell'],
    '--forge-otp-input-input-otp-size-xl-font-size': properties?.['input-otp-size-xl-font-size'],
    '--forge-otp-input-input-otp-size-xs-cell': properties?.['input-otp-size-xs-cell'],
    '--forge-otp-input-input-otp-size-xs-font-size': properties?.['input-otp-size-xs-font-size'],
    '--forge-otp-input-input-otp-surface': properties?.['input-otp-surface'],
    '--forge-otp-input-input-otp-text': properties?.['input-otp-text'],
    '--forge-otp-input-otp-cell-size': properties?.['otp-cell-size'],
    '--forge-otp-input-otp-font-size': properties?.['otp-font-size'],
  }) as OtpInputStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface OtpInputProperties {
  /**
   * The current code (controlled via `modelValue` + `onUpdateModelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: string;
  /** Number of cells / expected code length. Defaults to `6`. */
  length?: number;
  /** Accepted character set. Defaults to `'numeric'`. */
  type?: OtpInputType;
  /** Disable every cell. */
  disabled?: boolean;
  /** Focus the first cell on mount. */
  autofocus?: boolean;
  /** Obscure the entered characters (renders password cells). */
  mask?: boolean;
  /** Cell size. Defaults to `'md'`. */
  size?: OtpInputSize;
  /** Accessible label for the whole group. */
  ariaLabel?: string;
  /** Fired with the next code (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string) => void;
  /** Fired once every cell is filled, with the full code. */
  onComplete?: (value: string) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<OtpInputStyleProperties>;
}

/**
 * `ForgeOtpInput` — segmented one-time-password input authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * Renders `length` single-character cells bound to a single string
 * `modelValue`. Typing advances focus, `Backspace` steps back, arrow keys move
 * between cells, and pasting distributes the code. It owns its styling through
 * the co-located CSS Module `forge-otp-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the Vue template **ref array** (the
 * neutral dialect models only single element refs) becomes a single container
 * `useRef` plus `querySelectorAll('input')` for focus management (as
 * `ForgeSegmentControl` does); `nextTick` is dropped (the cells already exist, so
 * focus moves synchronously); the `onMounted` autofocus becomes a `useEffect`;
 * and the `v-model` + `complete` emit become the `onUpdateModelValue`/
 * `onComplete` callback props.
 */
export function ForgeOtpInput(properties: Readonly<OtpInputProperties>): MpElement {
  const style = createOtpInputStyle(properties.properties);

  const {
    modelValue = '',
    length = 6,
    type = 'numeric',
    disabled = false,
    autofocus = false,
    mask = false,
    size = 'md',
    ariaLabel,
  } = properties;

  const containerReference = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (autofocus && !disabled) {
      const first = containerReference.current?.querySelector<HTMLInputElement>('input');
      first?.focus();
      first?.select();
    }
  }, []);

  const characterList = [...modelValue].slice(0, length);
  const characters = Array.from({ length }, (_, index) => characterList[index] ?? '');
  const inputMode = type === 'numeric' ? 'numeric' : 'text';

  const sanitize = (value: string): string => {
    switch (type) {
      case 'numeric': {
        return value.replaceAll(/\D/g, '');
      }
      case 'alphanumeric': {
        return value.replaceAll(/[^a-zA-Z0-9]/g, '');
      }
      default: {
        return value;
      }
    }
  };

  const commit = (chars: string[]): void => {
    const next = chars.join('').slice(0, length);
    if (next !== modelValue) {
      properties.onUpdateModelValue?.(next);
    }
    if (next.length === length) {
      properties.onComplete?.(next);
    }
  };

  const focusCell = (index: number): void => {
    const inputs = containerReference.current?.querySelectorAll<HTMLInputElement>('input');
    const target = inputs?.[Math.max(0, Math.min(length - 1, index))];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const onInput = (index: number, event: Event): void => {
    const input = event.target as HTMLInputElement;
    const sanitized = sanitize(input.value);
    const next = [...characters];

    if (sanitized.length > 1) {
      const incoming = [...sanitized];
      for (let offset = 0; offset < incoming.length && index + offset < length; offset += 1) {
        next[index + offset] = incoming[offset];
      }
      commit(next);
      focusCell(index + incoming.length);
      return;
    }

    next[index] = sanitized.slice(-1);
    input.value = next[index];
    commit(next);
    if (next[index]) {
      focusCell(index + 1);
    }
  };

  const onKeydown = (index: number, event: KeyboardEvent): void => {
    switch (event.key) {
      case 'Backspace': {
        if (characters[index]) {
          const next = [...characters];
          next[index] = '';
          commit(next);
        } else if (index > 0) {
          event.preventDefault();
          const next = [...characters];
          next[index - 1] = '';
          commit(next);
          focusCell(index - 1);
        }
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        focusCell(index - 1);
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        focusCell(index + 1);
        break;
      }
      default: {
        break;
      }
    }
  };

  const onPaste = (index: number, event: ClipboardEvent): void => {
    event.preventDefault();
    const pasted = sanitize(event.clipboardData?.getData('text') ?? '');
    if (!pasted) {
      return;
    }
    const next = [...characters];
    const incoming = [...pasted];
    for (let offset = 0; offset < incoming.length && index + offset < length; offset += 1) {
      next[index + offset] = incoming[offset];
    }
    commit(next);
    focusCell(Math.min(index + incoming.length, length - 1));
  };

  return (
    <fieldset
      ref={containerReference}
      aria-label={ariaLabel}
      className={[
        styles['forge-otp-input'],
        styles[`forge-otp-input--${size}`],
        {
          [styles['forge-otp-input--disabled']]: disabled,
        },
      ]}
      style={style}
    >
      {characters.map((char, index) => (
        <input
          key={index}
          aria-label={`Digit ${index + 1} of ${length}`}
          autocomplete={index === 0 ? 'one-time-code' : 'off'}
          className={styles['forge-otp-input__cell']}
          disabled={disabled}
          inputmode={inputMode}
          maxlength={1}
          type={mask ? 'password' : 'text'}
          value={char}
          onInput={(event: Event) => onInput(index, event)}
          onKeydown={(event: KeyboardEvent) => onKeydown(index, event)}
          onPaste={(event: ClipboardEvent) => onPaste(index, event)}
        />
      ))}
    </fieldset>
  );
}
