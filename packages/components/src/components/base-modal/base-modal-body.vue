<template>
  <div class="base-modal__body">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
  .base-modal__body {
    padding: var(--mp-spacing-6);
    overflow-y: auto;
    flex: 1;
  }
</style>
