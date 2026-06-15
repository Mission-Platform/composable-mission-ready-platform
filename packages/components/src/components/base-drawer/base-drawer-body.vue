<template>
  <div class="base-drawer__body">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
  .base-drawer__body {
    flex: 1;
    overflow-y: auto;
    padding: var(--mp-spacing-6);
  }
</style>
