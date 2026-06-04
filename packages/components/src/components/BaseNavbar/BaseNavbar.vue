<script lang="ts" setup>
  import { ref } from 'vue';

  import BaseSidebar from '../BaseSidebar/BaseSidebar.vue';
  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  withDefaults(
    defineProps<{
      brand?: string;
      sticky?: boolean;
      mobileTitle?: string;
    }>(),
    {
      brand: undefined,
      sticky: false,
      mobileTitle: undefined,
    },
  );

  const sidebarOpen = ref(false);
</script>

<template>
  <header :class="['base-navbar', { 'base-navbar--sticky': sticky }]">
    <nav
      aria-label="Main navigation"
      class="base-navbar__container"
    >
      <div class="base-navbar__start">
        <slot name="brand">
          <BaseTypography
            v-if="brand"
            as="span"
            class="base-navbar__brand"
            color="primary"
            variant="h6"
          >
            {{ brand }}
          </BaseTypography>
        </slot>
      </div>
      <div class="base-navbar__center">
        <slot />
      </div>
      <div class="base-navbar__end">
        <slot name="end" />
      </div>

      <!-- Hamburger: only shown on mobile -->
      <button
        :aria-expanded="sidebarOpen"
        :aria-label="sidebarOpen ? 'Close menu' : 'Open menu'"
        class="base-navbar__hamburger"
        type="button"
        @click="sidebarOpen = !sidebarOpen"
      >
        <span class="base-navbar__hamburger-bar" />
        <span class="base-navbar__hamburger-bar" />
        <span class="base-navbar__hamburger-bar" />
      </button>
    </nav>
  </header>

  <!-- Mobile sidebar drawer -->
  <BaseSidebar
    v-model:open="sidebarOpen"
    :title="mobileTitle || brand"
    side="left"
    size="sm"
  >
    <nav
      aria-label="Mobile navigation"
      class="base-navbar__mobile-nav"
    >
      <div class="base-navbar__mobile-nav-items">
        <slot />
      </div>
      <div class="base-navbar__mobile-nav-end">
        <slot name="end" />
      </div>
    </nav>
  </BaseSidebar>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/breakpoints/scss/mixins' as bp;

  .base-navbar {
    background-color: var(--mp-color-bg-surface);
    border-bottom: 1px solid var(--mp-color-border-default);
    z-index: 100;
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);

    &--sticky {
      position: sticky;
      top: 0;
    }

    &__container {
      display: flex;
      align-items: center;
      height: var(--mp-size-height-xl);
      padding: 0 var(--mp-spacing-4);
      gap: var(--mp-spacing-3);
      max-width: 100%;

      @include bp.bp-up('sm') {
        padding: 0 var(--mp-spacing-6);
        gap: var(--mp-spacing-4);
      }
    }

    &__start {
      display: flex;
      align-items: center;
      gap: var(--mp-spacing-4);
      flex-shrink: 0;
    }

    &__center {
      display: flex;
      align-items: center;
      gap: var(--mp-spacing-1);
      flex: 1;
    }

    &__end {
      display: flex;
      align-items: center;
      gap: var(--mp-spacing-2);
      flex-shrink: 0;
    }

    &__brand {
      /* typography handled by BaseTypography */
      text-decoration: none;
      letter-spacing: -0.01em;
    }

    &__hamburger {
      display: none;
      flex-direction: column;
      justify-content: center;
      gap: var(--mp-spacing-1);
      width: var(--mp-size-height-md);
      height: var(--mp-size-height-md);
      padding: var(--mp-spacing-2);
      background: none;
      border: none;
      border-radius: var(--mp-radius-md);
      cursor: pointer;
      color: var(--mp-color-text-primary);
      flex-shrink: 0;

      &:hover {
        background-color: var(--mp-color-bg-subtle);
      }

      &:focus-visible {
        outline: none;
        box-shadow: var(--mp-shadow-focus-primary);
      }
    }

    &__hamburger-bar {
      display: block;
      width: 100%;
      height: 2px;
      border-radius: 1px;
      background-color: currentColor;
    }
  }

  .base-navbar__mobile-nav {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);
    padding: var(--mp-spacing-2) var(--mp-spacing-3);
    height: 100%;
  }

  .base-navbar__mobile-nav-items {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);
    flex: 1;
  }

  .base-navbar__mobile-nav-end {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-2);
    padding-top: var(--mp-spacing-4);
    border-top: 1px solid var(--mp-color-border-default);
  }

  /* On mobile (below sm breakpoint): hide center/end, show hamburger */
  @include bp.bp-down('sm') {
    .base-navbar {
      &__center,
      &__end {
        display: none;
      }

      &__hamburger {
        display: flex;
      }
    }
  }
</style>
