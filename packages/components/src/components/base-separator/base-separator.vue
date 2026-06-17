<script lang="ts" setup>
  /**
   * `BaseSeparator` — Visual separator / divider for the Mission Platform UI.
   *
   * Renders a horizontal or vertical rule used to separate groups of content.
   * When the default slot is used (horizontal only) the separator renders a
   * centred label between two lines.
   *
   * Accessibility:
   * - By default exposes `role="separator"` with the appropriate
   *   `aria-orientation`.
   * - Set `decorative` to mark the separator as purely presentational
   *   (`role="none"`), removing it from the accessibility tree.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, useSlots } from 'vue';

  /** Layout direction of the separator. */
  export type SeparatorOrientation = 'horizontal' | 'vertical';
  /** Line style. */
  export type SeparatorVariant = 'solid' | 'dashed' | 'dotted';
  /** Spacing applied as margin around the separator. */
  export type SeparatorSpacing = 'none' | 'sm' | 'md' | 'lg' | 'xl';

  const props = withDefaults(
    defineProps<{
      /** Layout direction. Defaults to `'horizontal'`. */
      orientation?: SeparatorOrientation;
      /** Line style. Defaults to `'solid'`. */
      variant?: SeparatorVariant;
      /** Margin applied along the main axis. Defaults to `'md'`. */
      spacing?: SeparatorSpacing;
      /** When `true`, removes the separator from the accessibility tree. */
      decorative?: boolean;
    }>(),
    {
      orientation: 'horizontal',
      variant: 'solid',
      spacing: 'md',
      decorative: false,
    },
  );

  /**
   * Optional default slot — a centred label rendered between two lines.
   * Only honoured when `orientation` is `'horizontal'`.
   * @slot default
   */
  defineSlots<{
    default?: (props: Record<string, never>) => unknown;
  }>();

  const slots = useSlots();

  const hasLabel = computed(() => props.orientation === 'horizontal' && !!slots.default);
</script>

<template>
  <div
    v-if="hasLabel"
    :aria-orientation="decorative ? undefined : 'horizontal'"
    :class="[
      'base-separator',
      'base-separator--labelled',
      `base-separator--${variant}`,
      `base-separator--spacing-${spacing}`,
    ]"
    :role="decorative ? 'none' : 'separator'"
  >
    <span class="base-separator__line" />
    <span class="base-separator__label">
      <slot />
    </span>
    <span class="base-separator__line" />
  </div>
  <hr
    v-else
    :aria-orientation="decorative ? undefined : orientation"
    :class="[
      'base-separator',
      `base-separator--${orientation}`,
      `base-separator--${variant}`,
      `base-separator--spacing-${spacing}`,
    ]"
    :role="decorative ? 'none' : 'separator'"
  />
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-separator {
      border: 0;
      background: transparent;
      color: var(--mp-color-text-tertiary);

      &--horizontal {
        width: 100%;
        border-top-width: 1px;
        border-top-color: var(--mp-color-border-default);

        &.base-separator--solid {
          border-top-style: solid;
        }

        &.base-separator--dashed {
          border-top-style: dashed;
        }

        &.base-separator--dotted {
          border-top-style: dotted;
        }
      }

      &--vertical {
        align-self: stretch;
        height: auto;
        min-height: 1em;
        margin-inline: var(--mp-separator-spacing, var(--mp-spacing-4));
        border-left-width: 1px;
        border-left-color: var(--mp-color-border-default);

        &.base-separator--solid {
          border-left-style: solid;
        }

        &.base-separator--dashed {
          border-left-style: dashed;
        }

        &.base-separator--dotted {
          border-left-style: dotted;
        }
      }

      &--labelled {
        display: flex;
        align-items: center;
        gap: var(--mp-spacing-3);
        width: 100%;
      }

      &__line {
        flex: 1 1 auto;
        border-top-width: 1px;
        border-top-color: var(--mp-color-border-default);
      }

      &--labelled.base-separator--solid &__line {
        border-top-style: solid;
      }

      &--labelled.base-separator--dashed &__line {
        border-top-style: dashed;
      }

      &--labelled.base-separator--dotted &__line {
        border-top-style: dotted;
      }

      &__label {
        flex: 0 0 auto;
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-size-font-sm);
        line-height: var(--mp-line-height-tight);
        color: var(--mp-color-text-secondary);
        white-space: nowrap;
      }

      /* Spacing — applied along the main axis for the relevant orientation. */
      $spacing-map: (
        'none': var(--mp-spacing-0),
        'sm': var(--mp-spacing-2),
        'md': var(--mp-spacing-4),
        'lg': var(--mp-spacing-6),
        'xl': var(--mp-spacing-8),
      );

      @each $name, $value in $spacing-map {
        &--spacing-#{$name} {
          --mp-separator-spacing: #{$value};
        }
      }

      &--horizontal,
      &--labelled {
        margin-block: var(--mp-separator-spacing, var(--mp-spacing-4));
      }
    }
  }
</style>
