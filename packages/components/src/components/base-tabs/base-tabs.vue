<script lang="ts" setup>
  /**
   * `BaseTabs` is an accessible, fully-controlled tabs container.
   *
   * It renders a horizontal tab list (`BaseTabList`) and a panel per `TabItem`
   * (`BaseTabPanel`), with keyboard navigation (`ArrowLeft`/`ArrowRight`/`Home`/`End`),
   * `v-model` two-way binding on the active tab id, optional closable tabs, and an
   * optional add (`+`) affordance for dynamic tabs. Content for each tab is provided
   * via a named slot matching the tab's `id`.
   *
   * Variants:
   * - `line` — underlined active tab, suitable for primary in-page navigation.
   * - `pill` — rounded pills on a muted background, suitable for segmented controls.
   *
   * Accessibility:
   * - Uses ARIA `tablist` / `tab` / `tabpanel` roles via the child components.
   * - Disabled tabs are skipped by keyboard navigation and cannot be selected.
   *
   * @example
   * ```html
   * <BaseTabs v-model="activeId" :tabs="tabs" variant="line">
   *   <template #overview><p>Overview</p></template>
   *   <template #details><p>Details</p></template>
   * </BaseTabs>
   * ```
   */
  import { ref, watch } from 'vue';

  import BaseTabList from './base-tab-list.vue';
  import BaseTabPanel from './base-tab-panel.vue';

  /** A single tab descriptor passed to `BaseTabs`. */
  export interface TabItem {
    /** Stable unique identifier. Also used as the slot name for the tab's panel content. */
    id: string;
    /** Human-readable label rendered inside the tab. */
    label: string;
    /** When `true`, the tab cannot be selected and is skipped by keyboard navigation. */
    disabled?: boolean;
  }

  /** Visual treatment of the tab list. */
  export type TabsVariant = 'line' | 'pill';

  const props = withDefaults(
    defineProps<{
      /** Ordered list of tabs to render. */
      tabs: TabItem[];
      /** `v-model` — currently active tab `id`. Defaults to the first tab's id when omitted. */
      modelValue?: string;
      /** Visual treatment. Defaults to `'line'`. */
      variant?: TabsVariant;
      /** When `true`, each tab renders a close affordance and emits `close` on activation. */
      closable?: boolean;
      /** When `true`, a trailing `+` button is rendered and emits `add` on click. */
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
    /** `v-model` update with the newly selected tab id. */
    'update:modelValue': [id: string];
    /** Fired alongside `update:modelValue` whenever the active tab changes. */
    change: [id: string];
    /** Fired when a closable tab's close affordance is activated. The parent owns removal logic. */
    close: [id: string];
    /** Fired when the `+` (add) button is clicked. The parent owns insertion logic. */
    add: [];
    /** Fired when a tab is double-clicked / requests a rename. The parent owns label-editing UI. */
    rename: [id: string];
  }>();

  const tablistRef = ref<{ $el: HTMLElement } | null>(null);

  const activeId = ref(props.modelValue ?? props.tabs[0]?.id ?? '');

  // Keep the internal active tab in sync when the component is driven as a
  // controlled (`v-model`) input, so a parent can switch tabs programmatically.
  watch(
    () => props.modelValue,
    (id) => {
      if (id != undefined && id !== activeId.value) activeId.value = id;
    },
  );

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
