<script lang="ts" setup>
  /**
   * `BaseFormWizard` — Form wizard component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useI18n } from '@mission-platform/i18n';
  import { computed } from 'vue';

  import BaseFormWizardContent from './base-form-wizard-content.vue';
  import BaseFormWizardFooter from './base-form-wizard-footer.vue';
  import BaseFormWizardSteps from './base-form-wizard-steps.vue';

  export interface WizardStep {
    id: string;
    title: string;
    description?: string;
    /** When `true`, the step is rendered in an errored (highlighted) state. */
    error?: boolean;
  }

  const props = withDefaults(
    defineProps<{
      steps: WizardStep[];
      modelValue?: number;
      linear?: boolean;
    }>(),
    {
      modelValue: 0,
      linear: true,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [index: number];
    complete: [];
    next: [index: number];
    prev: [index: number];
  }>();

  const { t } = useI18n({ useScope: 'local' });

  const currentIndex = computed(() => props.modelValue);
  const isFirst = computed(() => currentIndex.value === 0);
  const isLast = computed(() => currentIndex.value === props.steps.length - 1);

  function goTo(index: number) {
    if (props.linear && index > currentIndex.value + 1) return;
    if (index < 0 || index >= props.steps.length) return;
    emit('update:modelValue', index);
  }

  function next() {
    if (isLast.value) {
      emit('complete');
    } else {
      const newIndex = currentIndex.value + 1;
      emit('update:modelValue', newIndex);
      emit('next', newIndex);
    }
  }

  function prev() {
    if (!isFirst.value) {
      const newIndex = currentIndex.value - 1;
      emit('update:modelValue', newIndex);
      emit('prev', newIndex);
    }
  }
</script>

<template>
  <div class="base-form-wizard">
    <!-- Step indicator -->
    <BaseFormWizardSteps
      :current-index="currentIndex"
      :linear="linear"
      :steps="steps"
      @go-to="goTo"
    />

    <!-- Step content -->
    <BaseFormWizardContent
      :index="currentIndex"
      :step="steps[currentIndex]"
    >
      <slot
        :index="currentIndex"
        :step="steps[currentIndex]"
      >
        <slot
          :index="currentIndex"
          :name="steps[currentIndex]?.id"
          :step="steps[currentIndex]"
        />
      </slot>
    </BaseFormWizardContent>

    <!-- Navigation -->
    <BaseFormWizardFooter
      :back-label="t('back')"
      :finish-label="t('finish')"
      :is-first="isFirst"
      :is-last="isLast"
      :next-label="t('next')"
      @next="next"
      @prev="prev"
    >
      <template
        v-if="$slots.footer"
        #default="slotProps"
      >
        <slot
          :current-index="currentIndex"
          name="footer"
          v-bind="slotProps"
        />
      </template>
    </BaseFormWizardFooter>
  </div>
</template>

<style lang="scss" scoped>
  .base-form-wizard {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-6);

    &__content {
      flex: 1;
    }
  }
</style>

<i18n lang="yaml">
en:
  back: Back
  next: Next
  finish: Finish
</i18n>
