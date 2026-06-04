<script generic="T extends Record<string, unknown>" lang="ts" setup>
  /**
   * VirtualTable — a virtualized data table that renders only visible rows.
   *
   * The header is sticky (position: sticky) so column labels remain visible
   * during scrolling. The body uses the same fixed-height windowing technique
   * as VirtualList. Columns support optional client-side sorting.
   *
   * Props
   *   columns     — column definitions (key, label, width?, align?, sortable?, render?)
   *   rows        — full data array
   *   rowHeight   — fixed height (px) of every body row (default 48)
   *   height      — total component height including header (default 480)
   *   overscan    — extra rows rendered outside the viewport (default 3)
   *   striped     — alternate row background
   *   bordered    — column borders
   *   caption     — accessible <caption> text
   *   emptyText   — message shown when rows is empty
   */
  import { computed, onMounted, onUnmounted, ref } from 'vue';

  import BaseVirtualTableFooter from './base-virtual-table-footer.vue';
  import BaseVirtualTableHead from './base-virtual-table-head.vue';
  import BaseVirtualTableRow from './base-virtual-table-row.vue';

  import type { SortDirection, TableColumn } from '../base-table/types';

  export type { TableColumn as VirtualTableColumn } from '../base-table/types';
  export type { SortDirection } from '../base-table/types';

  const props = withDefaults(
    defineProps<{
      columns: TableColumn<T>[];
      rows: T[];
      rowHeight?: number;
      height?: number;
      overscan?: number;
      striped?: boolean;
      bordered?: boolean;
      caption?: string;
      emptyText?: string;
    }>(),
    {
      rowHeight: 48,
      height: 480,
      overscan: 3,
      striped: false,
      bordered: false,
      caption: undefined,
      emptyText: 'No data available',
    },
  );

  const emit = defineEmits<{
    sort: [key: string, direction: SortDirection];
    rowClick: [row: T, index: number];
  }>();

  // ── Sorting ────────────────────────────────────────────────────────────────
  const sortKey = ref<string | undefined>(undefined);
  const sortDir = ref<SortDirection>(null);

  const sortedRows = computed<T[]>(() => {
    if (!sortKey.value || !sortDir.value) return props.rows;
    return [...props.rows].sort((a, b) => {
      const av = a[sortKey.value!];
      const bv = b[sortKey.value!];
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir.value === 'asc' ? cmp : -cmp;
    });
  });

  function toggleSort(col: TableColumn<T>) {
    if (!col.sortable) return;
    if (sortKey.value !== col.key) {
      sortKey.value = col.key;
      sortDir.value = 'asc';
    } else if (sortDir.value === 'asc') {
      sortDir.value = 'desc';
    } else {
      sortKey.value = undefined;
      sortDir.value = null;
    }
    emit('sort', col.key, sortDir.value);
  }

  // ── Virtualisation ─────────────────────────────────────────────────────────
  // Header height is fixed at 44px — matches the sticky <thead> rendered below.
  const HEADER_HEIGHT = 44;

  const scrollTop = ref(0);
  const bodyRef = ref<HTMLElement | null>(null);

  const bodyHeight = computed(() => props.height - HEADER_HEIGHT);
  const totalScrollHeight = computed(() => sortedRows.value.length * props.rowHeight);

  const startIndex = computed(() => {
    const raw = Math.floor(scrollTop.value / props.rowHeight) - props.overscan;
    return Math.max(0, raw);
  });

  const endIndex = computed(() => {
    const visibleCount = Math.ceil(bodyHeight.value / props.rowHeight);
    const raw = Math.floor(scrollTop.value / props.rowHeight) + visibleCount + props.overscan;
    return Math.min(sortedRows.value.length - 1, raw);
  });

  const visibleRows = computed(() =>
    sortedRows.value.slice(startIndex.value, endIndex.value + 1).map((row, i) => ({
      row,
      index: startIndex.value + i,
    })),
  );

  const offsetY = computed(() => startIndex.value * props.rowHeight);

  function handleScroll(e: Event) {
    scrollTop.value = (e.target as HTMLElement).scrollTop;
  }

  onMounted(() => {
    bodyRef.value?.addEventListener('scroll', handleScroll, { passive: true });
  });

  onUnmounted(() => {
    bodyRef.value?.removeEventListener('scroll', handleScroll);
  });
