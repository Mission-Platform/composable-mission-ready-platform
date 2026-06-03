<script setup lang="ts">
  import type { WizardStep } from './BaseFormWizard.vue'

  defineProps<{
    step: WizardStep | undefined
    index: number
  }>()

  defineSlots<{
    default(props: { step: WizardStep | undefined; index: number }): unknown
    [key: string]: (props: { step: WizardStep | undefined; index: number }) => unknown
  }>()
</script>

<template>
  <div class="base-form-wizard__content">
    <slot :step="step" :index="index" />
  </div>
</template>
