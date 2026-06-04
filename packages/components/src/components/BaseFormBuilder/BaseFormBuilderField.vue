<script lang="ts" setup>
  import BaseCheckbox from '../BaseCheckbox/BaseCheckbox.vue';
  import BaseInput from '../BaseInput/BaseInput.vue';
  import BaseMarkdownInput from '../BaseMarkdownInput/BaseMarkdownInput.vue';
  import BaseRadioGroup from '../BaseRadioGroup/BaseRadioGroup.vue';
  import BaseSelect from '../BaseSelect/BaseSelect.vue';
  import BaseSwitch from '../BaseSwitch/BaseSwitch.vue';
  import BaseTextarea from '../BaseTextarea/BaseTextarea.vue';

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
