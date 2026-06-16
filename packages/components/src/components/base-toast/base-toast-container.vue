<script lang="ts" setup>
  /**
   * `BaseToastContainer` — Renders the toasts held in the `useToast` store.
   *
   * Mount a single instance near the root of your application. It teleports a
   * fixed-position stack to `<body>`, anchors it to one of six screen
   * positions, animates entry/exit, and dismisses toasts on user request.
   *
   * Accessibility:
   * - The stack is a `role="region"` with a configurable `aria-label`; each
   *   `BaseToast` carries its own `role="status"` / `role="alert"`.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import { useToast } from '../../composables/use-toast';
  import { useZIndex } from '../../composables/use-z-index';

  import BaseToast from './base-toast.vue';

  import type { ToastPosition } from '../../composables/use-toast';

  const props = withDefaults(
    defineProps<{
      /** Anchor position of the stack. Defaults to `'top-right'`. */
      position?: ToastPosition;
      /** Accessible label for the region. Defaults to `'Notifications'`. */
      ariaLabel?: string;
      /** Render into `<body>` via Teleport. Disable for tests. Defaults to `true`. */
      teleport?: boolean;
    }>(),
    {
      position: 'top-right',
      ariaLabel: 'Notifications',
      teleport: true,
    },
  );

  const { toasts, dismiss } = useToast();
  const { zIndex } = useZIndex('notification');

  // Bottom-anchored stacks render newest-first (closest to the edge).
  const orderedToasts = computed(() => (props.position.startsWith('bottom') ? [...toasts].reverse() : toasts));
</script>

<template>
  <Teleport
    :disabled="!teleport"
    to="body"
  >
    <div
      :aria-label="ariaLabel"
      :class="['base-toast-container', `base-toast-container--${position}`]"
      :style="{ zIndex }"
      role="region"
    >
      <TransitionGroup name="base-toast">
        <BaseToast
          v-for="toast in orderedToasts"
          :key="toast.id"
          :dismissible="toast.dismissible"
          :message="toast.message"
          :title="toast.title"
          :variant="toast.variant"
          @dismiss="dismiss(toast.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-toast-container {
      position: fixed;
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-3);
      width: min(24rem, calc(100vw - 2 * var(--mp-spacing-4)));
      padding: 0;
      margin: 0;
      pointer-events: none;

      &--top-left {
        top: var(--mp-spacing-4);
        left: var(--mp-spacing-4);
      }

      &--top-center {
        top: var(--mp-spacing-4);
        left: 50%;
        transform: translateX(-50%);
        align-items: center;
      }

      &--top-right {
        top: var(--mp-spacing-4);
        right: var(--mp-spacing-4);
      }

      &--bottom-left {
        bottom: var(--mp-spacing-4);
        left: var(--mp-spacing-4);
      }

      &--bottom-center {
        bottom: var(--mp-spacing-4);
        left: 50%;
        transform: translateX(-50%);
        align-items: center;
      }

      &--bottom-right {
        bottom: var(--mp-spacing-4);
        right: var(--mp-spacing-4);
      }
    }

    /* Enter / leave transitions */
    .base-toast-enter-active,
    .base-toast-leave-active {
      transition:
        opacity 200ms ease,
        transform 200ms ease;
    }

    .base-toast-enter-from,
    .base-toast-leave-to {
      opacity: 0;
      transform: translateY(-0.5rem);
    }

    .base-toast-leave-active {
      position: absolute;
      width: 100%;
    }

    @media (prefers-reduced-motion: reduce) {
      .base-toast-enter-active,
      .base-toast-leave-active {
        transition: none;
      }
    }
  }
</style>
