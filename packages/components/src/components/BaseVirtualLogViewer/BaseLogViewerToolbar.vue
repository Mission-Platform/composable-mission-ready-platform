<script lang="ts" setup>
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
