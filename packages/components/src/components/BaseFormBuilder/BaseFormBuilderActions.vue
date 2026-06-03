<script setup lang="ts">
  defineProps<{
    resetLabel: string
    submitLabel: string
  }>()
</script>

<template>
  <div class="form-builder__actions">
    <slot>
      <button type="reset" class="form-builder__btn form-builder__btn--reset">
        {{ resetLabel }}
      </button>
      <button type="submit" class="form-builder__btn form-builder__btn--submit">
        {{ submitLabel }}
      </button>
    </slot>
  </div>
</template>

<style scoped lang="scss">
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .form-builder__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--mp-spacing-2);
  }

  .form-builder__btn {
    @include mp.mp-font('body-md', $weight: 'medium');

    padding: var(--mp-spacing-2) var(--mp-spacing-4);
    border-radius: var(--mp-radius-md);
    border: 1px solid var(--mp-color-border-default);
    cursor: pointer;
    transition:
      background-color 150ms ease,
      color 150ms ease,
      border-color 150ms ease;

    &--reset {
      background-color: var(--mp-color-bg-surface);
      color: var(--mp-color-text-secondary);

      &:hover {
        background-color: var(--mp-color-bg-muted);
        color: var(--mp-color-text-primary);
      }
    }

    &--submit {
      background-color: var(--mp-color-primary-default);
      color: var(--mp-color-text-on-primary);
      border-color: var(--mp-color-primary-default);

      &:hover {
        background-color: var(--mp-color-primary-hover, var(--mp-color-primary-default));
      }
    }
  }
</style>
