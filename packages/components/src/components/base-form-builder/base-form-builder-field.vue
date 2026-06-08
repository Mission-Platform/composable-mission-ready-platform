<script lang="ts" setup>
  /**
   * `BaseFormBuilderField` — Form builder field component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseCheckbox from '../base-checkbox/base-checkbox.vue';
  import BaseInput from '../base-input/base-input.vue';
  import BaseMarkdownInput from '../base-markdown-input/base-markdown-input.vue';
  import BaseRadioGroup from '../base-radio-group/base-radio-group.vue';
  import BaseSelect from '../base-select/base-select.vue';
  import BaseSwitch from '../base-switch/base-switch.vue';
  import BaseTextarea from '../base-textarea/base-textarea.vue';

  import type { FormFieldSchema } from './types';

  const props = defineProps<{
    field: FormFieldSchema;
    value: unknown;
    error: string | undefined;
    disabled: boolean;
  }>();

  const emit = defineEmits<{
    update: [key: string, value: unknown];
  }>();

  function onUpdate(value: unknown) {
    emit('update', props.field.key, value);
  }
</script>

<template>
  <!-- text / email / password / number / url / tel -->
  <BaseInput
    v-if="!field.type || ['text', 'email', 'password', 'number', 'url', 'tel'].includes(field.type)"
    :disabled="disabled || field.disabled"
    :error="error"
    :hint="field.hint"
    :label="field.label"
    :model-value="(value as string | number) ?? ''"
    :placeholder="field.placeholder"
    :required="field.required"
    :type="(field.type as 'text' | 'email' | 'password' | 'number' | 'url' | 'tel') ?? 'text'"
    class="form-builder__field"
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
    class="form-builder__field"
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
    class="form-builder__field"
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
    class="form-builder__field"
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
    class="form-builder__field"
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
    class="form-builder__field"
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
    class="form-builder__field"
    @update:model-value="onUpdate"
  />
</template>
