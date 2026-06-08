<script lang="ts" setup>
  /**
   * `BaseLogViewerToolbar` — Log viewer toolbar component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  defineProps<{
    filteredCount: number;
    totalCount: number;
  }>();
</script>

<template>
  <div class="log-viewer__toolbar">
    <span class="log-viewer__filter-badge">
      {{ filteredCount.toLocaleString() }} / {{ totalCount.toLocaleString() }} entries
    </span>
  </div>
</template>
