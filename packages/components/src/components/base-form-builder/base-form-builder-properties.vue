<script lang="ts" setup>
  /**
   * `BaseFormBuilderProperties` — the end-sidebar inspector for the field
   * currently selected on the canvas.
   *
   * It edits the working {@link BuilderField} and reports every change through a
   * single `update` event carrying a partial patch, so the parent composable
   * applies it in one place. Only the properties relevant to the field's type
   * are shown, keeping the panel focused. It is an internal building block of
   * {@link BaseFormBuilder}.
   */
  import { IconPlus, IconTrash } from '@mission-platform/icons';
  import { computed } from 'vue';

  import BaseButton from '../base-button/base-button.vue';
  import BaseCheckbox from '../base-checkbox/base-checkbox.vue';
  import BaseDateInput from '../base-date-input/base-date-input.vue';
  import BaseInput from '../base-input/base-input.vue';
  import BaseSelect from '../base-select/base-select.vue';
  import BaseTextarea from '../base-textarea/base-textarea.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  import BaseFormBuilderConditionEditor from './base-form-builder-condition-editor.vue';
  import { isNumberWidget, widgetHasOptions } from './form-schema';

  import type { BuilderField, BuilderFieldOption, FieldTypeDescriptor, FormFieldType, LocationFormat } from './types';

  const props = withDefaults(
    defineProps<{
      field: BuilderField;
      fieldTypes: FieldTypeDescriptor[];
      disabled?: boolean;
      keyError?: string;
      wizard?: boolean;
      stepCount?: number;
      step?: number;
    }>(),
    {
      disabled: false,
      keyError: undefined,
      wizard: false,
      stepCount: 1,
      step: undefined,
    },
  );

  const emit = defineEmits<{
    /** A partial patch to merge into the edited field. */
    update: [patch: Partial<BuilderField>];
    /** Request to move the field to the wizard step at the given index. */
    'move-to-step': [step: number];
  }>();

  const typeOptions = computed(() => props.fieldTypes.map((item) => ({ label: item.label, value: item.type })));

  const isNumberField = computed(() => isNumberWidget(props.field.type));
  const hasOptions = computed(() => widgetHasOptions(props.field.type));
  const isFileField = computed(() => props.field.type === 'file');
  const isFieldset = computed(() => props.field.type === 'fieldset');
  const hasRows = computed(() => props.field.type === 'textarea' || props.field.type === 'markdown');
  const isLocation = computed(() => props.field.type === 'location');
  const isTextField = computed(() =>
    ['text', 'email', 'password', 'url', 'tel', 'textarea'].includes(props.field.type),
  );
  const isBooleanField = computed(() => ['checkbox', 'switch'].includes(props.field.type));
  const isDateLike = computed(() => ['date', 'datetime', 'daterange', 'datetimerange'].includes(props.field.type));

  const stepOptions = computed(() =>
    Array.from({ length: Math.max(1, props.stepCount) }, (_, index) => ({
      label: `Step ${index + 1}`,
      value: String(index),
    })),
  );

  const LOCATION_FORMAT_OPTIONS: Array<{ label: string; value: LocationFormat }> = [
    { label: 'Decimal Degrees (DD)', value: 'dd' },
    { label: 'Degrees Decimal Minutes (DM)', value: 'dm' },
    { label: 'Degrees Minutes Seconds (DMS)', value: 'dms' },
  ];

  /** Emits a patch updating a single field property. */
  function patch<K extends keyof BuilderField>(key: K, value: BuilderField[K]): void {
    emit('update', { [key]: value } as Partial<BuilderField>);
  }

  /** Parses optional numeric input, treating empty values as "unset". */
  function toOptionalNumber(value: string | number): number | undefined {
    if (value === '' || value == null) return undefined;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  /** Merges a partial change into the option at `index`. */
  function updateOption(index: number, part: Partial<BuilderFieldOption>): void {
    patch(
      'options',
      props.field.options.map((option, i) => (i === index ? { ...option, ...part } : option)),
    );
  }

  /** Appends a new, auto-numbered option to the field. */
  function addOption(): void {
    const next = props.field.options.length + 1;
    patch('options', [...props.field.options, { label: `Option ${next}`, value: `option_${next}` }]);
  }

  /** Removes the option at `index` from the field. */
  function removeOption(index: number): void {
    patch(
      'options',
      props.field.options.filter((_, i) => i !== index),
    );
  }
</script>

<template>
  <div class="form-builder-properties">
    <BaseSelect
      :disabled="disabled"
      :model-value="field.type"
      :options="typeOptions"
      label="Field type"
      @update:model-value="patch('type', $event as FormFieldType)"
    />

    <BaseInput
      :disabled="disabled"
      :model-value="field.label"
      label="Label"
      @update:model-value="patch('label', String($event))"
    />

    <BaseInput
      :disabled="disabled"
      :error="keyError"
      :model-value="field.key"
      hint="Property name written to the schema."
      label="Key"
      @update:model-value="patch('key', String($event))"
    />

    <BaseInput
      v-if="isTextField"
      :disabled="disabled"
      :model-value="field.placeholder ?? ''"
      label="Placeholder"
      @update:model-value="patch('placeholder', String($event) || undefined)"
    />

    <BaseTextarea
      :disabled="disabled"
      :model-value="field.hint ?? ''"
      :rows="2"
      label="Help text"
      @update:model-value="patch('hint', String($event) || undefined)"
    />

    <BaseInput
      v-if="hasRows"
      :disabled="disabled"
      :model-value="field.rows ?? ''"
      label="Rows"
      type="number"
      @update:model-value="patch('rows', toOptionalNumber($event))"
    />

    <BaseCheckbox
      :disabled="disabled"
      :model-value="field.required"
      label="Required"
      @update:model-value="patch('required', Boolean($event))"
    />

    <BaseCheckbox
      :disabled="disabled"
      :model-value="field.disabled ?? false"
      label="Disabled (read-only in the form)"
      @update:model-value="patch('disabled', Boolean($event) || undefined)"
    />

    <!-- Default value -->
    <BaseInput
      v-if="isTextField"
      :disabled="disabled"
      :model-value="(field.defaultValue as string) ?? ''"
      hint="Pre-filled when the form supplies no value."
      label="Default value"
      @update:model-value="patch('defaultValue', String($event) || undefined)"
    />
    <BaseInput
      v-else-if="isNumberField"
      :disabled="disabled"
      :model-value="(field.defaultValue as number) ?? ''"
      hint="Pre-filled when the form supplies no value."
      label="Default value"
      type="number"
      @update:model-value="patch('defaultValue', toOptionalNumber($event))"
    />
    <BaseCheckbox
      v-else-if="isBooleanField"
      :disabled="disabled"
      :model-value="Boolean(field.defaultValue)"
      label="Checked by default"
      @update:model-value="patch('defaultValue', Boolean($event) || undefined)"
    />

    <!-- Wizard step assignment -->
    <BaseSelect
      v-if="wizard && step !== undefined"
      :disabled="disabled"
      :model-value="String(step ?? 0)"
      :options="stepOptions"
      hint="Which wizard step this field belongs to."
      label="Wizard step"
      @update:model-value="emit('move-to-step', toOptionalNumber($event) ?? 0)"
    />

    <BaseTypography
      v-if="isFieldset"
      as="p"
      class="form-builder-properties__note"
      color="secondary"
      variant="body-sm"
    >
      This is a field set. Drag fields onto it on the canvas — or use its “Add field to group” button — to nest fields
      inside this group.
    </BaseTypography>

    <!-- File options -->
    <template v-if="isFileField">
      <BaseInput
        :disabled="disabled"
        :model-value="field.accept ?? ''"
        hint="Comma-separated list, e.g. .pdf,image/*"
        label="Accepted file types"
        @update:model-value="patch('accept', String($event) || undefined)"
      />
      <BaseCheckbox
        :disabled="disabled"
        :model-value="field.multiple ?? false"
        label="Allow multiple files"
        @update:model-value="patch('multiple', Boolean($event) || undefined)"
      />
    </template>

    <!-- Option list (select / radio / multiselect) -->
    <fieldset
      v-if="hasOptions"
      class="form-builder-properties__options"
    >
      <legend class="form-builder-properties__legend">
        <BaseTypography
          as="span"
          color="secondary"
          variant="label"
        >
          Options
        </BaseTypography>
      </legend>
      <div
        v-for="(option, index) in field.options"
        :key="index"
        class="form-builder-properties__option"
      >
        <BaseInput
          :disabled="disabled"
          :label="`Option ${index + 1} label`"
          :label-hidden="true"
          :model-value="option.label"
          placeholder="Label"
          @update:model-value="updateOption(index, { label: String($event) })"
        />
        <BaseInput
          :disabled="disabled"
          :label="`Option ${index + 1} value`"
          :label-hidden="true"
          :model-value="option.value"
          placeholder="Value"
          @update:model-value="updateOption(index, { value: String($event) })"
        />
        <BaseButton
          :disabled="disabled"
          aria-label="Remove option"
          class="form-builder-properties__option-remove"
          size="2xs"
          variant="tertiary"
          @click="removeOption(index)"
        >
          <IconTrash size="sm" />
        </BaseButton>
      </div>
      <BaseButton
        :disabled="disabled"
        class="form-builder-properties__add-option"
        size="sm"
        variant="secondary"
        @click="addOption"
      >
        <IconPlus size="sm" />
        Add option
      </BaseButton>
    </fieldset>

    <!-- Date bounds -->
    <div
      v-if="isDateLike"
      class="form-builder-properties__row"
    >
      <BaseDateInput
        :disabled="disabled"
        :model-value="field.minDate ?? ''"
        label="Earliest date"
        @update:model-value="patch('minDate', String($event) || undefined)"
      />
      <BaseDateInput
        :disabled="disabled"
        :model-value="field.maxDate ?? ''"
        label="Latest date"
        @update:model-value="patch('maxDate', String($event) || undefined)"
      />
    </div>

    <!-- String validation -->
    <template v-if="isTextField">
      <div class="form-builder-properties__row">
        <BaseInput
          :disabled="disabled"
          :model-value="field.minLength ?? ''"
          label="Min length"
          type="number"
          @update:model-value="patch('minLength', toOptionalNumber($event))"
        />
        <BaseInput
          :disabled="disabled"
          :model-value="field.maxLength ?? ''"
          label="Max length"
          type="number"
          @update:model-value="patch('maxLength', toOptionalNumber($event))"
        />
      </div>
      <BaseInput
        :disabled="disabled"
        :model-value="field.pattern ?? ''"
        hint="Regular expression the value must match."
        label="Pattern"
        @update:model-value="patch('pattern', String($event) || undefined)"
      />
    </template>

    <!-- Number validation -->
    <template v-if="isNumberField">
      <div class="form-builder-properties__row">
        <BaseInput
          :disabled="disabled"
          :model-value="field.minimum ?? ''"
          label="Minimum"
          type="number"
          @update:model-value="patch('minimum', toOptionalNumber($event))"
        />
        <BaseInput
          :disabled="disabled"
          :model-value="field.maximum ?? ''"
          label="Maximum"
          type="number"
          @update:model-value="patch('maximum', toOptionalNumber($event))"
        />
      </div>
      <BaseCheckbox
        :disabled="disabled"
        :model-value="field.integer ?? false"
        label="Integer only (whole numbers)"
        @update:model-value="patch('integer', Boolean($event) || undefined)"
      />
    </template>

    <!-- Location coordinate format -->
    <BaseSelect
      v-if="isLocation"
      :disabled="disabled"
      :model-value="field.locationFormat ?? 'dd'"
      :options="LOCATION_FORMAT_OPTIONS"
      hint="How coordinates are entered and stored."
      label="Coordinate format"
      @update:model-value="patch('locationFormat', $event as LocationFormat)"
    />

    <!-- Conditional visibility -->
    <BaseFormBuilderConditionEditor
      :disabled="disabled"
      :model-value="field.visibleWhen"
      legend="Conditional visibility"
      toggle-label="Only show this field when…"
      @update="patch('visibleWhen', $event)"
    />
  </div>
</template>

<style lang="scss" scoped>
  .form-builder-properties {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-3);

    &__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--mp-spacing-2);
    }

    &__note {
      margin: 0;
    }

    &__options {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-2);
      padding: var(--mp-spacing-3);
      margin: 0;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
    }

    &__legend {
      padding: 0 var(--mp-spacing-1);
    }

    &__option {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: var(--mp-spacing-2);
      align-items: center;
    }

    &__option-remove {
      padding: var(--mp-spacing-1);
      color: var(--mp-color-text-secondary);

      &:hover:not(:disabled) {
        color: var(--mp-color-danger-text);
        background-color: var(--mp-color-danger-muted);
      }
    }

    &__add-option {
      align-self: flex-start;
    }
  }
</style>
