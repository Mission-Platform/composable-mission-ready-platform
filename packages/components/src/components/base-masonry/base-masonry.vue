<script lang="ts" setup>
  /**
   * `BaseMasonry` — a CSS multi-column masonry layout primitive.
   *
   * Flows its content into balanced columns where items keep their natural
   * height and pack tightly top-to-bottom (Pinterest-style), rather than the
   * fixed rows of a CSS Grid. Provide a fixed number of `columns`, or set
   * `minColumnWidth` to let the layout responsively fit as many columns of at
   * least that width as will fit (`minColumnWidth` wins when both are set).
   *
   * Items can be supplied two ways:
   * - via the default slot, in which case each top-level child is prevented
   *   from breaking across columns, or
   * - via the `items` prop together with the scoped `item` slot, which renders
   *   one break-safe wrapper per item and exposes the `item` and its `index`.
   *
   * The `gap` prop uses the shared `2xs … 2xl` scale, each step resolving to a
   * `--mp-spacing-*` design token.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import { MASONRY_GAP_SPACING, type MasonryGap } from './constants';

  const props = withDefaults(
    defineProps<{
      /** Fixed number of columns. Ignored when `minColumnWidth` is set. */
      columns?: number;
      /** Minimum column width (any CSS length). Enables responsive auto-fit columns. */
      minColumnWidth?: string;
      /** Gap between items / columns (named `2xs … 2xl` scale). */
      gap?: MasonryGap;
      /** Optional list of items to render through the scoped `item` slot. */
      items?: readonly unknown[];
      /** The HTML tag the masonry container renders as. */
      as?: string;
    }>(),
    {
      columns: 3,
      minColumnWidth: undefined,
      gap: 'md',
      items: undefined,
      as: 'div',
    },
  );

  defineSlots<{
    /** Renders a single item when the `items` prop is used. */
    item(props: { item: unknown; index: number }): unknown;
    /** Free-form masonry content (each top-level child is kept break-safe). */
    default(props: Record<string, never>): unknown;
  }>();

  /** Clamped, integral column count (always at least 1). */
  const columnCount = computed(() => Math.max(1, Math.floor(props.columns)));

  const masonryStyle = computed(() => {
    const gap = MASONRY_GAP_SPACING[props.gap];
    const base = { columnGap: gap, '--mp-masonry-gap': gap } as Record<string, string>;
    if (props.minColumnWidth) {
      base.columnWidth = props.minColumnWidth;
    } else {
      base.columnCount = String(columnCount.value);
    }
    return base;
  });
</script>

<template>
  <component
    :is="as"
    :style="masonryStyle"
    class="base-masonry"
  >
    <template v-if="items">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="base-masonry__item"
      >
        <slot
          :index="index"
          :item="item"
          name="item"
        />
      </div>
    </template>
    <slot />
  </component>
</template>

<style lang="scss" scoped>
  .base-masonry {
    width: 100%;
    min-width: 0;

    &__item {
      break-inside: avoid;
      margin-bottom: var(--mp-masonry-gap);
    }

    /* Keep free-form (default-slot) children from splitting across columns. */
    :slotted(*) {
      break-inside: avoid;
      margin-bottom: var(--mp-masonry-gap);
    }
  }
</style>
