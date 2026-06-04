<script lang="ts" setup>
  import { IconChevron } from '@mission-platform/icons';
  import { inject } from 'vue';

  import BaseTypography from '../base-typography/base-typography.vue';

  import type { AccordionContext } from './base-accordion.vue';

  const props = defineProps<{
    id: string;
    disabled?: boolean;
  }>();

  const accordion = inject<AccordionContext>('accordion');

  function handleClick() {
    if (!props.disabled) {
      accordion?.toggle(props.id);
    }
  }

  function isOpen() {
    return accordion?.openIds.value.has(props.id) ?? false;
  }
</script>

<template>
  <details
    :class="['base-accordion__item', { 'base-accordion__item--disabled': disabled }]"
    :open="isOpen()"
    @toggle.prevent
  >
    <summary
      :aria-disabled="disabled || undefined"
      class="base-accordion__summary"
      role="button"
      tabindex="0"
      @click.prevent="handleClick"
      @keydown.enter.prevent="handleClick"
      @keydown.space.prevent="handleClick"
    >
      <BaseTypography
        as="span"
        color="inherit"
        variant="body-md"
        weight="medium"
      >
        <slot name="summary" />
      </BaseTypography>
      <IconChevron
        :direction="isOpen() ? 'up' : 'down'"
        :size="16"
        class="base-accordion__chevron"
      />
    </summary>
    <div
      v-if="isOpen()"
      class="base-accordion__content"
    >
      <slot />
    </div>
  </details>
</template>

<style lang="scss" scoped>
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

  .base-accordion__chevron {
    flex-shrink: 0;
  }

  .base-accordion__content {
    padding: var(--mp-spacing-3) var(--mp-spacing-4);
    border-top: 1px solid var(--mp-color-border-default);
  }
</style>
