<template>
  <div class="base-sidebar__body">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
  .base-sidebar__body {
    flex: 1;
    overflow-y: auto;
    padding: var(--mp-spacing-6);
  }
</style>
