<script lang="ts" setup>
  import { IconClose } from '@mission-platform/icons';

  import BaseTypography from '../base-typography/base-typography.vue';

  export type TagSize = 'sm' | 'md';
  export type TagVariant = 'neutral' | 'primary';

  withDefaults(
    defineProps<{
      label: string;
      size?: TagSize;
      variant?: TagVariant;
      disabled?: boolean;
    }>(),
    {
      size: 'md',
      variant: 'neutral',
      disabled: false,
    },
  );

  const emit = defineEmits<{
    remove: [];
  }>();
</script>

<template>
  <span :class="['base-tag', `base-tag--${size}`, `base-tag--${variant}`, { 'base-tag--disabled': disabled }]">
    <BaseTypography
      as="span"
      class="base-tag__label"
      color="inherit"
      variant="caption"
      weight="medium"
    >
      {{ label }}
    </BaseTypography>
    <button
      v-if="!disabled"
      :aria-label="`Remove ${label}`"
      class="base-tag__remove"
      type="button"
      @click.stop="emit('remove')"
    >
      <IconClose size="2xs" />
    </button>
  </span>
</template>

<style lang="scss" scoped>
  .base-tag {
    display: inline-flex;
    align-items: center;
    gap: var(--mp-spacing-1);
    border-radius: var(--mp-radius-full);
    font-family: var(--mp-font-family-sans);
    line-height: var(--mp-line-height-tight);
    white-space: nowrap;

    /* Sizes */
    &--sm {
      padding: 2px var(--mp-spacing-2);
    }

    &--md {
      padding: var(--mp-spacing-1) var(--mp-spacing-2);
    }

    /* Variants */
    &--neutral {
      background-color: var(--mp-color-bg-muted);
      color: var(--mp-color-text-secondary);
    }

    &--primary {
      background-color: var(--mp-color-primary-muted);
      color: var(--mp-color-primary-text);
    }

    /* States */
    &--disabled {
      pointer-events: none;
      background-color: var(--mp-color-bg-muted);
      color: var(--mp-color-text-disabled);
    }

    &__label {
      line-height: inherit;
    }

    &__remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      color: inherit;
      border-radius: var(--mp-radius-full);
      line-height: 1;

      &:hover {
        opacity: 0.7;
      }

      &:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 1px;
      }
    }
  }
</style>
