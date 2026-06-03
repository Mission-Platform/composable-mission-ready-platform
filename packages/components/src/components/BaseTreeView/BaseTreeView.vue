<script setup lang="ts">
  /**
   * TreeView — a recursive, accessible tree component.
   *
   * Props
   *   nodes        — array of TreeNode items to render
   *   defaultOpen  — expand all nodes by default (default false)
   *
   * Slots
   *   label({ node, depth }) — custom label renderer per node
   *
   * Events
   *   select(node)  — emitted when a node label is clicked
   *   toggle(node)  — emitted when a node is expanded/collapsed
   */
  import { ref } from 'vue'

  import BaseTreeNode from './BaseTreeNode.vue'

  export interface TreeNode {
    id: string | number
    label: string
    children?: TreeNode[]
    [key: string]: unknown
  }

  const props = withDefaults(
    defineProps<{
      nodes: TreeNode[]
      defaultOpen?: boolean
    }>(),
    {
      defaultOpen: false,
    },
  )

  const emit = defineEmits<{
    select: [node: TreeNode]
    toggle: [node: TreeNode]
  }>()

  defineSlots<{
    label(props: { node: TreeNode; depth: number }): unknown
  }>()

  const openMap = ref<Record<string | number, boolean>>({})

  function isOpen(node: TreeNode): boolean {
    if (node.id in openMap.value) return openMap.value[node.id]
    return props.defaultOpen
  }

  function toggle(node: TreeNode) {
    openMap.value = { ...openMap.value, [node.id]: !isOpen(node) }
    emit('toggle', node)
  }

  function select(node: TreeNode) {
    emit('select', node)
  }
</script>

<template>
  <ul class="tree-view" role="tree">
    <BaseTreeNode
      v-for="node in nodes"
      :key="node.id"
      :node="node"
      :depth="0"
      :is-open-fn="isOpen"
      @toggle="toggle"
      @select="select"
    >
      <template v-if="$slots.label" #label="slotProps">
        <slot name="label" v-bind="slotProps" />
      </template>
    </BaseTreeNode>
  </ul>
</template>

<style scoped lang="scss">
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .tree-view {
    @include mp.mp-font-body-sm;

    list-style: none;
    margin: 0;
    padding: 0;
    color: var(--mp-color-text-primary);
    user-select: none;
  }
</style>
