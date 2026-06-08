<script lang="ts" setup>
  /**
   * `BaseApplicationLayout` — Application layout component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import type { StatusLevel } from './types';

  const props = withDefaults(
    defineProps<{
      statusLevel?: StatusLevel;
    }>(),
    {
      statusLevel: 'none',
    },
  );

  const statusColor = computed(() => {
    switch (props.statusLevel) {
      case 'info':
        return 'var(--mp-color-info-default)';
      case 'warning':
        return 'var(--mp-color-warning-default)';
      case 'error':
        return 'var(--mp-color-danger-default)';
      default:
        return 'transparent';
    }
  });

  // Current token values (WCAG AAA on white — all dark colors):
  //   info-default    #155e75 → white text = 9.20:1 (WCAG AAA)
  //   warning-default #93370d → white text = 5.55:1 (WCAG AA); dark text = 2.67:1 (fails)
  //   danger-default  #9f1239 → white text = 5.72:1 (WCAG AA)
  // All three use white text (--mp-color-text-on-primary) for consistent readable contrast.
  const statusTextColor = computed(() => {
    return props.statusLevel !== 'none' ? 'var(--mp-color-text-on-primary)' : undefined;
  });

  const statusRole = computed(() => {
    if (props.statusLevel === 'error') return 'alert';
    if (props.statusLevel === 'none') return undefined;
    return 'status';
  });

  // role="alert" implies aria-live="assertive"; role="status" implies aria-live="polite".
  // We omit an explicit aria-live to avoid conflicting with the implicit value from the role.
</script>

<template>
  <div class="application-layout">
    <div
      :aria-hidden="statusLevel === 'none' || undefined"
      :role="statusRole"
      :style="{ backgroundColor: statusColor, color: statusTextColor }"
      class="application-layout__status"
    >
      <slot name="status" />
    </div>
    <div
      class="application-layout__header"
      role="none"
    >
      <slot name="navbar" />
    </div>
    <main class="application-layout__content">
      <slot name="content" />
    </main>
    <div
      class="application-layout__footer"
      role="none"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;
  @use '@mission-platform/breakpoints/scss/mixins' as bp;

  .application-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--mp-color-bg-base);

    &__status {
      transition: background-color 0.2s ease;
      min-height: 0;
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);

      &:not(:empty) {
        @include mp.mp-font-label;

        padding: var(--mp-spacing-2) var(--mp-spacing-4);

        @include bp.bp-up('sm') {
          padding: var(--mp-spacing-2) var(--mp-spacing-6);
        }
      }
    }

    &__header {
      flex-shrink: 0;
    }

    &__content {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: auto;
    }

    &__footer {
      flex-shrink: 0;
    }
  }
</style>