</script>

<template>
  <!--
    Use div + ARIA roles instead of native <table>/<tbody>/<tr>/<td> elements.

    Mobile Safari has a known rendering bug: when a <table> element is given
    display:flex (needed for the flex-column layout), Safari's native table
    layout model overrides the CSS, causing position:absolute children of
    <tbody> to escape the scroll container and render outside the table.
    <tbody> also cannot reliably act as an overflow:auto scroll container on
    Safari because it is a table-section element.

    Replacing with divs + role="table|rowgroup|row|gridcell" gives us full
    CSS control (flex, position, overflow) across all browsers while keeping
    the component fully accessible to screen readers.
  -->
  <div
    :aria-label="caption || undefined"
    :aria-rowcount="sortedRows.length"
    :style="{
      height: `${height}px`,
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid var(--mp-color-border-default)',
      borderRadius: 'var(--mp-radius-md)',
      overflow: 'hidden',
      background: 'var(--mp-color-bg-surface)',
    }"
    class="virtual-table"
    role="table"
  >
    <!-- ── Sticky header ─────────────────────────────────────────────────── -->
    <BaseVirtualTableHead
      :bordered="bordered"
      :columns="columns"
      :header-height="HEADER_HEIGHT"
      :sort-dir="sortDir"
      :sort-key="sortKey"
      @sort="toggleSort"
    />

    <!-- ── Scrollable body ───────────────────────────────────────────────── -->
    <!--
      This div is the scroll container. It must be a plain div (not <tbody>)
      so that overflow-y:auto and position:relative work correctly on
      Mobile Safari. The role="rowgroup" preserves the ARIA table structure.
    -->
    <div
      ref="bodyRef"
      :style="{
        flex: '1',
        overflowY: 'auto',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
      }"
      class="virtual-table__body"
      role="rowgroup"
      tabindex="0"
    >
      <!-- Empty state -->
      <div
        v-if="sortedRows.length === 0"
        :style="{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: `${bodyHeight}px`,
          color: 'var(--mp-color-text-tertiary)',
          fontSize: 'var(--mp-font-size-sm)',
        }"
        aria-rowindex="1"
        role="row"
      >
        <span
          :aria-colspan="columns.length"
          role="gridcell"
        >
          {{ emptyText }}
        </span>
      </div>

      <!-- Full-height spacer so the scroll container has the correct total scroll range -->
      <div
        v-else
        :style="{ height: `${totalScrollHeight}px`, position: 'relative', pointerEvents: 'none' }"
        aria-hidden="true"
      />

      <!-- Rendered row slice — absolutely positioned within the scroll container -->
      <div
        v-if="sortedRows.length > 0"
        :style="{
          position: 'absolute',
          top: `${offsetY}px`,
          left: 0,
          right: 0,
        }"
      >
        <BaseVirtualTableRow
          v-for="{ row, index } in visibleRows"
          :key="index"
          :bordered="bordered"
          :columns="columns"
          :index="index"
          :row="row"
          :row-height="rowHeight"
          :striped="striped"
          @row-click="(r, i) => emit('rowClick', r, i)"
        >
          <template
            v-for="col in columns"
            #[`cell-${col.key}`]="slotProps"
          >
            <slot
              :name="`cell-${col.key}`"
              v-bind="slotProps"
            />
          </template>
        </BaseVirtualTableRow>
      </div>
    </div>

    <!-- ── Footer / row count ───────────────────────────────────────────── -->
    <BaseVirtualTableFooter
      :row-count="sortedRows.length"
      :sort-dir="sortDir"
      :sort-key="sortKey"
    >
      <template
        v-if="$slots.footer"
        #default
      >
        <slot name="footer" />
      </template>
    </BaseVirtualTableFooter>
  </div>
</template>
