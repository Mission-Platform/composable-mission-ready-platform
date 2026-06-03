<script setup lang="ts">
  import { computed } from 'vue'
  import type { MenuItem } from './BaseMenu.vue'
  import { IconChevron } from '@mission-platform/icons'

  const props = withDefaults(
    defineProps<{
      item: MenuItem
      isOpen: boolean
      nested?: boolean
    }>(),
    {
      nested: false,
    },
  )

  const emit = defineEmits<{
    click: []
  }>()

  const chevronDirection = computed(() => {
    if (props.nested) return props.isOpen ? 'left' : 'right'
    return props.isOpen ? 'up' : 'down'
  })
</script>

<template>
  <button
    class="base-menu__link"
    type="button"
    role="menuitem"
    :aria-disabled="item.disabled || undefined"
    :aria-haspopup="item.children && item.children.length > 0 ? 'menu' : undefined"
    :aria-expanded="item.children && item.children.length > 0 ? isOpen : undefined"
    :disabled="item.disabled"
    @click="emit('click')"
  >
    <span v-if="item.icon" class="base-menu__icon" aria-hidden="true">{{ item.icon }}</span>
    <span class="base-menu__label">{{ item.label }}</span>
    <IconChevron
      v-if="item.children && item.children.length > 0"
      class="base-menu__chevron"
      :direction="chevronDirection"
      size="sm"
    />
  </button>
</template>

<style scoped lang="scss">
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-menu__link {
    @include mp.mp-font-label;

    display: flex;
    align-items: center;
    gap: var(--mp-spacing-2);
    width: 100%;
    padding: var(--mp-spacing-2) var(--mp-spacing-3);
    border-radius: var(--mp-radius-md);
    color: var(--mp-color-text-primary);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: none;
    text-align: left;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;

    &:hover:not(:disabled):not([aria-disabled='true']) {
      background-color: var(--mp-color-bg-subtle);
      color: var(--mp-color-text-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--mp-color-border-focus);
      outline-offset: 2px;
    }

    &:disabled,
    &[aria-disabled='true'] {
      color: var(--mp-color-text-disabled);
      cursor: not-allowed;
      pointer-events: none;
    }
  }

  .base-menu__icon {
    flex-shrink: 0;
    font-size: var(--mp-font-size-base);
  }

  .base-menu__label {
    flex: 1;
  }

  .base-menu__chevron {
    flex-shrink: 0;
    color: var(--mp-color-text-secondary);
  }
</style>
