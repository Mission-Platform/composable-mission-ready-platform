<script lang="ts" setup>
  /**
   * `BaseStack` — a flexbox stack layout primitive that lays its children out in
   * a single line, either **vertically** (a column) or **horizontally** (a row),
   * with a consistent `gap` between them.
   *
   * The `direction` prop switches between the vertical and horizontal stack. The
   * `gap` uses the shared named `2xs … 2xl` scale (each step resolving to a
   * `--mp-spacing-*` design token), matching {@link BaseGrid}. The `justify`
   * (`justify-content`) and `align` (`align-items`) props control distribution
   * along the main axis and placement along the cross axis respectively, and
   * `wrap` toggles flex wrapping. Content is supplied through the default slot.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import { type GridGap, GRID_GAP_SPACING } from '../base-grid/constants';

  import {
    type StackDirection,
    type StackJustify,
    type StackAlign,
    STACK_JUSTIFY_CONTENT,
    STACK_ALIGN_ITEMS,
  } from './constants';

  const props = withDefaults(
    defineProps<{
      /** Axis the children flow along: `vertical` (column) or `horizontal` (row). */
      direction?: StackDirection;
      /** Gap between children (named `2xs … 2xl` scale). */
      gap?: GridGap;
      /** Main-axis distribution of the children (`justify-content`). */
      justify?: StackJustify;
      /** Cross-axis placement of the children (`align-items`). */
      align?: StackAlign;
      /** Whether children wrap onto multiple lines when they overflow. */
      wrap?: boolean;
      /** Render as an inline flex container (`inline-flex`) rather than a block. */
      inline?: boolean;
      /** The HTML tag the stack container renders as. */
      as?: string;
    }>(),
    {
      direction: 'vertical',
      gap: 'md',
      justify: 'start',
      align: 'stretch',
      wrap: false,
      inline: false,
      as: 'div',
    },
  );

  const stackStyle = computed(() => ({
    display: props.inline ? 'inline-flex' : 'flex',
    flexDirection: props.direction === 'horizontal' ? 'row' : 'column',
    flexWrap: props.wrap ? 'wrap' : 'nowrap',
    gap: GRID_GAP_SPACING[props.gap],
    justifyContent: STACK_JUSTIFY_CONTENT[props.justify],
    alignItems: STACK_ALIGN_ITEMS[props.align],
  }));
</script>

<template>
  <component
    :is="as"
    :class="['base-stack', `base-stack--${direction}`]"
    :style="stackStyle"
  >
    <slot />
  </component>
</template>

<style lang="scss" scoped>
  .base-stack {
    min-width: 0;

    &--vertical {
      width: 100%;
    }
  }
</style>
