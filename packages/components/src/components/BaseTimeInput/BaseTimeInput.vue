<script lang="ts" setup>
  import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

  import { useId } from '../../composables/use-id';
  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  export type TimeInputSize = 'sm' | 'md' | 'lg';

  // modelValue: "HH:MM" or "HH:MM:SS"
  const props = withDefaults(
    defineProps<{
      modelValue?: string;
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      required?: boolean;
      size?: TimeInputSize;
      showSeconds?: boolean;
      id?: string;
    }>(),
    {
      modelValue: '',
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      size: 'md',
      showSeconds: false,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string];
    change: [value: string];
  }>();

  const { id: resolvedId } = useId(props.id);

  const open = ref(false);
  const popoverRef = ref<HTMLElement | null>(null);
  const triggerRef = ref<HTMLElement | null>(null);

  const { floatingStyles } = useFloating(triggerRef, popoverRef, {
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  function parseTime(val: string) {
    const parts = val ? val.split(':') : [];
    return {
      h: parts[0] ? parseInt(parts[0], 10) : 0,
      m: parts[1] ? parseInt(parts[1], 10) : 0,
      s: parts[2] ? parseInt(parts[2], 10) : 0,
    };
  }

  const localH = ref(0);
  const localM = ref(0);
  const localS = ref(0);

  watch(
    () => props.modelValue,
    (val) => {
      const p = parseTime(val);
      localH.value = p.h;
      localM.value = p.m;
      localS.value = p.s;
    },
    { immediate: true },
  );

  function pad(n: number) {
    return String(n).padStart(2, '0');
  }

  function emitValue() {
    const val = props.showSeconds
      ? `${pad(localH.value)}:${pad(localM.value)}:${pad(localS.value)}`
      : `${pad(localH.value)}:${pad(localM.value)}`;
    emit('update:modelValue', val);
    emit('change', val);
  }

  function clamp(val: number, min: number, max: number) {
    return Math.min(max, Math.max(min, val));
  }

  function setH(n: number) {
    localH.value = clamp(n, 0, 23);
    emitValue();
  }
  function setM(n: number) {
    localM.value = clamp(n, 0, 59);
    emitValue();
  }
  function setS(n: number) {
    localS.value = clamp(n, 0, 59);
    emitValue();
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const seconds = Array.from({ length: 60 }, (_, i) => i);

  function toggleOpen() {
    if (props.disabled) return;
    open.value = !open.value;
  }

  function onClickOutside(e: MouseEvent) {
    const t = e.target as Node;
    if (popoverRef.value && !popoverRef.value.contains(t) && triggerRef.value && !triggerRef.value.contains(t))
      open.value = false;
  }

  onMounted(() => document.addEventListener('mousedown', onClickOutside));
  onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside));

  const displayValue = computed(() => {
    if (!props.modelValue) return '';
    const p = parseTime(props.modelValue);
    return props.showSeconds ? `${pad(p.h)}:${pad(p.m)}:${pad(p.s)}` : `${pad(p.h)}:${pad(p.m)}`;
  });

  const placeholder = computed(() => (props.showSeconds ? 'HH:MM:SS' : 'HH:MM'));
</script>

<template>
  <div
    :class="[
      'base-time-input',
      `base-time-input--${size}`,
      { 'base-time-input--error': !!error, 'base-time-input--disabled': disabled },
    ]"
  >
    <label
      v-if="label"
      :class="['base-time-input__label', { 'base-time-input__label--hidden': labelHidden }]"
      :for="resolvedId"
    >
      <BaseTypography
        as="span"
        color="primary"
        variant="label"
      >
        {{ label }}
      </BaseTypography>
      <span
        v-if="required"
        aria-hidden="true"
        class="base-time-input__required"
      >
        *
      </span>
    </label>

    <button
      :id="resolvedId"
      ref="triggerRef"
      :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
      :aria-expanded="open"
      :aria-haspopup="'dialog'"
      :aria-invalid="!!error || undefined"
      :aria-label="label ?? 'Time picker'"
      class="base-time-input__trigger"
      type="button"
      @click="toggleOpen"
      @keydown.escape="open = false"
    >
      <span :class="['base-time-input__value', { 'base-time-input__value--placeholder': !displayValue }]">
        {{ displayValue || placeholder }}
      </span>
      <span
        aria-hidden="true"
        class="base-time-input__icon"
      >
        <svg
          fill="none"
          height="16"
          viewBox="0 0 16 16"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="8"
            cy="8"
            r="6.5"
            stroke="currentColor"
          />
          <path
            d="M8 5V8.5L10.5 10"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </button>

    <div
      v-show="open"
      ref="popoverRef"
      :aria-label="`${label ?? 'Time'} picker`"
      :style="floatingStyles"
      class="base-time-input__popover"
      role="dialog"
    >
      <div class="base-time-input__columns">
        <div class="base-time-input__col">
          <div class="base-time-input__col-header">
            HH
          </div>
          <div class="base-time-input__scroll">
            <button
              v-for="h in hours"
              :key="`h-${h}`"
              :class="['base-time-input__unit-btn', { 'base-time-input__unit-btn--active': localH === h }]"
              type="button"
              @click.stop="setH(h)"
            >
              {{ pad(h) }}
            </button>
          </div>
        </div>

        <span class="base-time-input__sep">:</span>

        <div class="base-time-input__col">
          <div class="base-time-input__col-header">
            MM
          </div>
          <div class="base-time-input__scroll">
            <button
              v-for="m in minutes"
              :key="`m-${m}`"
              :class="['base-time-input__unit-btn', { 'base-time-input__unit-btn--active': localM === m }]"
              type="button"
              @click.stop="setM(m)"
            >
              {{ pad(m) }}
            </button>
          </div>
        </div>

        <template v-if="showSeconds">
          <span class="base-time-input__sep">:</span>
          <div class="base-time-input__col">
            <div class="base-time-input__col-header">
              SS
            </div>
            <div class="base-time-input__scroll">
              <button
                v-for="s in seconds"
                :key="`s-${s}`"
                :class="['base-time-input__unit-btn', { 'base-time-input__unit-btn--active': localS === s }]"
                type="button"
                @click.stop="setS(s)"
              >
                {{ pad(s) }}
              </button>
            </div>
          </div>
        </template>
      </div>

      <div class="base-time-input__footer">
        <button
          class="base-time-input__done-btn"
          type="button"
          @click.stop="open = false"
        >
          Done
        </button>
      </div>
    </div>

    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-time-input__error"
      color="inherit"
      role="alert"
      variant="caption"
    >
      {{ error }}
    </BaseTypography>
    <BaseTypography
      v-else-if="hint"
      :id="`${resolvedId}-hint`"
      as="p"
      class="base-time-input__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-time-input {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);
    position: relative;

    &__label {
      display: flex;
      align-items: center;
      gap: 2px;

      &--hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }
    }

    &__required {
      color: var(--mp-color-danger-default);
      margin-left: 2px;
    }

    &__trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      appearance: none;
      width: 100%;
      text-align: left;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      background-color: var(--mp-color-bg-surface);
      cursor: pointer;
      transition:
        border-color 150ms ease,
        box-shadow 150ms ease;
      user-select: none;

      &:focus {
        outline: none;
        border-color: var(--mp-color-border-focus);
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    &__value {
      @include mp.mp-font-body-md;

      color: var(--mp-color-text-primary);

      &--placeholder {
        color: var(--mp-color-text-tertiary);
      }
    }

    &__icon {
      color: var(--mp-color-text-secondary);
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    /* Sizes */
    &--sm .base-time-input__trigger {
      padding: var(--mp-spacing-1) var(--mp-spacing-2);

      .base-time-input__value {
        font-size: var(--mp-font-size-sm);
      }
    }

    &--md .base-time-input__trigger {
      padding: var(--mp-spacing-2) var(--mp-spacing-3);

      .base-time-input__value {
        font-size: var(--mp-font-size-md);
      }
    }

    &--lg .base-time-input__trigger {
      padding: var(--mp-spacing-3) var(--mp-spacing-4);

      .base-time-input__value {
        font-size: var(--mp-font-size-lg);
      }
    }

    &--error .base-time-input__trigger {
      border-color: var(--mp-color-danger-default);

      &:focus {
        box-shadow: var(--mp-shadow-focus-danger);
      }
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-time-input__trigger {
        background-color: var(--mp-color-bg-muted);
        cursor: not-allowed;
      }
    }

    &__error {
      color: var(--mp-color-danger-text);
      margin: 0;
    }

    &__hint {
      margin: 0;
    }

    /* Popover */
    &__popover {
      position: fixed;
      z-index: 200;
      margin: 0;
      background: var(--mp-color-bg-surface);
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-lg);
      box-shadow: var(--mp-shadow-lg);
      padding: var(--mp-spacing-3);
    }

    &__columns {
      display: flex;
      align-items: flex-start;
      gap: var(--mp-spacing-1);
    }

    &__sep {
      font-size: var(--mp-font-size-md);
      color: var(--mp-color-text-secondary);
      padding-top: 36px;
      line-height: 1;
    }

    &__col {
      display: flex;
      flex-direction: column;
      min-width: 52px;
    }

    &__col-header {
      @include mp.mp-font-caption;

      font-weight: var(--mp-font-weight-medium);
      color: var(--mp-color-text-tertiary);
      text-align: center;
      margin-bottom: var(--mp-spacing-1);
      padding-bottom: var(--mp-spacing-1);
      border-bottom: 1px solid var(--mp-color-border-default);
    }

    &__scroll {
      max-height: 200px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1px;
      scrollbar-width: thin;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--mp-color-border-default);
        border-radius: 2px;
      }
    }

    &__unit-btn {
      @include mp.mp-font-body-sm;

      padding: var(--mp-spacing-1) var(--mp-spacing-2);
      border: none;
      background: transparent;
      border-radius: var(--mp-radius-sm);
      cursor: pointer;
      color: var(--mp-color-text-primary);
      text-align: center;
      transition:
        background-color 150ms ease,
        color 150ms ease;
      width: 100%;

      &--active {
        background-color: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);
        font-weight: var(--mp-font-weight-semibold);
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }

      &:hover:not(&--active) {
        background-color: var(--mp-color-bg-muted);
      }
    }

    &__footer {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--mp-spacing-2);
      padding-top: var(--mp-spacing-2);
      border-top: 1px solid var(--mp-color-border-default);
    }

    &__done-btn {
      @include mp.mp-font-label;

      padding: var(--mp-spacing-1) var(--mp-spacing-3);
      border: none;
      background-color: var(--mp-color-primary-default);
      color: var(--mp-color-text-on-primary);
      border-radius: var(--mp-radius-md);
      cursor: pointer;
      transition: opacity 150ms ease;

      &:hover {
        opacity: 0.9;
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }
    }
  }
</style>
