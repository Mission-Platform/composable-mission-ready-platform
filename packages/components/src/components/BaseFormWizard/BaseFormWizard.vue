<script setup lang="ts">
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import BaseFormWizardSteps from './BaseFormWizardSteps.vue'
  import BaseFormWizardContent from './BaseFormWizardContent.vue'
  import BaseFormWizardFooter from './BaseFormWizardFooter.vue'

  export interface WizardStep {
    id: string
    title: string
    description?: string
  }

  const props = withDefaults(
    defineProps<{
      steps: WizardStep[]
      modelValue?: number
      linear?: boolean
    }>(),
    {
      modelValue: 0,
      linear: true,
    },
  )

  const emit = defineEmits<{
    'update:modelValue': [index: number]
    complete: []
    next: [index: number]
    prev: [index: number]
  }>()

  const { t } = useI18n({
    inheritLocale: true,
    messages: { en: { back: 'Back', next: 'Next', finish: 'Finish' } },
  })

  const currentIndex = computed(() => props.modelValue)
  const isFirst = computed(() => currentIndex.value === 0)
  const isLast = computed(() => currentIndex.value === props.steps.length - 1)

  function goTo(index: number) {
    if (props.linear && index > currentIndex.value + 1) return
    if (index < 0 || index >= props.steps.length) return
    emit('update:modelValue', index)
  }

  function next() {
    if (isLast.value) {
      emit('complete')
    } else {
      const newIndex = currentIndex.value + 1
      emit('update:modelValue', newIndex)
      emit('next', newIndex)
    }
  }

  function prev() {
    if (!isFirst.value) {
      const newIndex = currentIndex.value - 1
      emit('update:modelValue', newIndex)
      emit('prev', newIndex)
    }
  }

</script>

<template>
  <div class="base-form-wizard">
    <!-- Step indicator -->
    <BaseFormWizardSteps
      :steps="steps"
      :current-index="currentIndex"
      :linear="linear"
      @go-to="goTo"
    />

    <!-- Step content -->
    <BaseFormWizardContent :step="steps[currentIndex]" :index="currentIndex">
      <slot :step="steps[currentIndex]" :index="currentIndex">
        <slot :name="steps[currentIndex]?.id" :step="steps[currentIndex]" :index="currentIndex" />
      </slot>
    </BaseFormWizardContent>

    <!-- Navigation -->
    <BaseFormWizardFooter
      :is-first="isFirst"
      :is-last="isLast"
      :back-label="t('back')"
      :next-label="t('next')"
      :finish-label="t('finish')"
      @prev="prev"
      @next="next"
    >
      <template v-if="$slots.footer" #default="slotProps">
        <slot name="footer" v-bind="slotProps" :current-index="currentIndex" />
      </template>
    </BaseFormWizardFooter>
  </div>
</template>

<style scoped lang="scss">
  .base-form-wizard {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-6);

    &__content {
      flex: 1;
    }
  }
</style>
