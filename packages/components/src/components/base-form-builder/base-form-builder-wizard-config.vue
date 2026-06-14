<script lang="ts" setup>
  /**
   * `BaseFormBuilderWizardConfig` — the end-sidebar **form settings** panel shown
   * when no field is selected.
   *
   * It edits the form title and description. In wizard mode the list of steps is
   * configured separately in the **Steps** tab ({@link BaseFormBuilderSteps}). It
   * is a thin, controlled view: every change is reported through an event so
   * {@link BaseFormBuilder}'s composable stays the single source of truth.
   */
  import BaseInput from '../base-input/base-input.vue';
  import BaseTextarea from '../base-textarea/base-textarea.vue';

  withDefaults(
    defineProps<{
      /** The form title. */
      title?: string;
      /** The form description. */
      description?: string;
      /** Whether the editor is disabled (read-only builder). */
      disabled?: boolean;
    }>(),
    {
      title: '',
      description: '',
      disabled: false,
    },
  );

  const emit = defineEmits<{
    /** A new form title. */
    'update:title': [title: string];
    /** A new form description. */
    'update:description': [description: string];
  }>();
</script>

<template>
  <div class="form-builder-wizard-config">
    <BaseInput
      :disabled="disabled"
      :model-value="title ?? ''"
      label="Form title"
      @update:model-value="emit('update:title', String($event))"
    />
    <BaseTextarea
      :disabled="disabled"
      :model-value="description ?? ''"
      :rows="2"
      label="Form description"
      @update:model-value="emit('update:description', String($event))"
    />
  </div>
</template>

<style lang="scss" scoped>
  .form-builder-wizard-config {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-3);
  }
</style>
