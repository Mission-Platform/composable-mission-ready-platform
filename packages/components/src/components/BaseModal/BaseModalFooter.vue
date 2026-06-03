<template>
  <footer class="base-modal__footer">
    <slot />
  </footer>
</template>

<style scoped lang="scss">
  .base-modal__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--mp-spacing-3);
    padding: var(--mp-spacing-4) var(--mp-spacing-6);
    border-top: 1px solid var(--mp-color-border-default);
    flex-shrink: 0;
  }
</style>
