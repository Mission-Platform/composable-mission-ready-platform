<script setup lang="ts">
  import { ref } from 'vue'
  import BaseTabList from '../BaseTabs/BaseTabList.vue'
  import type { TabItem, TabsVariant } from '../BaseTabs'

  const props = withDefaults(
    defineProps<{
      tabs: TabItem[]
      modelValue?: string
      variant?: TabsVariant
      closable?: boolean
      addable?: boolean
    }>(),
    {
      modelValue: undefined,
      variant: 'line',
      closable: false,
      addable: false,
    },
  )

  const emit = defineEmits<{
    'update:modelValue': [id: string]
    change: [id: string]
    close: [id: string]
    add: []
    rename: [id: string]
  }>()

  const tablistRef = ref<{ $el: HTMLElement } | null>(null)

  const activeId = ref(props.modelValue ?? props.tabs[0]?.id ?? '')

  function select(id: string) {
    const tab = props.tabs.find((t) => t.id === id)
    if (!tab || tab.disabled) return
    activeId.value = id
    emit('update:modelValue', id)
    emit('change', id)
  }

  function handleKeydown(event: KeyboardEvent, currentId: string) {
    const enabledTabs = props.tabs.filter((t) => !t.disabled)
    const currentIndex = enabledTabs.findIndex((t) => t.id === currentId)
    let nextIndex = currentIndex

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % enabledTabs.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = enabledTabs.length - 1
    } else {
      return
    }
    event.preventDefault()
    const nextTab = enabledTabs[nextIndex]
    select(nextTab.id)
    const btn = (
      tablistRef.value as { $el: HTMLElement } | null
    )?.$el?.querySelector<HTMLButtonElement>(`[data-tab-id="${nextTab.id}"]`)
    btn?.focus()
  }

  const activeTab = () => props.tabs.find((t) => t.id === activeId.value)
</script>

<template>
  <div :class="['base-virtual-tabs', `base-virtual-tabs--${variant}`]">
    <BaseTabList
      ref="tablistRef"
      :tabs="tabs"
      :active-id="activeId"
      :variant="variant"
      :closable="closable"
      :addable="addable"
      @select="select"
      @close="emit('close', $event)"
      @add="emit('add')"
      @rename="emit('rename', $event)"
      @keydown="handleKeydown"
    />

    <div
      v-if="activeTab()"
      :id="`panel-${activeTab()!.id}`"
      role="tabpanel"
      :aria-labelledby="`tab-${activeTab()!.id}`"
      class="base-virtual-tabs__panel"
    >
      <slot :name="activeTab()!.id" :tab="activeTab()!" />
    </div>
  </div>
</template>

<style scoped lang="scss">
  .base-virtual-tabs {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .base-virtual-tabs__panel {
    padding-top: var(--mp-spacing-4);
    display: flex;
    flex-direction: column;
    flex: 1;
  }
</style>
