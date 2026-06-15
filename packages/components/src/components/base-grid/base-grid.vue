<script lang="ts" setup>
  /**
   * `BaseGrid` — a CSS Grid layout primitive that arranges its content into a
   * grid of `rows` (m) by `cols` (n).
   *
   * By default it defines `cols` equally-sized columns and `rows` equally-sized
   * rows, with a configurable `gap` between cells (overridable per axis via
   * `rowGap` / `columnGap`). Gaps use the named `2xs … 2xl` scale, each step
   * resolving to a `--mp-spacing-*` design token. Content is supplied through
   * the default slot and flows into the grid cells in source order.
   *
   * For a fully populated grid, use the scoped `cell` slot: it renders one node
   * per cell (`rows * cols` cells) and exposes the zero-based `row`, `column`,
   * and `index` of each cell so consumers can render coordinate-aware content.
   * Children placed via the default slot may span multiple tracks with the
   * standard `grid-column` / `grid-row` `span` CSS (see the stories).
   *
   * The `justify` / `align` props position the content of every cell along the
   * inline (`justify-items`) and block (`align-items`) axes respectively.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import { type GridGap, type GridAlignment, GRID_GAP_SPACING } from './constants';

  /** Coordinates exposed by the scoped `cell` slot for each grid cell. */
  export interface GridCell {
    /** Zero-based, row-major index of the cell (`0 … rows * cols - 1`). */
    index: number;
    /** Zero-based row of the cell (`0 … rows - 1`). */
    row: number;
    /** Zero-based column of the cell (`0 … cols - 1`). */
    column: number;
  }

  const props = withDefaults(
    defineProps<{
      /** Number of rows (m) in the grid. */
      rows?: number;
      /** Number of columns (n) in the grid. */
      cols?: number;
      /** Gap between cells (named `2xs … 2xl` scale). Sets both the row and column gaps. */
      gap?: GridGap;
      /** Row gap (named `2xs … 2xl` scale). Overrides `gap` on the block axis. */
      rowGap?: GridGap;
      /** Column gap (named `2xs … 2xl` scale). Overrides `gap` on the inline axis. */
      columnGap?: GridGap;
      /** Inline-axis placement of each cell's content (`justify-items`). */
      justify?: GridAlignment;
      /** Block-axis placement of each cell's content (`align-items`). */
      align?: GridAlignment;
      /** The HTML tag the grid container renders as. */
      as?: string;
    }>(),
    {
      rows: 1,
      cols: 1,
      gap: 'md',
      rowGap: undefined,
      columnGap: undefined,
      justify: 'stretch',
      align: 'stretch',
      as: 'div',
    },
  );

  /** Clamped, integral row count (always at least 1). */
  const rowCount = computed(() => Math.max(1, Math.floor(props.rows)));
  /** Clamped, integral column count (always at least 1). */
  const columnCount = computed(() => Math.max(1, Math.floor(props.cols)));

  /** Row-major list of cell coordinates for the scoped `cell` slot. */
  const cells = computed<GridCell[]>(() =>
    Array.from({ length: rowCount.value * columnCount.value }, (_, index) => ({
      index,
      row: Math.floor(index / columnCount.value),
      column: index % columnCount.value,
    })),
  );

  const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${columnCount.value}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rowCount.value}, minmax(0, auto))`,
    rowGap: GRID_GAP_SPACING[props.rowGap ?? props.gap],
    columnGap: GRID_GAP_SPACING[props.columnGap ?? props.gap],
    justifyItems: props.justify,
    alignItems: props.align,
  }));
</script>

<template>
  <component
    :is="as"
    :style="gridStyle"
    class="base-grid"
  >
    <template v-if="$slots.cell">
      <slot
        v-for="cell in cells"
        :key="cell.index"
        :column="cell.column"
        :index="cell.index"
        :row="cell.row"
        name="cell"
      />
    </template>
    <slot />
  </component>
</template>

<style lang="scss" scoped>
  .base-grid {
    display: grid;
    width: 100%;
    min-width: 0;
  }
</style>
