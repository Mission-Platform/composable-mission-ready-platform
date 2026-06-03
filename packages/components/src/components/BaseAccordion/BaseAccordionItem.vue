<script setup lang="ts">
  import { inject } from 'vue'

  import { IconChevron } from '@mission-platform/icons'
  import BaseTypography from '../BaseTypography/BaseTypography.vue'

  import type { AccordionContext } from './BaseAccordion.vue'

  const props = defineProps<{
    id: string
    disabled?: boolean
  }>()

  const accordion = inject<AccordionContext>('accordion')

  function handleClick() {
    if (!props.disabled) {
      accordion?.toggle(props.id)
    }
  }

  function isOpen() {
    return accordion?.openIds.value.has(props.id) ?? false
  }
</script>

<template>
  <details
    :open="isOpen()"
    :class="['base-accordion__item', { 'base-accordion__item--disabled': disabled }]"
    :aria-disabled="disabled || undefined"
    @toggle.prevent
    @click.prevent="handleClick"
  >
    <summary class="base-accordion__summary">
      <BaseTypography variant="body-md" weight="medium" as="span" color="inherit"
        ><slot name="summary"
      /></BaseTypography>
      <IconChevron
        class="base-accordion__chevron"
        :direction="isOpen() ? 'up' : 'down'"
        :size="16"
      />
    </summary>
    <div v-if="isOpen()" class="base-accordion__content">
      <slot />
    </div>
  </details>
</template>

<style scoped lang="scss">
  .base-accordion__item {
    background-color: var(--mp-color-bg-surface);

    & + .base-accordion__item {
      border-top: 1px solid var(--mp-color-border-default);
    }

    &--disabled {
      background-color: var(--mp-color-bg-muted);

      .base-accordion__summary {
        color: var(--mp-color-text-disabled);
        cursor: not-allowed;

        &:hover {
          background-color: var(--mp-color-bg-muted);
        }
      }
    }
  }

  .base-accordion__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--mp-spacing-3) var(--mp-spacing-4);
    cursor: pointer;
    color: var(--mp-color-text-primary);
    list-style: none;
    user-select: none;
    gap: var(--mp-spacing-2);

    &::-webkit-details-marker {
      display: none;
    }

    &:hover {
      background-color: var(--mp-color-bg-muted);
    }

    &:focus-visible {
      outline: none;
      box-shadow: var(--mp-shadow-focus-primary);
    }
  }

  .base-accordion__chevron {
    flex-shrink: 0;
  }

  .base-accordion__content {
    padding: var(--mp-spacing-3) var(--mp-spacing-4);
    border-top: 1px solid var(--mp-color-border-default);
  }
</style>
