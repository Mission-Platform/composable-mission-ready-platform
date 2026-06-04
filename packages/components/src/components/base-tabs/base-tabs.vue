<script lang="ts" setup>
  import { ref } from 'vue';

  import BaseTabList from './base-tab-list.vue';
  import BaseTabPanel from './base-tab-panel.vue';

  export interface TabItem {
    id: string;
    label: string;
    disabled?: boolean;
  }

  export type TabsVariant = 'line' | 'pill';

  const props = withDefaults(
    defineProps<{
      tabs: TabItem[];
      modelValue?: string;
      variant?: TabsVariant;
      closable?: boolean;
      addable?: boolean;
    }>(),
    {
      modelValue: undefined,
      variant: 'line',
      closable: false,
      addable: false,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [id: string];
    change: [id: string];
    close: [id: string];
    add: [];
    rename: [id: string];
  }>();

  const tablistRef = ref<{ $el: HTMLElement } | null>(null);

  const activeId = ref(props.modelValue ?? props.tabs[0]?.id ?? '');

  function select(id: string) {
    const tab = props.tabs.find((t) => t.id === id);
    if (!tab || tab.disabled) return;
    activeId.value = id;
    emit('update:modelValue', id);
    emit('change', id);
  }

  function handleKeydown(event: KeyboardEvent, currentId: string) {
    const enabledTabs = props.tabs.filter((t) => !t.disabled);
    const currentIndex = enabledTabs.findIndex((t) => t.id === currentId);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % enabledTabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = enabledTabs.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const nextTab = enabledTabs[nextIndex];
    select(nextTab.id);
    const btn = (tablistRef.value as { $el: HTMLElement } | null)?.$el?.querySelector<HTMLButtonElement>(
      `[data-tab-id="${nextTab.id}"]`,
    );
    btn?.focus();
  }
</script>

<template>
  <div :class="['base-tabs', `base-tabs--${variant}`]">
    <BaseTabList
      ref="tablistRef"
      :active-id="activeId"
      :addable="addable"
      :closable="closable"
      :tabs="tabs"
      :variant="variant"
      @add="emit('add')"
      @close="emit('close', $event)"
      @keydown="handleKeydown"
      @rename="emit('rename', $event)"
      @select="select"
    />

    <BaseTabPanel
      v-for="tab in tabs"
      :key="tab.id"
      :active-id="activeId"
      :tab="tab"
    >
      <template #default="slotProps">
        <slot
          :name="tab.id"
          v-bind="slotProps"
        />
      </template>
    </BaseTabPanel>
  </div>
</template>

<style lang="scss" scoped>
  .base-tabs {
    display: flex;
    flex-direction: column;
    flex: 1;
  }
</style>
