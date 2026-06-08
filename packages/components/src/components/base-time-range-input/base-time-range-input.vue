<script lang="ts" setup>
  /**
   * `BaseTimeRangeInput` — Time range input component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
  import { IconArrow } from '@mission-platform/icons';
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

  import { useId } from '../../composables/use-id';
  import { useZIndex } from '../../composables/use-z-index';
  import BaseTypography from '../base-typography/base-typography.vue';

  export type TimeRangeInputSize = 'sm' | 'md' | 'lg';

  export interface TimeRange {
    start: string;
    end: string;
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: TimeRange;
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      required?: boolean;
      size?: TimeRangeInputSize;
      showSeconds?: boolean;
      id?: string;
    }>(),
    {
      modelValue: () => ({ start: '', end: '' }),
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
    'update:modelValue': [value: TimeRange];
    change: [value: TimeRange];
  }>();

  const { id: resolvedId } = useId(props.id);
  const { zIndex } = useZIndex('inputPopover');

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

  function pad(n: number) {
    return String(n).padStart(2, '0');
  }

  function formatTime(h: number, m: number, s: number, withSec: boolean) {
    return withSec ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}`;
  }

  const startH = ref(0);
  const startM = ref(0);
  const startS = ref(0);
  const endH = ref(0);
  const endM = ref(0);
  const endS = ref(0);

  watch(
    () => props.modelValue,
    (val) => {
      if (val?.start) {
        const p = parseTime(val.start);
        startH.value = p.h;
        startM.value = p.m;
        startS.value = p.s;
      }
      if (val?.end) {
        const p = parseTime(val.end);
        endH.value = p.h;
        endM.value = p.m;
        endS.value = p.s;
      }
    },
    { immediate: true },
  );

  function clamp(val: number, min: number, max: number) {
    return Math.min(max, Math.max(min, val));
  }

  function emitValue() {
    const range: TimeRange = {
      start: formatTime(startH.value, startM.value, startS.value, props.showSeconds),
      end: formatTime(endH.value, endM.value, endS.value, props.showSeconds),
    };
    emit('update:modelValue', range);
    emit('change', range);
  }

  function setStartH(n: number) {
    startH.value = clamp(n, 0, 23);
    emitValue();
  }
  function setStartM(n: number) {
    startM.value = clamp(n, 0, 59);
    emitValue();
  }
  function setStartS(n: number) {
    startS.value = clamp(n, 0, 59);
    emitValue();
  }
  function setEndH(n: number) {
    endH.value = clamp(n, 0, 23);
    emitValue();
  }
  function setEndM(n: number) {
    endM.value = clamp(n, 0, 59);
    emitValue();
  }
  function setEndS(n: number) {
    endS.value = clamp(n, 0, 59);
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
    const s = props.modelValue?.start;
    const e = props.modelValue?.end;
    if (s && e) return `${s}  →  ${e}`;
    if (s) return `${s}  →  …`;
    return '';
  });

  const fmt = computed(() => (props.showSeconds ? 'HH:MM:SS' : 'HH:MM'));
</script>

<template>
  <div
    :class="[
      'base-time-range',
      `base-time-range--${size}`,
      { 'base-time-range--error': !!error, 'base-time-range--disabled': disabled },
    ]"
  >
    <label
      v-if="label"
      :class="['base-time-range__label', { 'base-time-range__label--hidden': labelHidden }]"
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
        class="base-time-range__required"
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
      :aria-label="label ?? 'Time range picker'"
      class="base-time-range__trigger"
      type="button"
      @click="toggleOpen"
      @keydown.escape="open = false"
    >
      <span :class="['base-time-range__value', { 'base-time-range__value--placeholder': !displayValue }]">
        {{ displayValue || `${fmt}  →  ${fmt}` }}
      </span>
      <span
        aria-hidden="true"
        class="base-time-range__icon"
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

    <Teleport to="body">
      <div
        v-show="open"
        ref="popoverRef"
        :aria-label="`${label ?? 'Time range'} picker`"
        :style="{ ...floatingStyles, zIndex }"
        class="base-time-range__popover"
        role="dialog"
      >
        <div class="base-time-range__panels">
          <!-- Start panel -->
          <div class="base-time-range__panel">
            <BaseTypography
              as="div"
              class="base-time-range__panel-title"
              color="secondary"
              variant="caption"
            >
              Start
            </BaseTypography>
            <div class="base-time-range__columns">
              <div class="base-time-range__col">
                <div class="base-time-range__col-header">HH</div>
                <div class="base-time-range__scroll">
                  <button
                    v-for="h in hours"
                    :key="`sh-${h}`"
                    :class="['base-time-range__unit-btn', { 'base-time-range__unit-btn--active': startH === h }]"
                    type="button"
                    @click.stop="setStartH(h)"
                  >
                    {{ pad(h) }}
                  </button>
                </div>
              </div>
              <span class="base-time-range__sep">:</span>
              <div class="base-time-range__col">
                <div class="base-time-range__col-header">MM</div>
                <div class="base-time-range__scroll">
                  <button
                    v-for="m in minutes"
                    :key="`sm-${m}`"
                    :class="['base-time-range__unit-btn', { 'base-time-range__unit-btn--active': startM === m }]"
                    type="button"
                    @click.stop="setStartM(m)"
                  >
                    {{ pad(m) }}
                  </button>
                </div>
              </div>
              <template v-if="showSeconds">
                <span class="base-time-range__sep">:</span>
                <div class="base-time-range__col">
                  <div class="base-time-range__col-header">SS</div>
                  <div class="base-time-range__scroll">
                    <button
                      v-for="s in seconds"
                      :key="`ss-${s}`"
                      :class="['base-time-range__unit-btn', { 'base-time-range__unit-btn--active': startS === s }]"
                      type="button"
                      @click.stop="setStartS(s)"
                    >
                      {{ pad(s) }}
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div class="base-time-range__divider">
            <IconArrow
              direction="right"
              size="sm"
            />
          </div>

          <!-- End panel -->
          <div class="base-time-range__panel">
            <BaseTypography
              as="div"
              class="base-time-range__panel-title"
              color="secondary"
              variant="caption"
            >
              End
            </BaseTypography>
            <div class="base-time-range__columns">
              <div class="base-time-range__col">
                <div class="base-time-range__col-header">HH</div>
                <div class="base-time-range__scroll">
                  <button
                    v-for="h in hours"
                    :key="`eh-${h}`"
                    :class="['base-time-range__unit-btn', { 'base-time-range__unit-btn--active': endH === h }]"
                    type="button"
                    @click.stop="setEndH(h)"
                  >
                    {{ pad(h) }}
                  </button>
                </div>
              </div>
              <span class="base-time-range__sep">:</span>
              <div class="base-time-range__col">
                <div class="base-time-range__col-header">MM</div>
                <div class="base-time-range__scroll">
                  <button
                    v-for="m in minutes"
                    :key="`em-${m}`"
                    :class="['base-time-range__unit-btn', { 'base-time-range__unit-btn--active': endM === m }]"
                    type="button"
                    @click.stop="setEndM(m)"
                  >
                    {{ pad(m) }}
                  </button>
                </div>
              </div>
              <template v-if="showSeconds">
                <span class="base-time-range__sep">:</span>
                <div class="base-time-range__col">
                  <div class="base-time-range__col-header">SS</div>
                  <div class="base-time-range__scroll">
                    <button
                      v-for="s in seconds"
                      :key="`es-${s}`"
                      :class="['base-time-range__unit-btn', { 'base-time-range__unit-btn--active': endS === s }]"
                      type="button"
                      @click.stop="setEndS(s)"
                    >
                      {{ pad(s) }}
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="base-time-range__footer">
          <button
            class="base-time-range__done-btn"
            type="button"
            @click.stop="open = false"
          >
            Done
          </button>
        </div>
      </div>
    </Teleport>

    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-time-range__error"
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
      class="base-time-range__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-time-range {
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
    &--sm .base-time-range__trigger {
      padding: var(--mp-spacing-1) var(--mp-spacing-2);

      .base-time-range__value {
        font-size: var(--mp-font-size-sm);
      }
    }

    &--md .base-time-range__trigger {
      padding: var(--mp-spacing-2) var(--mp-spacing-3);

      .base-time-range__value {
        font-size: var(--mp-font-size-md);
      }
    }

    &--lg .base-time-range__trigger {
      padding: var(--mp-spacing-3) var(--mp-spacing-4);

      .base-time-range__value {
        font-size: var(--mp-font-size-lg);
      }
    }

    &--error .base-time-range__trigger {
      border-color: var(--mp-color-danger-default);

      &:focus {
        box-shadow: var(--mp-shadow-focus-danger);
      }
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-time-range__trigger {
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
      margin: 0;
      background: var(--mp-color-bg-surface);
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-lg);
      box-shadow: var(--mp-shadow-lg);
      padding: var(--mp-spacing-3);
    }

    &__panels {
      display: flex;
      gap: var(--mp-spacing-3);
      align-items: flex-start;
    }

    &__divider {
      display: flex;
      align-items: center;
      padding-top: 44px;
      color: var(--mp-color-text-tertiary);
    }

    &__panel {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-2);
    }

    &__panel-title {
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    &__columns {
      display: flex;
      align-items: flex-start;
      gap: var(--mp-spacing-1);
    }

    &__sep {
      font-size: var(--mp-font-size-md);
      color: var(--mp-color-text-secondary);
      padding-top: 28px;
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
      max-height: 180px;
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
