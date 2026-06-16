<script lang="ts" setup>
  /**
   * `BaseOtpInput` — a segmented one-time-password / verification-code input.
   *
   * Renders `length` single-character cells bound to a single string
   * `modelValue` (`v-model`). Typing advances focus to the next cell;
   * `Backspace` clears and steps back; the arrow keys move between cells; and
   * pasting a code distributes its characters across the cells. The `type` prop
   * restricts and validates accepted characters and sets the right
   * `inputmode` / virtual keyboard.
   *
   * Accessibility: the cells are wrapped in a labelled `<fieldset>`, each cell
   * is an `<input>` with an indexed `aria-label`, and `mask` swaps to
   * `type="password"` to obscure sensitive codes.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, nextTick, onMounted, ref } from 'vue';

  /** Character set accepted by the OTP cells. */
  export type OtpInputType = 'numeric' | 'alphanumeric' | 'text';

  /** Cell sizing scale. */
  export type OtpInputSize = 'sm' | 'md' | 'lg';

  const props = withDefaults(
    defineProps<{
      /** The current code (`v-model`). */
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
    }>(),
    {
      modelValue: '',
      length: 6,
      type: 'numeric',
      disabled: false,
      autofocus: false,
      mask: false,
      size: 'md',
      ariaLabel: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string];
    /** Emitted once every cell is filled. Payload is the full code. */
    complete: [value: string];
  }>();

  const cells = ref<HTMLInputElement[]>([]);

  /** The model split into exactly `length` single-character slots. */
  const characters = computed<string[]>(() => {
    const chars = [...props.modelValue].slice(0, props.length);
    return Array.from({ length: props.length }, (_, index) => chars[index] ?? '');
  });

  const inputMode = computed(() => (props.type === 'numeric' ? 'numeric' : 'text'));

  /** Returns the subset of `value` that matches the accepted character set. */
  function sanitize(value: string): string {
    switch (props.type) {
      case 'numeric':
        return value.replace(/\D/g, '');
      case 'alphanumeric':
        return value.replace(/[^a-zA-Z0-9]/g, '');
      default:
        return value;
    }
  }

  function commit(chars: string[]): void {
    const next = chars.join('').slice(0, props.length);
    if (next !== props.modelValue) emit('update:modelValue', next);
    if (next.length === props.length) emit('complete', next);
  }

  function focusCell(index: number): void {
    const target = cells.value[Math.max(0, Math.min(props.length - 1, index))];
    if (target) {
      target.focus();
      target.select();
    }
  }

  function onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = sanitize(input.value);
    const next = [...characters.value];

    if (sanitized.length > 1) {
      // The browser delivered multiple chars (e.g. autofill) — spread them.
      const incoming = [...sanitized];
      for (let offset = 0; offset < incoming.length && index + offset < props.length; offset++) {
        next[index + offset] = incoming[offset];
      }
      commit(next);
      void nextTick(() => focusCell(index + incoming.length));
      return;
    }

    next[index] = sanitized.slice(-1);
    input.value = next[index];
    commit(next);
    if (next[index]) void nextTick(() => focusCell(index + 1));
  }

  function onKeydown(index: number, event: KeyboardEvent): void {
    switch (event.key) {
      case 'Backspace': {
        if (characters.value[index]) {
          const next = [...characters.value];
          next[index] = '';
          commit(next);
        } else if (index > 0) {
          event.preventDefault();
          const next = [...characters.value];
          next[index - 1] = '';
          commit(next);
          focusCell(index - 1);
        }
        break;
      }
      case 'ArrowLeft':
        event.preventDefault();
        focusCell(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        focusCell(index + 1);
        break;
      default:
        break;
    }
  }

  function onPaste(index: number, event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = sanitize(event.clipboardData?.getData('text') ?? '');
    if (!pasted) return;
    const next = [...characters.value];
    const incoming = [...pasted];
    for (let offset = 0; offset < incoming.length && index + offset < props.length; offset++) {
      next[index + offset] = incoming[offset];
    }
    commit(next);
    void nextTick(() => focusCell(Math.min(index + incoming.length, props.length - 1)));
  }

  onMounted(() => {
    if (props.autofocus && !props.disabled) focusCell(0);
  });
</script>

<template>
  <fieldset
    :aria-label="ariaLabel"
    :class="['base-otp-input', `base-otp-input--${size}`, { 'base-otp-input--disabled': disabled }]"
  >
    <input
      v-for="(char, index) in characters"
      :key="index"
      ref="cells"
      :aria-label="`Digit ${index + 1} of ${length}`"
      :autocomplete="index === 0 ? 'one-time-code' : 'off'"
      :disabled="disabled"
      :inputmode="inputMode"
      :type="mask ? 'password' : 'text'"
      :value="char"
      class="base-otp-input__cell"
      maxlength="1"
      @input="onInput(index, $event)"
      @keydown="onKeydown(index, $event)"
      @paste="onPaste(index, $event)"
    />
  </fieldset>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-otp-input {
      --mp-otp-cell-size: 3rem;
      --mp-otp-font-size: var(--mp-size-font-lg);

      display: inline-flex;
      gap: var(--mp-spacing-2);
      margin: 0;
      padding: 0;
      border: 0;
      min-inline-size: auto;

      &--sm {
        --mp-otp-cell-size: 2.5rem;
        --mp-otp-font-size: var(--mp-size-font-md);
      }

      &--lg {
        --mp-otp-cell-size: 3.5rem;
        --mp-otp-font-size: var(--mp-size-font-xl);
      }

      &__cell {
        width: var(--mp-otp-cell-size);
        height: var(--mp-otp-cell-size);
        padding: 0;
        text-align: center;
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-otp-font-size);
        font-weight: var(--mp-font-weight-semibold, 600);
        color: var(--mp-color-text-primary);
        background-color: var(--mp-color-bg-surface);
        border: 1px solid var(--mp-color-border-default);
        border-radius: var(--mp-radius-md);
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;

        &:focus {
          outline: none;
          border-color: var(--mp-color-primary-default);
          box-shadow: var(--mp-shadow-focus-primary);
        }
      }

      &--disabled &__cell {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
</style>
