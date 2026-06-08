<script lang="ts" setup>
  /**
   * `BaseFormWizardContent` — Form wizard content component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import type { WizardStep } from './base-form-wizard.vue';

  defineProps<{
    step: WizardStep | undefined;
    index: number;
  }>();

  defineSlots<{
    default(props: { step: WizardStep | undefined; index: number }): unknown;
    [key: string]: (props: { step: WizardStep | undefined; index: number }) => unknown;
  }>();
</script>

<template>
  <div class="base-form-wizard__content">
    <slot
      :index="index"
      :step="step"
    />
  </div>
</template>
