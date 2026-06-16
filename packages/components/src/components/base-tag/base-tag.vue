<script lang="ts" setup>
  /**
   * `BaseTag` — Tag component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { IconClose } from '@mission-platform/icons';

  import BaseTypography from '../base-typography/base-typography.vue';

  export type TagSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  export type TagVariant =
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'default'
    | 'success'
    | 'warning'
    | 'information'
    | 'error'
    | 'critical';

  withDefaults(
    defineProps<{
      label: string;
      size?: TagSize;
      variant?: TagVariant;
      disabled?: boolean;
      /** When `true`, renders a remove (×) button that emits the `remove` event. */
      removable?: boolean;
    }>(),
    {
      size: 'md',
      variant: 'default',
      disabled: false,
      removable: false,
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
      v-if="removable && !disabled"
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
  @layer mp.components {
    .base-tag {
      display: inline-flex;
      align-items: center;
      gap: var(--mp-spacing-1);
      border-radius: var(--mp-radius-full);
      font-family: var(--mp-font-family-sans);
      line-height: var(--mp-line-height-tight);
      white-space: nowrap;

      /* Sizes — canonical 2xs → 2xl scale driven by the shared size tokens. */
      @each $size in '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl' {
        &--#{$size} {
          padding: var(--mp-size-pad-block-#{$size}) var(--mp-size-pad-inline-#{$size});
          font-size: var(--mp-size-font-#{$size});
        }
      }

      /* Variants */
      @mixin tone($family) {
        background-color: var(--mp-color-#{$family}-muted);
        color: var(--mp-color-#{$family}-text);
      }

      &--default {
        @include tone('default');
      }

      &--primary {
        @include tone('primary');
      }

      &--secondary {
        @include tone('secondary');
      }

      &--tertiary {
        @include tone('tertiary');
      }

      &--success {
        @include tone('success');
      }

      &--warning {
        @include tone('warning');
      }

      &--information {
        @include tone('information');
      }

      &--error {
        @include tone('error');
      }

      &--critical {
        @include tone('critical');
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
  }
</style>
