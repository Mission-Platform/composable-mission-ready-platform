<script lang="ts" setup>
  /**
   * VirtualTreeView — a virtual-scrolling tree that renders only visible rows.
   *
   * The tree is flattened into a single array of visible nodes; virtual scrolling
   * then renders only the rows within the viewport, enabling smooth display of
   * trees with tens-of-thousands of nodes.
   *
   * Props
   *   nodes        — root-level TreeNode array
   *   itemHeight   — fixed row height in pixels (default 32)
   *   overscan     — extra rows above/below viewport (default 3)
   *   height       — viewport height in pixels (default 400)
   *   defaultOpen  — expand all nodes on mount (default false)
   *
   * Slots
   *   default({ node, depth, isOpen, toggle, select }) — custom row renderer
   *
   * Events
   *   select(node)  — node was clicked
   *   toggle(node)  — node expand/collapse toggled
   */
  import { computed, onMounted, onUnmounted, ref } from 'vue';

  import BaseTreeNodeLabel from '../base-tree-view/base-tree-node-label.vue';

  export interface TreeNode {
    id: string | number;
    label: string;
    children?: TreeNode[];
    [key: string]: unknown;
  }

  interface FlatNode {
    node: TreeNode;
    depth: number;
  }

  const props = withDefaults(
    defineProps<{
      nodes: TreeNode[];
      itemHeight?: number;
      overscan?: number;
      height?: number;
      defaultOpen?: boolean;
    }>(),
    {
      itemHeight: 32,
      overscan: 3,
      height: 400,
      defaultOpen: false,
    },
  );

  const emit = defineEmits<{
    select: [node: TreeNode];
    toggle: [node: TreeNode];
  }>();

  defineSlots<{
    default(props: { node: TreeNode; depth: number; isOpen: boolean; toggle: () => void; select: () => void }): unknown;
  }>();

  // ─── Open state ──────────────────────────────────────────────────────────────

  const openMap = ref<Record<string | number, boolean>>({});

  function isOpen(node: TreeNode): boolean {
    if (node.id in openMap.value) return openMap.value[node.id];
    return props.defaultOpen;
  }

  function toggle(node: TreeNode) {
    openMap.value = { ...openMap.value, [node.id]: !isOpen(node) };
    emit('toggle', node);
  }

  function select(node: TreeNode) {
    emit('select', node);
  }

  // ─── Flatten visible nodes ────────────────────────────────────────────────────

  function flatten(nodes: TreeNode[], depth: number): FlatNode[] {
    const result: FlatNode[] = [];
    for (const node of nodes) {
      result.push({ node, depth });
      if (isOpen(node) && Array.isArray(node.children) && node.children.length > 0) {
        result.push(...flatten(node.children, depth + 1));
      }
    }
    return result;
  }

  const flatNodes = computed(() => flatten(props.nodes, 0));

  // ─── Virtual scroll ────────────────────────────────────────────────────────

  const scrollTop = ref(0);
  const containerRef = ref<HTMLElement | null>(null);

  const totalHeight = computed(() => flatNodes.value.length * props.itemHeight);

  const startIndex = computed(() => {
    const raw = Math.floor(scrollTop.value / props.itemHeight) - props.overscan;
    return Math.max(0, raw);
  });

  const endIndex = computed(() => {
    const visibleCount = Math.ceil(props.height / props.itemHeight);
    const raw = Math.floor(scrollTop.value / props.itemHeight) + visibleCount + props.overscan;
    return Math.min(flatNodes.value.length - 1, raw);
  });

  const visibleRows = computed(() =>
    flatNodes.value.slice(startIndex.value, endIndex.value + 1).map((row, i) => ({
      ...row,
      index: startIndex.value + i,
    })),
  );

  const offsetY = computed(() => startIndex.value * props.itemHeight);

  function handleScroll(e: Event) {
    scrollTop.value = (e.target as HTMLElement).scrollTop;
  }

  onMounted(() => {
    containerRef.value?.addEventListener('scroll', handleScroll, { passive: true });
  });

  onUnmounted(() => {
    containerRef.value?.removeEventListener('scroll', handleScroll);
  });
</script>

<template>
  <div
    ref="containerRef"
    :style="{ height: `${height}px`, overflowY: 'auto', position: 'relative' }"
    class="virtual-tree"
    role="tree"
    tabindex="0"
  >
    <!-- Full-height spacer so scrollbar reflects true content size -->
    <div
      :style="{ height: `${totalHeight}px`, position: 'relative', pointerEvents: 'none' }"
      aria-hidden="true"
    />

    <!-- Rendered slice at the correct scroll offset -->
    <div
      :style="{
        position: 'absolute',
        top: `${offsetY}px`,
        left: 0,
        right: 0,
      }"
    >
      <div
        v-for="{ node, depth } in visibleRows"
        :key="node.id"
        :style="{ height: `${itemHeight}px`, boxSizing: 'border-box' }"
        class="virtual-tree__row"
        role="none"
      >
        <slot
          :depth="depth"
          :is-open="isOpen(node)"
          :node="node"
          :select="() => select(node)"
          :toggle="() => toggle(node)"
        >
          <!-- Default row renderer -->
          <BaseTreeNodeLabel
            :depth="depth"
            :has-children="Boolean(node.children?.length)"
            :is-open="isOpen(node)"
            :node="node"
            @keydown="
              (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  select(node);
                }
              }
            "
            @select="select(node)"
            @toggle="toggle(node)"
          />
        </slot>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  @layer mp.components {
    .virtual-tree {
      @include mp.mp-font-body-sm;

      color: var(--mp-color-text-primary);
      user-select: none;
      outline: none;

      &__row {
        display: flex;
        align-items: center;
      }

      &__label {
        display: flex;
        align-items: center;
        gap: var(--mp-spacing-2);
        width: 100%;
        height: 100%;
        cursor: pointer;
        border-radius: var(--mp-radius-sm);
        outline: none;
        padding-right: var(--mp-spacing-3);
        color: var(--mp-color-text-primary);
        transition: background-color 80ms ease;

        &:hover {
          background-color: var(--mp-color-bg-muted);
        }

        &:focus-visible {
          outline: none;
          box-shadow: var(--mp-shadow-focus-primary);
        }
      }

      &__toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--mp-color-text-secondary);
        padding: 0;
        border-radius: var(--mp-radius-sm);
        transition: color 80ms ease;

        &:hover {
          color: var(--mp-color-text-primary);
        }
      }

      &__spacer {
        display: inline-block;
        width: 20px;
        flex-shrink: 0;
      }
    }
  }
</style>
