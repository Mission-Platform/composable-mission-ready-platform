<script lang="ts" setup>
  /**
   * `BaseDateInput` — Date input component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
  import { IconCalendar, IconChevron } from '@mission-platform/icons';
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

  import { useId } from '../../composables/use-id';
  import { useZIndex } from '../../composables/use-z-index';
  import BaseTypography from '../base-typography/base-typography.vue';

  export type DateInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  const props = withDefaults(
    defineProps<{
      modelValue?: string;
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      required?: boolean;
      placeholder?: string;
      size?: DateInputSize;
      min?: string;
      max?: string;
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
      placeholder: 'YYYY-MM-DD',
      size: 'md',
      min: undefined,
      max: undefined,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string];
    change: [value: string];
  }>();

  const { id: resolvedId } = useId(props.id);
  const { zIndex } = useZIndex('inputPopover');

  const open = ref(false);
  const calendarRef = ref<HTMLElement | null>(null);
  const triggerRef = ref<HTMLElement | null>(null);

  const { floatingStyles } = useFloating(triggerRef, calendarRef, {
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  const viewYear = ref(new Date().getFullYear());
  const viewMonth = ref(new Date().getMonth());

  const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  function parseDate(val: string): Date | null {
    if (!val) return null;
    const d = new Date(val + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  const minDate = computed(() => (props.min ? parseDate(props.min) : null));
  const maxDate = computed(() => (props.max ? parseDate(props.max) : null));

  const calendarDays = computed(() => {
    const firstDay = new Date(viewYear.value, viewMonth.value, 1).getDay();
    const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate();
    const cells: Array<{ day: number | null; date: string | null; disabled: boolean }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, date: null, disabled: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(viewYear.value, viewMonth.value, d);
      let disabled = false;
      if (minDate.value && dateObj < minDate.value) disabled = true;
      if (maxDate.value && dateObj > maxDate.value) disabled = true;
      cells.push({ day: d, date: dateStr, disabled });
    }
    return cells;
  });

  function isSelected(date: string | null): boolean {
    return !!date && date === props.modelValue;
  }

  function isToday(date: string | null): boolean {
    if (!date) return false;
    const t = new Date();
    return (
      date === `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    );
  }

  function selectDate(date: string | null, disabled: boolean) {
    if (!date || disabled) return;
    emit('update:modelValue', date);
    emit('change', date);
    open.value = false;
  }

  function prevMonth() {
    if (viewMonth.value === 0) {
      viewYear.value--;
      viewMonth.value = 11;
    } else viewMonth.value--;
  }

  function nextMonth() {
    if (viewMonth.value === 11) {
      viewYear.value++;
      viewMonth.value = 0;
    } else viewMonth.value++;
  }

  function toggleOpen() {
    if (props.disabled) return;
    if (!open.value) {
      const d = parseDate(props.modelValue);
      if (d) {
        viewYear.value = d.getFullYear();
        viewMonth.value = d.getMonth();
      }
    }
    open.value = !open.value;
  }

  function onClickOutside(e: MouseEvent) {
    const t = e.target as Node;
    if (calendarRef.value && !calendarRef.value.contains(t) && triggerRef.value && !triggerRef.value.contains(t))
      open.value = false;
  }

  watch(
    () => props.modelValue,
    (val) => {
      const d = parseDate(val);
      if (d) {
        viewYear.value = d.getFullYear();
        viewMonth.value = d.getMonth();
      }
    },
  );

  onMounted(() => document.addEventListener('mousedown', onClickOutside));
  onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside));
</script>

<template>
  <div
    :class="[
      'base-date-input',
      `base-date-input--${size}`,
      { 'base-date-input--error': !!error, 'base-date-input--disabled': disabled },
    ]"
  >
    <label
      v-if="label"
      :class="['base-date-input__label', { 'base-date-input__label--hidden': labelHidden }]"
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
        class="base-date-input__required"
      >
        *
      </span>
    </label>

    <div class="base-date-input__wrapper">
      <!-- Leading extension (e.g. an icon, unit, or button). -->
      <span
        v-if="$slots.start"
        class="base-date-input__extension base-date-input__extension--start"
      >
        <slot name="start" />
      </span>
      <button
        :id="resolvedId"
        ref="triggerRef"
        :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
        :aria-expanded="open"
        :aria-haspopup="'dialog'"
        :aria-invalid="!!error || undefined"
        :aria-label="label ?? 'Date picker'"
        class="base-date-input__trigger"
        type="button"
        @click="toggleOpen"
        @keydown.escape="open = false"
      >
        <span :class="['base-date-input__value', { 'base-date-input__value--placeholder': !modelValue }]">
          {{ modelValue || placeholder }}
        </span>
        <span
          aria-hidden="true"
          class="base-date-input__icon"
        >
          <IconCalendar size="sm" />
        </span>
      </button>
      <!-- Trailing extension (e.g. an icon, unit, or button). -->
      <span
        v-if="$slots.end"
        class="base-date-input__extension base-date-input__extension--end"
      >
        <slot name="end" />
      </span>
    </div>

    <Teleport to="body">
      <div
        v-show="open"
        ref="calendarRef"
        :aria-label="`${label ?? 'Date'} calendar`"
        :style="{ ...floatingStyles, zIndex }"
        class="base-date-input__calendar"
        role="dialog"
      >
        <div class="base-date-input__cal-header">
          <button
            aria-label="Previous month"
            class="base-date-input__nav-btn"
            type="button"
            @click.stop="prevMonth"
          >
            <IconChevron
              direction="left"
              size="xs"
            />
          </button>
          <BaseTypography
            as="span"
            color="primary"
            variant="label"
          >
            {{ MONTHS[viewMonth] }} {{ viewYear }}
          </BaseTypography>
          <button
            aria-label="Next month"
            class="base-date-input__nav-btn"
            type="button"
            @click.stop="nextMonth"
          >
            <IconChevron
              direction="right"
              size="xs"
            />
          </button>
        </div>

        <div class="base-date-input__cal-grid">
          <span
            v-for="d in DAYS"
            :key="d"
            class="base-date-input__weekday"
          >
            {{ d }}
          </span>
          <button
            v-for="(cell, i) in calendarDays"
            :key="i"
            :aria-label="cell.date ?? undefined"
            :aria-pressed="isSelected(cell.date)"
            :class="[
              'base-date-input__day',
              {
                'base-date-input__day--empty': !cell.day,
                'base-date-input__day--selected': isSelected(cell.date),
                'base-date-input__day--today': isToday(cell.date) && !isSelected(cell.date),
                'base-date-input__day--disabled': cell.disabled,
              },
            ]"
            :disabled="!cell.day || cell.disabled"
            type="button"
            @click.stop="selectDate(cell.date, cell.disabled)"
          >
            {{ cell.day ?? '' }}
          </button>
        </div>
      </div>
    </Teleport>

    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-date-input__error"
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
      class="base-date-input__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-date-input {
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

    &__wrapper {
      display: flex;
      align-items: center;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      background-color: var(--mp-color-bg-surface);
      transition:
        border-color 150ms ease,
        box-shadow 150ms ease;

      &:focus-within {
        border-color: var(--mp-color-border-focus);
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    &__trigger {
      display: flex;
      flex: 1;
      min-width: 0;
      align-items: center;
      justify-content: space-between;
      appearance: none;
      width: 100%;
      text-align: left;
      border: none;
      background: transparent;
      cursor: pointer;
      user-select: none;

      &:focus {
        outline: none;
      }

      &:hover {
        filter: brightness(0.97);
      }
    }

    /* Leading / trailing extension areas (icons, units, or buttons). */
    &__extension {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      color: var(--mp-color-text-secondary);

      &--start {
        margin-inline-start: var(--mp-spacing-2);
      }

      &--end {
        margin-inline-end: var(--mp-spacing-2);
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

    /* Sizes — canonical 2xs → 2xl scale driven by the shared size tokens. */
    @each $size in '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl' {
      &--#{$size} .base-date-input__trigger {
        padding: var(--mp-size-pad-block-#{$size}) var(--mp-size-pad-inline-#{$size});

        .base-date-input__value {
          font-size: var(--mp-size-font-#{$size});
        }
      }
    }

    /* States */
    &--error .base-date-input__wrapper {
      border-color: var(--mp-color-danger-default);

      &:focus-within {
        box-shadow: var(--mp-shadow-focus-danger);
      }
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-date-input__wrapper {
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

    /* Calendar */
    &__calendar {
      position: fixed;
      background: var(--mp-color-bg-surface);
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-lg);
      box-shadow: var(--mp-shadow-lg);
      padding: var(--mp-spacing-3);
      min-width: 280px;
    }

    &__cal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--mp-spacing-2);
    }

    &__nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: var(--mp-radius-sm);
      cursor: pointer;
      color: var(--mp-color-text-secondary);
      transition:
        background-color 150ms ease,
        color 150ms ease;

      &:hover {
        background-color: var(--mp-color-bg-muted);
        color: var(--mp-color-text-primary);
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }
    }

    &__cal-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }

    &__weekday {
      @include mp.mp-font-caption;

      display: flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      font-weight: var(--mp-font-weight-medium);
      color: var(--mp-color-text-tertiary);
    }

    &__day {
      @include mp.mp-font-body-sm;

      display: flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      width: 100%;
      border: none;
      background: transparent;
      border-radius: var(--mp-radius-sm);
      cursor: pointer;
      color: var(--mp-color-text-primary);
      transition:
        background-color 150ms ease,
        color 150ms ease;

      &--empty {
        pointer-events: none;
      }

      &--selected {
        background-color: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);
        font-weight: var(--mp-font-weight-semibold);
      }

      &--today {
        background-color: color-mix(in srgb, var(--mp-color-primary-default) 12%, transparent);
        color: var(--mp-color-primary-default);
        font-weight: var(--mp-font-weight-semibold);
      }

      &--disabled {
        opacity: 0.3;
        cursor: not-allowed;
        pointer-events: none;
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }

      &:hover:not(:disabled, .base-date-input__day--selected) {
        background-color: var(--mp-color-bg-muted);
      }
    }
  }
</style>
