import { h, useEffect, useRef, type MpElement, type MpProperties } from '@mission-platform/jsx';

import styles from './base-otp-input.module.scss';

/** Character set accepted by the OTP cells. */
export type OtpInputType = 'numeric' | 'alphanumeric' | 'text';

/** Cell sizing scale — canonical 2xs → 2xl scale. */
export type OtpInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface OtpInputProperties extends MpProperties {
  /** The current code (controlled via `modelValue` + `onUpdateModelValue`). */
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
}

/**
 * `BaseOtpInput` — segmented one-time-password input authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * Renders `length` single-character cells bound to a single string
 * `modelValue`. Typing advances focus, `Backspace` steps back, arrow keys move
 * between cells, and pasting distributes the code. It owns its styling through
 * the co-located CSS Module `base-otp-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the Vue template **ref array** (the
 * neutral dialect models only single element refs) becomes a single container
 * `useRef` plus `querySelectorAll('input')` for focus management (as
 * `BaseSegmentControl` does); `nextTick` is dropped (the cells already exist, so
 * focus moves synchronously); the `onMounted` autofocus becomes a `useEffect`;
 * and the `v-model` + `complete` emit become the `onUpdateModelValue`/
 * `onComplete` callback props.
 */
export function BaseOtpInput(properties: OtpInputProperties): MpElement {
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
      classNames={[styles['base-otp-input'], styles[`base-otp-input--${size}`], {
        [styles['base-otp-input--disabled']]: disabled,
      }]}
    >
      {characters.map((char, index) => (
        <input
          key={index}
          aria-label={`Digit ${index + 1} of ${length}`}
          autocomplete={index === 0 ? 'one-time-code' : 'off'}
          classNames={styles['base-otp-input__cell']}
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
