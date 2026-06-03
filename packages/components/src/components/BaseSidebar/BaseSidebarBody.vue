<template>
  <div class="base-sidebar__body">
    <slot />
  </div>
</template>

<style scoped lang="scss">
  .base-sidebar__body {
    flex: 1;
    overflow-y: auto;
    padding: var(--mp-spacing-6);
  }
</style>
