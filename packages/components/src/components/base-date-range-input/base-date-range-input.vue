<script lang="ts" setup>
  import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
  import { IconCalendar, IconChevron } from '@mission-platform/icons';
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

  import { useId } from '../../composables/use-id';
  import BaseTypography from '../base-typography/base-typography.vue';

  export type DateRangeInputSize = 'sm' | 'md' | 'lg';

  export interface DateRange {
    start: string;
    end: string;
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: DateRange;
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      required?: boolean;
      size?: DateRangeInputSize;
      min?: string;
      max?: string;
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
      min: undefined,
      max: undefined,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: DateRange];
    change: [value: DateRange];
  }>();

  const { id: resolvedId } = useId(props.id);

  const open = ref(false);
  const calendarRef = ref<HTMLElement | null>(null);
  const triggerRef = ref<HTMLElement | null>(null);

  const { floatingStyles } = useFloating(triggerRef, calendarRef, {
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  const leftYear = ref(new Date().getFullYear());
  const leftMonth = ref(new Date().getMonth());
  const rightYear = computed(() => (leftMonth.value === 11 ? leftYear.value + 1 : leftYear.value));
  const rightMonth = computed(() => (leftMonth.value === 11 ? 0 : leftMonth.value + 1));

  const hoverDate = ref<string | null>(null);
  const selectingPhase = ref<'start' | 'end'>('start');

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

  const startVal = computed(() => props.modelValue?.start ?? '');
  const endVal = computed(() => props.modelValue?.end ?? '');

  function buildDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; date: string | null; disabled: boolean }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, date: null, disabled: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month, d);
      let disabled = false;
      if (minDate.value && dateObj < minDate.value) disabled = true;
      if (maxDate.value && dateObj > maxDate.value) disabled = true;
      cells.push({ day: d, date: dateStr, disabled });
    }
    return cells;
  }

  const leftDays = computed(() => buildDays(leftYear.value, leftMonth.value));
  const rightDays = computed(() => buildDays(rightYear.value, rightMonth.value));

  function effectiveEnd() {
    return endVal.value || hoverDate.value || null;
  }

  function isRangeStart(date: string | null) {
    if (!date || !startVal.value) return false;
    const e = effectiveEnd();
    return e ? (startVal.value <= e ? date === startVal.value : date === e) : date === startVal.value;
  }

  function isRangeEnd(date: string | null) {
    if (!date || !startVal.value) return false;
    const e = effectiveEnd();
    if (!e) return false;
    return startVal.value <= e ? date === e : date === startVal.value;
  }

  function isInRange(date: string | null) {
    if (!date || !startVal.value) return false;
    const e = effectiveEnd();
    if (!e) return false;
    const [lo, hi] = startVal.value <= e ? [startVal.value, e] : [e, startVal.value];
    return date > lo && date < hi;
  }

  function isToday(date: string | null) {
    if (!date) return false;
    const t = new Date();
    return (
      date === `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    );
  }

  function handleDayClick(date: string | null, disabled: boolean) {
    if (!date || disabled) return;
    if (selectingPhase.value === 'start' || endVal.value) {
      emit('update:modelValue', { start: date, end: '' });
      emit('change', { start: date, end: '' });
      selectingPhase.value = 'end';
    } else {
      const s = startVal.value;
      const [lo, hi] = s <= date ? [s, date] : [date, s];
      const range = { start: lo, end: hi };
      emit('update:modelValue', range);
      emit('change', range);
      selectingPhase.value = 'start';
      open.value = false;
    }
  }

  function prevMonth() {
    if (leftMonth.value === 0) {
      leftYear.value--;
      leftMonth.value = 11;
    } else leftMonth.value--;
  }

  function nextMonth() {
    if (leftMonth.value === 11) {
      leftYear.value++;
      leftMonth.value = 0;
    } else leftMonth.value++;
  }

  function toggleOpen() {
    if (props.disabled) return;
    if (!open.value) {
      selectingPhase.value = 'start';
      hoverDate.value = null;
      const d = parseDate(startVal.value);
      if (d) {
        leftYear.value = d.getFullYear();
        leftMonth.value = d.getMonth();
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
      if (val?.start) {
        const d = parseDate(val.start);
        if (d) {
          leftYear.value = d.getFullYear();
          leftMonth.value = d.getMonth();
        }
      }
    },
  );

  onMounted(() => document.addEventListener('mousedown', onClickOutside));
  onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside));

  const displayValue = computed(() => {
    if (startVal.value && endVal.value) return `${startVal.value}  →  ${endVal.value}`;
    if (startVal.value) return `${startVal.value}  →  …`;
    return '';
  });

  const leftLabel = computed(() => `${MONTHS[leftMonth.value]} ${leftYear.value}`);
  const rightLabel = computed(() => `${MONTHS[rightMonth.value]} ${rightYear.value}`);
</script>

<template>
  <div
    :class="[
      'base-date-range',
      `base-date-range--${size}`,
      { 'base-date-range--error': !!error, 'base-date-range--disabled': disabled },
    ]"
  >
    <label
      v-if="label"
      :class="['base-date-range__label', { 'base-date-range__label--hidden': labelHidden }]"
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
        class="base-date-range__required"
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
      :aria-label="label ?? 'Date range picker'"
      class="base-date-range__trigger"
      type="button"
      @click="toggleOpen"
      @keydown.escape="open = false"
    >
      <span :class="['base-date-range__value', { 'base-date-range__value--placeholder': !displayValue }]">
        {{ displayValue || 'YYYY-MM-DD  →  YYYY-MM-DD' }}
      </span>
      <span
        aria-hidden="true"
        class="base-date-range__icon"
      >
        <IconCalendar size="sm" />
      </span>
    </button>

    <div
      v-show="open"
      ref="calendarRef"
      :aria-label="`${label ?? 'Date range'} calendar`"
      :style="floatingStyles"
      class="base-date-range__calendar"
      role="dialog"
    >
      <div class="base-date-range__hint">
        <BaseTypography
          as="span"
          color="secondary"
          variant="caption"
        >
          {{ selectingPhase === 'start' ? 'Select start date' : 'Select end date' }}
        </BaseTypography>
      </div>

      <div class="base-date-range__panels">
        <!-- Left panel -->
        <div class="base-date-range__panel">
          <div class="base-date-range__cal-header">
            <button
              aria-label="Previous month"
              class="base-date-range__nav-btn"
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
              {{ leftLabel }}
            </BaseTypography>
            <span style="width: 28px" />
          </div>
          <div class="base-date-range__cal-grid">
            <span
              v-for="d in DAYS"
              :key="`ld-${d}`"
              class="base-date-range__weekday"
            >
              {{ d }}
            </span>
            <button
              v-for="(cell, i) in leftDays"
              :key="`l-${i}`"
              :class="[
                'base-date-range__day',
                {
                  'base-date-range__day--empty': !cell.day,
                  'base-date-range__day--range-start': isRangeStart(cell.date),
                  'base-date-range__day--range-end': isRangeEnd(cell.date),
                  'base-date-range__day--in-range': isInRange(cell.date),
                  'base-date-range__day--today':
                    isToday(cell.date) && !isRangeStart(cell.date) && !isRangeEnd(cell.date),
                  'base-date-range__day--disabled': cell.disabled,
                },
              ]"
              :disabled="!cell.day || cell.disabled"
              type="button"
              @focusin="hoverDate = cell.date"
              @focusout="hoverDate = null"
              @mouseenter="hoverDate = cell.date"
              @mouseleave="hoverDate = null"
              @click.stop="handleDayClick(cell.date, cell.disabled)"
            >
              {{ cell.day ?? '' }}
            </button>
          </div>
        </div>

        <div class="base-date-range__sep" />

        <!-- Right panel -->
        <div class="base-date-range__panel">
          <div class="base-date-range__cal-header">
            <span style="width: 28px" />
            <BaseTypography
              as="span"
              color="primary"
              variant="label"
            >
              {{ rightLabel }}
            </BaseTypography>
            <button
              aria-label="Next month"
              class="base-date-range__nav-btn"
              type="button"
              @click.stop="nextMonth"
            >
              <IconChevron
                direction="right"
                size="xs"
              />
            </button>
          </div>
          <div class="base-date-range__cal-grid">
            <span
              v-for="d in DAYS"
              :key="`rd-${d}`"
              class="base-date-range__weekday"
            >
              {{ d }}
            </span>
            <button
              v-for="(cell, i) in rightDays"
              :key="`r-${i}`"
              :class="[
                'base-date-range__day',
                {
                  'base-date-range__day--empty': !cell.day,
                  'base-date-range__day--range-start': isRangeStart(cell.date),
                  'base-date-range__day--range-end': isRangeEnd(cell.date),
                  'base-date-range__day--in-range': isInRange(cell.date),
                  'base-date-range__day--today':
                    isToday(cell.date) && !isRangeStart(cell.date) && !isRangeEnd(cell.date),
                  'base-date-range__day--disabled': cell.disabled,
                },
              ]"
              :disabled="!cell.day || cell.disabled"
              type="button"
              @focusin="hoverDate = cell.date"
              @focusout="hoverDate = null"
              @mouseenter="hoverDate = cell.date"
              @mouseleave="hoverDate = null"
              @click.stop="handleDayClick(cell.date, cell.disabled)"
            >
              {{ cell.day ?? '' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-date-range__error"
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
      class="base-date-range__hint-text"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-date-range {
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
    &--sm .base-date-range__trigger {
      padding: var(--mp-spacing-1) var(--mp-spacing-2);

      .base-date-range__value {
        font-size: var(--mp-font-size-sm);
      }
    }

    &--md .base-date-range__trigger {
      padding: var(--mp-spacing-2) var(--mp-spacing-3);

      .base-date-range__value {
        font-size: var(--mp-font-size-md);
      }
    }

    &--lg .base-date-range__trigger {
      padding: var(--mp-spacing-3) var(--mp-spacing-4);

      .base-date-range__value {
        font-size: var(--mp-font-size-lg);
      }
    }

    &--error .base-date-range__trigger {
      border-color: var(--mp-color-danger-default);
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-date-range__trigger {
        background-color: var(--mp-color-bg-muted);
        cursor: not-allowed;
      }
    }

    &__error {
      color: var(--mp-color-danger-text);
      margin: 0;
    }

    &__hint-text {
      margin: 0;
    }

    /* Calendar */
    &__calendar {
      position: fixed;
      z-index: 200;
      background: var(--mp-color-bg-surface);
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-lg);
      box-shadow: var(--mp-shadow-lg);
      padding: var(--mp-spacing-3);
    }

    &__hint {
      text-align: center;
      margin-bottom: var(--mp-spacing-2);
    }

    &__panels {
      display: flex;
      gap: var(--mp-spacing-4);
    }

    &__panel {
      min-width: 252px;
    }

    &__sep {
      width: 1px;
      background: var(--mp-color-border-default);
      align-self: stretch;
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

      &--range-start,
      &--range-end {
        background-color: var(--mp-color-primary-default);
        color: var(--mp-color-text-on-primary);
        font-weight: var(--mp-font-weight-semibold);
      }

      &--range-start {
        border-radius: var(--mp-radius-sm) 0 0 var(--mp-radius-sm);
      }

      &--range-end {
        border-radius: 0 var(--mp-radius-sm) var(--mp-radius-sm) 0;
      }

      &--in-range {
        background-color: color-mix(in srgb, var(--mp-color-primary-default) 12%, transparent);
        color: var(--mp-color-primary-default);
        border-radius: 0;
      }

      &--today {
        background-color: color-mix(in srgb, var(--mp-color-primary-default) 8%, transparent);
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

      &:hover:not(:disabled, .base-date-range__day--range-start, .base-date-range__day--range-end) {
        background-color: var(--mp-color-bg-muted);
      }
    }
  }
</style>
