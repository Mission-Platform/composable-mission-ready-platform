<template>
  <div class="base-dialog__body">
    <slot />
  </div>
</template>

<style scoped lang="scss">
  .base-dialog__body {
    padding: var(--mp-spacing-6);
    flex: 1;
    overflow-y: auto;
  }
</style>
