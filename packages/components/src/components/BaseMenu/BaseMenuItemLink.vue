<script lang="ts" setup>
  import { RouterLink } from 'vue-router';

  import type { MenuItem } from './BaseMenu.vue';

  defineProps<{
    item: MenuItem;
  }>();
</script>

<template>
  <RouterLink
    v-if="item.to && !item.disabled"
    :tabindex="item.disabled ? -1 : 0"
    :to="item.to"
    class="base-menu__link"
    role="menuitem"
  >
    <span
      v-if="item.icon"
      aria-hidden="true"
      class="base-menu__icon"
    >{{ item.icon }}</span>
    <span class="base-menu__label">{{ item.label }}</span>
  </RouterLink>
  <a
    v-else
    :aria-disabled="item.disabled || undefined"
    :href="item.disabled ? undefined : item.href"
    :tabindex="item.disabled ? -1 : 0"
    class="base-menu__link"
    role="menuitem"
  >
    <span
      v-if="item.icon"
      aria-hidden="true"
      class="base-menu__icon"
    >{{ item.icon }}</span>
    <span class="base-menu__label">{{ item.label }}</span>
  </a>
</template>

<style lang="scss" scoped>
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

    &:focus-visible {
      outline: 2px solid var(--mp-color-border-focus);
      outline-offset: 2px;
    }

    &[aria-disabled='true'] {
      color: var(--mp-color-text-disabled);
      cursor: not-allowed;
      pointer-events: none;
    }

    &:hover:not([aria-disabled='true']) {
      background-color: var(--mp-color-bg-subtle);
      color: var(--mp-color-text-primary);
    }
  }

  .base-menu__icon {
    flex-shrink: 0;
    font-size: var(--mp-font-size-base);
  }

  .base-menu__label {
    flex: 1;
  }
</style>
