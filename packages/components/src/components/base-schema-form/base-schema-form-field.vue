<script lang="ts" setup>
  /**
   * `BaseSchemaFormField` — Schema form field component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import BaseCheckbox from '../base-checkbox/base-checkbox.vue';
  import BaseDateInput from '../base-date-input/base-date-input.vue';
  import BaseDateRangeInput from '../base-date-range-input/base-date-range-input.vue';
  import BaseDateTimeRangeInput from '../base-date-time-range-input/base-date-time-range-input.vue';
  import BaseFieldSet from '../base-field-set/base-field-set.vue';
  import BaseFileInput from '../base-file-input/base-file-input.vue';
  import BaseInput from '../base-input/base-input.vue';
  import BaseLocationInput from '../base-location-input/base-location-input.vue';
  import BaseMarkdownInput from '../base-markdown-input/base-markdown-input.vue';
  import BaseMultiselect from '../base-multiselect/base-multiselect.vue';
  import BaseNumberStepper from '../base-number-stepper/base-number-stepper.vue';
  import BaseRadioGroup from '../base-radio-group/base-radio-group.vue';
  import BaseSelect from '../base-select/base-select.vue';
  import BaseSwitch from '../base-switch/base-switch.vue';
  import BaseTextarea from '../base-textarea/base-textarea.vue';
  import BaseTimeInput from '../base-time-input/base-time-input.vue';
  import BaseTimeRangeInput from '../base-time-range-input/base-time-range-input.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  import { isFieldVisible } from './conditions';

  import type { FormErrors, FormFieldSchema, FormValues } from './types';
  import type { DateRange } from '../base-date-range-input';
  import type { DateTimeRange } from '../base-date-time-range-input';
  import type { LocationValue } from '../base-location-input';
  import type { TimeRange } from '../base-time-range-input';

  const props = withDefaults(
    defineProps<{
      field: FormFieldSchema;
      value: unknown;
      /**
       * Per-field error map for the whole form, keyed by dotted field path
       * (e.g. `address.street`).  Used to resolve this field's own error and
       * those of any nested field-set children.
       */
      errors?: FormErrors;
      /** Dotted path to this field; defaults to the field key at the root. */
      path?: string;
      /**
       * The whole form's values, used to evaluate this field's (and its
       * children's) `visibleWhen` conditions.  Defaults to an empty bag.
       */
      values?: FormValues;
      disabled: boolean;
    }>(),
    {
      errors: () => ({}),
      path: undefined,
      values: () => ({}),
    },
  );

  const emit = defineEmits<{
    update: [path: string, value: unknown];
  }>();

  /** This field's full dotted path (its own key when rendered at the root). */
  const path = computed(() => props.path ?? props.field.key);

  /** Whether this field's `visibleWhen` condition (if any) currently holds. */
  const visible = computed(() => isFieldVisible(props.field, props.values));

  /** This field's resolved error message, looked up by its dotted path. */
  const error = computed(() => props.errors[path.value]);

  /** The nested value object for a field set (keyed by child key). */
  const groupValue = computed<Record<string, unknown>>(() =>
    props.value && typeof props.value === 'object' ? (props.value as Record<string, unknown>) : {},
  );

  function onUpdate(value: unknown) {
    emit('update', path.value, value);
  }

  // ── datetime composition ───────────────────────────────────────────────────
  // The `datetime` widget stores a single ISO-like string `"<date>T<time>"`,
  // edited through a paired date + time control.
  const dateTimeParts = computed(() => {
    const [date = '', time = ''] = String(props.value ?? '').split('T');
    return { date, time };
  });

  function onDateTimeUpdate(part: 'date' | 'time', next: string) {
    const { date, time } = dateTimeParts.value;
    const merged = part === 'date' ? { date: next, time } : { date, time: next };
    onUpdate(merged.date || merged.time ? `${merged.date}T${merged.time}` : '');
  }
</script>

