<script lang="ts" setup>
  import type { TabItem } from './base-tabs.vue';

  defineProps<{
    tab: TabItem;
    activeId: string;
  }>();

  defineSlots<{
    default(props: { tab: TabItem }): unknown;
  }>();
</script>

<template>
  <div
    v-show="activeId === tab.id"
    :id="`panel-${tab.id}`"
    :aria-labelledby="`tab-${tab.id}`"
    :hidden="activeId !== tab.id"
    class="base-tabs__panel"
    role="tabpanel"
  >
    <slot :tab="tab" />
  </div>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-tabs__panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding-top: var(--mp-spacing-4);

      // The `display: flex` above overrides the user-agent `[hidden]` rule, so
      // restore it explicitly to keep inactive panels hidden.
      &[hidden] {
        display: none;
      }
    }
  }
</style>
