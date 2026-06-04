<script lang="ts" setup>
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
  .base-menu__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);
  }
</style>
