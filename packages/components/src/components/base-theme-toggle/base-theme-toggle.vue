<script lang="ts" setup>
  /**
   * `BaseThemeToggle` — Theme toggle component for the Mission Platform UI.
   *
   * Cycles between three states: `light` → `dark` → `auto` → `light`.
   * The `auto` state removes the explicit `data-theme` attribute from
   * `<html>` so the UI follows the user's system `prefers-color-scheme`.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, onMounted, onUnmounted, ref } from 'vue';

  export type Theme = 'light' | 'dark' | 'auto';

  const props = withDefaults(
    defineProps<{
      ariaLabel?: string;
    }>(),
    {
      ariaLabel: undefined,
    },
  );

  const emit = defineEmits<{
    change: [theme: Theme];
  }>();

  function readTheme(): Theme {
    if (typeof document === 'undefined') return 'auto';
    const attribute = document.documentElement.getAttribute('data-theme');
    if (attribute === 'light' || attribute === 'dark') return attribute;
    return 'auto';
  }

  const theme = ref<Theme>(readTheme());

  function applyTheme(next: Theme): void {
    if (next === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', next);
    }
  }

  function nextTheme(current: Theme): Theme {
    if (current === 'light') return 'dark';
    if (current === 'dark') return 'auto';
    return 'light';
  }

  function toggle() {
    const next = nextTheme(theme.value);
    applyTheme(next);
    theme.value = next;
    emit('change', next);
  }

  const resolvedAriaLabel = computed(() => {
    if (props.ariaLabel !== undefined) return props.ariaLabel;
    const upcoming = nextTheme(theme.value);
    if (upcoming === 'light') return 'Switch to light theme';
    if (upcoming === 'dark') return 'Switch to dark theme';
    return 'Switch to auto theme';
  });

  const defaultLabel = computed(() => {
    if (theme.value === 'light') return 'Light mode';
    if (theme.value === 'dark') return 'Dark mode';
    return 'Auto mode';
  });

  let observer: MutationObserver | null = null;

  onMounted(() => {
    theme.value = readTheme();
    observer = new MutationObserver(() => {
      theme.value = readTheme();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  });

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
  });
</script>

<template>
  <button
    :aria-label="resolvedAriaLabel"
    :aria-pressed="theme === 'dark'"
    :class="['theme-toggle', `theme-toggle--${theme}`]"
    type="button"
    @click="toggle"
  >
    <span
      aria-hidden="true"
      class="theme-toggle__icon"
    >
      <svg
        v-if="theme === 'light'"
        fill="currentColor"
        height="20"
        viewBox="0 0 24 24"
        width="20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z"
        />
      </svg>
      <svg
        v-else-if="theme === 'dark'"
        fill="currentColor"
        height="20"
        viewBox="0 0 24 24"
        width="20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          clip-rule="evenodd"
          d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z"
          fill-rule="evenodd"
        />
      </svg>
      <svg
        v-else
        fill="currentColor"
        height="20"
        viewBox="0 0 24 24"
        width="20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 1.5v15a7.5 7.5 0 0 0 0-15Z" />
      </svg>
    </span>
    <span class="theme-toggle__label">
      <slot>{{ defaultLabel }}</slot>
    </span>
  </button>
</template>

<style lang="scss" scoped>
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .theme-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--mp-spacing-2);
    padding: var(--mp-spacing-2) var(--mp-spacing-3);
    background-color: var(--mp-color-bg-surface);
    color: var(--mp-color-text-primary);
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-md);
    cursor: pointer;
    font: inherit;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      color 150ms ease;

    &:hover {
      background-color: var(--mp-color-bg-muted);
      border-color: var(--mp-color-border-strong);
    }

    &:focus-visible {
      outline: 2px solid var(--mp-color-border-focus);
      outline-offset: 2px;
    }

    &__icon {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      color: var(--mp-color-text-secondary);
    }

    &__label {
      @include mp.mp-font-label;

      white-space: nowrap;
    }
  }
</style>
