<script setup lang="ts">
  import { ref } from 'vue'
  import { IconChevron } from '@mission-platform/icons'

  const props = withDefaults(
    defineProps<{
      summary?: string
      open?: boolean
      disabled?: boolean
    }>(),
    {
      summary: 'Details',
      open: false,
      disabled: false,
    },
  )

  const emit = defineEmits<{
    toggle: [open: boolean]
  }>()

  const isOpen = ref(props.open)

  function handleToggle(event: Event) {
    const target = event.target as HTMLDetailsElement
    isOpen.value = target.open
    emit('toggle', target.open)
  }
</script>

<template>
  <details
    :open="open"
    :class="['base-collapse', { 'base-collapse--disabled': disabled }]"
    @toggle="handleToggle"
  >
    <summary class="base-collapse__summary">
      <slot name="summary">{{ summary }}</slot>
      <IconChevron class="base-collapse__chevron" size="sm" :direction="isOpen ? 'up' : 'down'" />
    </summary>
    <div class="base-collapse__content">
      <slot />
    </div>
  </details>
</template>

<style scoped lang="scss">
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-collapse {
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-md);
    background-color: var(--mp-color-bg-surface);
    overflow: hidden;

    &--disabled {
      pointer-events: none;
      background-color: var(--mp-color-bg-muted);
      border-color: var(--mp-color-border-default);

      .base-collapse__summary {
        color: var(--mp-color-text-disabled);
        cursor: not-allowed;
      }

      .base-collapse__content {
        color: var(--mp-color-text-disabled);
      }
    }

    &__summary {
      @include mp.mp-font('body-md', $weight: 'medium');

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

    &__chevron {
      flex-shrink: 0;
    }

    &__content {
      @include mp.mp-font-body-md;

      padding: var(--mp-spacing-3) var(--mp-spacing-4);
      color: var(--mp-color-text-primary);
      border-top: 1px solid var(--mp-color-border-default);
    }
  }
</style>
