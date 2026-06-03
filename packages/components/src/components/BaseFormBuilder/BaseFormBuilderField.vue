<script setup lang="ts">
  import BaseInput from '../BaseInput/BaseInput.vue'
  import BaseTextarea from '../BaseTextarea/BaseTextarea.vue'
  import BaseCheckbox from '../BaseCheckbox/BaseCheckbox.vue'
  import BaseSwitch from '../BaseSwitch/BaseSwitch.vue'
  import BaseSelect from '../BaseSelect/BaseSelect.vue'
  import BaseRadioGroup from '../BaseRadioGroup/BaseRadioGroup.vue'
  import BaseMarkdownInput from '../BaseMarkdownInput/BaseMarkdownInput.vue'

  import type { FormFieldSchema } from './types'

  const props = defineProps<{
    field: FormFieldSchema
    value: unknown
    error: string | undefined
    disabled: boolean
  }>()

  const emit = defineEmits<{
    update: [key: string, value: unknown]
  }>()

  function onUpdate(value: unknown) {
    emit('update', props.field.key, value)
  }
</script>

<template>
  <!-- text / email / password / number / url / tel -->
  <BaseInput
    v-if="!field.type || ['text', 'email', 'password', 'number', 'url', 'tel'].includes(field.type)"
    :model-value="(value as string | number) ?? ''"
    :type="(field.type as 'text' | 'email' | 'password' | 'number' | 'url' | 'tel') ?? 'text'"
    :label="field.label"
    :hint="field.hint"
    :error="error"
    :placeholder="field.placeholder"
    :required="field.required"
    :disabled="disabled || field.disabled"
    class="form-builder__field"
    @update:model-value="onUpdate"
  />

  <!-- textarea -->
  <BaseTextarea
    v-else-if="field.type === 'textarea'"
    :model-value="(value as string) ?? ''"
    :rows="field.rows"
    :label="field.label"
    :hint="field.hint"
    :error="error"
    :placeholder="field.placeholder"
    :required="field.required"
    :disabled="disabled || field.disabled"
    class="form-builder__field"
    @update:model-value="onUpdate"
  />

  <!-- markdown -->
  <BaseMarkdownInput
    v-else-if="field.type === 'markdown'"
    :model-value="(value as string) ?? ''"
    :rows="field.rows"
    :label="field.label"
    :hint="field.hint"
    :error="error"
    :placeholder="field.placeholder"
    :required="field.required"
    :disabled="disabled || field.disabled"
    class="form-builder__field"
    @update:model-value="onUpdate"
  />

  <!-- checkbox -->
  <BaseCheckbox
    v-else-if="field.type === 'checkbox'"
    :model-value="(value as boolean) ?? false"
    :label="field.label"
    :hint="field.hint"
    :error="error"
    :required="field.required"
    :disabled="disabled || field.disabled"
    class="form-builder__field"
    @update:model-value="onUpdate"
  />

  <!-- switch -->
  <BaseSwitch
    v-else-if="field.type === 'switch'"
    :model-value="(value as boolean) ?? false"
    :label="field.label"
    :hint="field.hint"
    :error="error"
    :disabled="disabled || field.disabled"
    class="form-builder__field"
    @update:model-value="onUpdate"
  />

  <!-- select -->
  <BaseSelect
    v-else-if="field.type === 'select'"
    :model-value="(value as string | number) ?? ''"
    :options="field.options ?? []"
    :label="field.label"
    :hint="field.hint"
    :error="error"
    :placeholder="field.placeholder"
    :required="field.required"
    :disabled="disabled || field.disabled"
    class="form-builder__field"
    @update:model-value="onUpdate"
  />

  <!-- radio group -->
  <BaseRadioGroup
    v-else-if="field.type === 'radio'"
    :model-value="(value as string | number) ?? ''"
    :options="field.options ?? []"
    :legend="field.label"
    :hint="field.hint"
    :error="error"
    :required="field.required"
    :disabled="disabled || field.disabled"
    class="form-builder__field"
    @update:model-value="onUpdate"
  />
</template>