<template>
  <template v-if="visible">
    <!-- text / email / password / url / tel -->
    <BaseInput
      v-if="!field.type || ['text', 'email', 'password', 'url', 'tel'].includes(field.type)"
      :autocapitalize="field.autocapitalize"
      :autocomplete="field.autocomplete"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :list="field.suggestions"
      :model-value="(value as string | number) ?? ''"
      :multiple="field.multiple"
      :placeholder="field.placeholder"
      :required="field.required"
      :type="(field.type as 'text' | 'email' | 'password' | 'url' | 'tel') ?? 'text'"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- number / stepper -->
    <BaseNumberStepper
      v-else-if="field.type === 'number' || field.type === 'stepper'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :integer="field.integer"
      :label="field.label"
      :max="field.max"
      :min="field.min"
      :model-value="(value as number | null) ?? null"
      :placeholder="field.placeholder"
      :precision="field.precision"
      :required="field.required"
      :step="field.step"
      :unsigned="field.unsigned"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- textarea -->
    <BaseTextarea
      v-else-if="field.type === 'textarea'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :model-value="(value as string) ?? ''"
      :placeholder="field.placeholder"
      :required="field.required"
      :rows="field.rows"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- markdown -->
    <BaseMarkdownInput
      v-else-if="field.type === 'markdown'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :model-value="(value as string) ?? ''"
      :placeholder="field.placeholder"
      :required="field.required"
      :rows="field.rows"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- checkbox -->
    <BaseCheckbox
      v-else-if="field.type === 'checkbox'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :model-value="(value as boolean) ?? false"
      :required="field.required"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- switch -->
    <BaseSwitch
      v-else-if="field.type === 'switch'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :model-value="(value as boolean) ?? false"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- select -->
    <BaseSelect
      v-else-if="field.type === 'select'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :model-value="(value as string | number) ?? ''"
      :options="field.options ?? []"
      :placeholder="field.placeholder"
      :required="field.required"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- radio group -->
    <BaseRadioGroup
      v-else-if="field.type === 'radio'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :legend="field.label"
      :model-value="(value as string | number) ?? ''"
      :options="field.options ?? []"
      :required="field.required"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- multiselect -->
    <BaseMultiselect
      v-else-if="field.type === 'multiselect'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :model-value="(value as (string | number)[]) ?? []"
      :options="field.options ?? []"
      :placeholder="field.placeholder"
      :required="field.required"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- datetime (paired date + time) -->
    <fieldset
      v-else-if="field.type === 'datetime'"
      class="schema-form__field schema-form__datetime"
    >
      <legend
        v-if="field.label"
        class="schema-form__datetime-legend"
      >
        <BaseTypography
          as="span"
          variant="label"
        >
          {{ field.label }}
          <span
            v-if="field.required"
            aria-hidden="true"
          >
            *
          </span>
        </BaseTypography>
      </legend>
      <div class="schema-form__datetime-controls">
        <BaseDateInput
          :disabled="disabled || field.disabled"
          :max="field.maxDate"
          :min="field.minDate"
          :model-value="dateTimeParts.date"
          :required="field.required"
          label="Date"
          @update:model-value="onDateTimeUpdate('date', $event)"
        />
        <BaseTimeInput
          :disabled="disabled || field.disabled"
          :model-value="dateTimeParts.time"
          :required="field.required"
          label="Time"
          @update:model-value="onDateTimeUpdate('time', $event)"
        />
      </div>
      <BaseTypography
        v-if="field.hint || error"
        :class="['schema-form__datetime-hint', { 'schema-form__datetime-hint--error': error }]"
        as="p"
        color="inherit"
        variant="caption"
      >
        {{ error || field.hint }}
      </BaseTypography>
    </fieldset>

    <!-- date -->
    <BaseDateInput
      v-else-if="field.type === 'date'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :max="field.maxDate"
      :min="field.minDate"
      :model-value="(value as string) ?? ''"
      :placeholder="field.placeholder"
      :required="field.required"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- time -->
    <BaseTimeInput
      v-else-if="field.type === 'time'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :model-value="(value as string) ?? ''"
      :required="field.required"
      :show-seconds="field.showSeconds"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- date range -->
    <BaseDateRangeInput
      v-else-if="field.type === 'daterange'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :max="field.maxDate"
      :min="field.minDate"
      :model-value="(value as DateRange) ?? { start: '', end: '' }"
      :required="field.required"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- time range -->
    <BaseTimeRangeInput
      v-else-if="field.type === 'timerange'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :model-value="(value as TimeRange) ?? { start: '', end: '' }"
      :required="field.required"
      :show-seconds="field.showSeconds"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- date-time range -->
    <BaseDateTimeRangeInput
      v-else-if="field.type === 'datetimerange'"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :max="field.maxDate"
      :min="field.minDate"
      :model-value="(value as DateTimeRange) ?? { start: '', end: '', timezone: 'browser' }"
      :required="field.required"
      :show-seconds="field.showSeconds"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- location -->
    <BaseLocationInput
      v-else-if="field.type === 'location'"
      :disabled="disabled || field.disabled"
      :error="error"
      :format="field.locationFormat"
      :hint="field.hint"
      :label="field.label"
      :model-value="(value as LocationValue) ?? null"
      :required="field.required"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />

    <!-- field set (grouped, nested object) -->
    <BaseFieldSet
      v-else-if="field.type === 'fieldset'"
      :description="field.hint"
      :disabled="disabled || field.disabled"
      :legend="field.label"
      class="schema-form__field"
    >
      <BaseSchemaFormField
        v-for="child in field.fields ?? []"
        :key="child.key"
        :disabled="disabled || field.disabled || false"
        :errors="errors"
        :field="child"
        :path="`${path}.${child.key}`"
        :value="groupValue[child.key]"
        :values="values"
        @update="(childPath, childValue) => emit('update', childPath, childValue)"
      />
    </BaseFieldSet>

    <!-- file -->
    <BaseFileInput
      v-else-if="field.type === 'file'"
      :accept="field.accept"
      :capture="field.capture"
      :disabled="disabled || field.disabled"
      :error="error"
      :hint="field.hint"
      :label="field.label"
      :model-value="(value as File | File[] | null) ?? null"
      :multiple="field.multiple"
      :required="field.required"
      class="schema-form__field"
      @update:model-value="onUpdate"
    />
  </template>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .schema-form__datetime {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-2);
      padding: 0;
      margin: 0;
      border: 0;
    }

    .schema-form__datetime-legend {
      padding: 0;
      margin-bottom: var(--mp-spacing-1);
    }

    .schema-form__datetime-controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--mp-spacing-2);
    }

    .schema-form__datetime-hint {
      margin: 0;
      color: var(--mp-color-text-tertiary);

      &--error {
        color: var(--mp-color-danger-text);
      }
    }
  }
</style>
