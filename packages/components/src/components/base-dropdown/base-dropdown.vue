<script lang="ts" setup>
  /**
   * `BaseDropdown` — Dropdown component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
  import { ref, watch } from 'vue';

  import { useZIndex } from '../../composables/use-z-index';

  export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top';

  const props = withDefaults(
    defineProps<{
      open?: boolean;
      placement?: DropdownPlacement;
      matchTriggerWidth?: boolean;
      maxHeight?: string;
      closeOnOutsideClick?: boolean;
    }>(),
    {
      open: false,
      placement: 'bottom-start',
      matchTriggerWidth: true,
      maxHeight: '240px',
      closeOnOutsideClick: true,
    },
  );

  const emit = defineEmits<{
    'update:open': [value: boolean];
    close: [];
  }>();

  const { zIndex } = useZIndex('dropdown');

  const referenceEl = ref<HTMLElement | null>(null);
  const floatingEl = ref<HTMLElement | null>(null);

  const { floatingStyles } = useFloating(referenceEl, floatingEl, {
    placement: props.placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(2), flip({ padding: 4 }), shift({ padding: 4 })],
  });

  function handleOutsideClick(event: MouseEvent) {
    if (!props.closeOnOutsideClick || !props.open) return;
    const target = event.target as Node;
    if (referenceEl.value?.contains(target) || floatingEl.value?.contains(target)) return;
    emit('update:open', false);
    emit('close');
  }

  watch(
    () => props.open,
    (open) => {
      // Guard against SSR/SSG environments where `document` is undefined.
      // The watcher runs `immediate: true` during `setup()`, which happens
      // server-side during prerendering (e.g. `vite-ssg`).
      if (typeof document === 'undefined') return;
      if (open) {
        document.addEventListener('mousedown', handleOutsideClick);
      } else {
        document.removeEventListener('mousedown', handleOutsideClick);
      }
    },
    { immediate: true },
  );
</script>

<template>
  <div class="base-dropdown-host">
    <div
      ref="referenceEl"
      class="base-dropdown-trigger"
    >
      <slot name="trigger" />
    </div>

    <Transition name="base-dropdown-fade">
      <div
        v-if="open"
        ref="floatingEl"
        :style="{
          ...floatingStyles,
          zIndex,
          maxHeight,
          minWidth: matchTriggerWidth && referenceEl?.offsetWidth ? `${referenceEl?.offsetWidth}px` : undefined,
        }"
        class="base-dropdown"
        tabindex="0"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
  .base-dropdown-host {
    display: contents;
  }

  .base-dropdown-trigger {
    display: inline-block;
    min-width: 1px;
    min-height: 1px;
  }

  .base-dropdown {
    position: fixed;
    margin: 0;
    padding: var(--mp-spacing-1) 0;
    background-color: var(--mp-color-bg-surface);
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-md);
    box-shadow: var(--mp-shadow-md);
    overflow-y: auto;
    outline: none;
    min-width: 1px;
    min-height: 1px;
  }

  .base-dropdown-fade-enter-active,
  .base-dropdown-fade-leave-active {
    transition:
      opacity 120ms ease,
      transform 120ms ease;
  }

  .base-dropdown-fade-enter-from,
  .base-dropdown-fade-leave-to {
    opacity: 0;
    transform: scaleY(0.97) translateY(-4px);
    transform-origin: top;
  }
</style>
