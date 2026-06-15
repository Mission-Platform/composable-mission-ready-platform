<script lang="ts" setup>
  /**
   * `BaseThemeProvider` — Theme configuration provider for the Mission Platform
   * UI.
   *
   * Creates a reactive theme store (see `useTheme`) configured by its props and
   * shares it with all descendants via `provide`/`inject`. It applies the
   * resolved theme to `document.documentElement` (the `data-theme` attribute,
   * matching `BaseThemeToggle`), persists the preference to `localStorage`, and
   * tracks the system color scheme so `'auto'` stays in sync.
   *
   * It is renderless aside from its default slot, which receives the current
   * theme state and mutators as slot props.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { onScopeDispose, provide } from 'vue';

  import { ThemeStoreKey, createThemeStore } from '../../composables/use-theme';

  import type { ResolvedTheme, Theme } from '../../composables/use-theme';

  const props = withDefaults(
    defineProps<{
      /** Initial theme when nothing is persisted / present in the DOM. Defaults to `'auto'`. */
      defaultTheme?: Theme;
      /** `localStorage` key used to persist the preference. Defaults to `'mp-theme'`. */
      storageKey?: string;
      /** Persist the preference to `localStorage`. Defaults to `true`. */
      persist?: boolean;
    }>(),
    {
      defaultTheme: 'auto',
      storageKey: 'mp-theme',
      persist: true,
    },
  );

  /**
   * Default slot — receives the current theme state and mutators.
   * @slot default
   */
  defineSlots<{
    default?: (props: {
      theme: Theme;
      resolvedTheme: ResolvedTheme;
      systemTheme: ResolvedTheme;
      setTheme: (theme: Theme) => void;
      toggleTheme: () => void;
      cycleTheme: () => void;
    }) => unknown;
  }>();

  const store = createThemeStore({
    defaultTheme: props.defaultTheme,
    storageKey: props.storageKey,
    persist: props.persist,
  });

  provide(ThemeStoreKey, store);

  onScopeDispose(() => store.dispose());

</script>

<template>
  <slot
    :cycle-theme="store.cycleTheme"
    :resolved-theme="store.resolvedTheme.value"
    :set-theme="store.setTheme"
    :system-theme="store.systemTheme.value"
    :theme="store.theme.value"
    :toggle-theme="store.toggleTheme"
  />
</template>
