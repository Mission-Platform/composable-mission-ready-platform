<script setup lang="ts">
  defineProps<{
    orientation: 'vertical' | 'horizontal'
  }>()
</script>

<template>
  <menu class="base-menu__list" role="menubar" :aria-orientation="orientation">
    <slot />
  </menu>
</template>

<style scoped lang="scss">
  .base-menu__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);
  }
</style>
