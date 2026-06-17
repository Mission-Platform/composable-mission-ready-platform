<script lang="ts" setup>
  /**
   * `BaseMenuList` — Menu list component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  defineProps<{
    orientation: 'vertical' | 'horizontal';
  }>();
</script>

<template>
  <menu
    :aria-orientation="orientation"
    class="base-menu__list"
    role="menubar"
  >
    <slot />
  </menu>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-menu__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-1);
    }
  }
</style>
