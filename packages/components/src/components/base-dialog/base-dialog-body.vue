<template>
  <div class="base-dialog__body">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-dialog__body {
      padding: var(--mp-spacing-6);
      flex: 1;
      overflow-y: auto;
    }
  }
</style>
