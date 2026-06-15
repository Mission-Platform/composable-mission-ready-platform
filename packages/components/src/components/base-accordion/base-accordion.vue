<script lang="ts" setup>
  import { provide, ref } from 'vue';

  import type { Ref } from 'vue';
  /**
   * `BaseAccordion` is a vertically stacked container of collapsible `BaseAccordionItem`s.
   *
   * It provides shared open/close state to its children via Vue's `provide`/`inject`
   * under the `accordion` key. Use `exclusive` to enforce a single-open-item behavior
   * (default) or set it to `false` to allow multiple items open simultaneously.
   *
   * @example
   * ```html
   * <BaseAccordion :exclusive="false">
   *   <BaseAccordionItem id="one" title="One">Content</BaseAccordionItem>
   *   <BaseAccordionItem id="two" title="Two">Content</BaseAccordionItem>
   * </BaseAccordion>
   * ```
   */

  /** Shared accordion state injected into `BaseAccordionItem` children. */
  export interface AccordionContext {
    /** Reactive set of currently open item ids. */
    openIds: Ref<Set<string>>;
    /** Toggle the open state of the item with the given id, honoring `exclusive`. */
    toggle: (id: string) => void;
  }

  const props = withDefaults(
    defineProps<{
      /** When `true` (default), opening an item closes all others. When `false`, multiple items can be open at once. */
      exclusive?: boolean;
    }>(),
    {
      exclusive: true,
    },
  );

  const emit = defineEmits<{
    /** Fired whenever the set of open item ids changes. Payload is the new list of open ids. */
    change: [openIds: string[]];
  }>();

  /**
   * Default slot — place `BaseAccordionItem` components here.
   * @slot default
   */
  defineSlots<{
    default(props: Record<string, never>): unknown;
  }>();

  const openIds = ref<Set<string>>(new Set());

  function toggle(id: string) {
    if (props.exclusive) {
      if (openIds.value.has(id)) {
        openIds.value = new Set();
      } else {
        openIds.value = new Set([id]);
      }
    } else {
      const next = new Set(openIds.value);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      openIds.value = next;
    }
    emit('change', [...openIds.value]);
  }

  provide<AccordionContext>('accordion', { openIds, toggle });
</script>

<template>
  <div class="base-accordion">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
  .base-accordion {
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-md);
    overflow: hidden;
  }
</style>
