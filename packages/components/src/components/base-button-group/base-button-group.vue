<script lang="ts" setup>
  /**
   * `BaseButtonGroup` — Groups related buttons into a single visual unit.
   *
   * Wraps any number of `BaseButton` / `BaseIconButton` instances (or other
   * controls) in a flex container. When `attached` is set the children are
   * visually joined: inner border radii are removed so the buttons read as a
   * single segmented control.
   *
   * Accessibility:
   * - Exposes `role="group"`. Provide an `aria-label` describing the group.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */

  /** Layout direction of the grouped buttons. */
  export type ButtonGroupOrientation = 'horizontal' | 'vertical';
  /** Spacing between detached buttons. */
  export type ButtonGroupGap = 'none' | 'xs' | 'sm' | 'md';

  withDefaults(
    defineProps<{
      /** Layout direction. Defaults to `'horizontal'`. */
      orientation?: ButtonGroupOrientation;
      /** Visually join children by collapsing inner border radii and gaps. */
      attached?: boolean;
      /** Gap between buttons when not `attached`. Defaults to `'sm'`. */
      gap?: ButtonGroupGap;
      /** Accessible label describing the group. */
      ariaLabel?: string;
    }>(),
    {
      orientation: 'horizontal',
      attached: false,
      gap: 'sm',
      ariaLabel: undefined,
    },
  );

  /**
   * Default slot — the grouped buttons.
   * @slot default
   */
  defineSlots<{
    default?: (props: Record<string, never>) => unknown;
  }>();
</script>

<template>
  <div
    :aria-label="ariaLabel"
    :class="[
      'base-button-group',
      `base-button-group--${orientation}`,
      `base-button-group--gap-${gap}`,
      { 'base-button-group--attached': attached },
    ]"
    role="group"
  >
    <slot />
  </div>
</template>

<style lang="scss" scoped>
  .base-button-group {
    display: inline-flex;

    &--horizontal {
      flex-direction: row;
      align-items: center;
    }

    &--vertical {
      flex-direction: column;
      align-items: stretch;
    }

    /* Gaps (only when not attached) */
    $gap-map: (
      'none': var(--mp-spacing-0),
      'xs': var(--mp-spacing-1),
      'sm': var(--mp-spacing-2),
      'md': var(--mp-spacing-3),
    );

    @each $name, $value in $gap-map {
      &--gap-#{$name}:not(.base-button-group--attached) {
        gap: #{$value};
      }
    }

    /* Attached — collapse inner radii and overlap borders. */
    &--attached {
      gap: 0;

      &.base-button-group--horizontal {
        :deep(> *:not(:first-child)) {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          margin-left: -1px;
        }

        :deep(> *:not(:last-child)) {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }
      }

      &.base-button-group--vertical {
        :deep(> *:not(:first-child)) {
          border-top-left-radius: 0;
          border-top-right-radius: 0;
          margin-top: -1px;
        }

        :deep(> *:not(:last-child)) {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }
      }

      /* Keep the focused button above its neighbours so the focus ring is not clipped. */
      :deep(> *:focus-visible),
      :deep(> *:hover) {
        position: relative;
        z-index: 1;
      }
    }
  }
</style>
