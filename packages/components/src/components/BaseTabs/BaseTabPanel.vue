<script setup lang="ts">
  import type { TabItem } from './BaseTabs.vue'

  defineProps<{
    tab: TabItem
    activeId: string
  }>()

  defineSlots<{
    default(props: { tab: TabItem }): unknown
  }>()
</script>

<template>
  <div
    :id="`panel-${tab.id}`"
    role="tabpanel"
    :aria-labelledby="`tab-${tab.id}`"
    :hidden="activeId !== tab.id"
    class="base-tabs__panel"
  >
    <slot :tab="tab" />
  </div>
</template>

<style scoped lang="scss">
  .base-tabs__panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding-top: var(--mp-spacing-4);
  }
</style>
