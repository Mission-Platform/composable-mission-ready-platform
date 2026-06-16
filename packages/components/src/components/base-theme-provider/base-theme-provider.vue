<script lang="ts" setup>
  /**
   * `BaseThemeProvider` — Theme configuration provider for the Mission Platform
   * UI.
   *
   * Creates a reactive theme store (see `useTheme`) configured by its props and
   * shares it with all descendants via `provide`/`inject`. By default it themes
   * the whole document: it applies the resolved theme to
   * `document.documentElement` (the `data-theme` attribute, matching
   * `BaseThemeToggle`, plus `color-scheme` and a synced `<meta name="color-scheme">`),
   * persists the preference to `localStorage`, and tracks the system color
   * scheme so `'auto'` stays in sync.
   *
   * Set `:global="false"` to scope the theme to a wrapper element instead, so a
   * subtree (or a nested provider) can run a different theme from the rest of
   * the document. In that mode it renders a wrapper element (`as`, default
   * `div`) and writes `data-theme`/`color-scheme` to it — the `light-dark()`
   * colour tokens resolve against that element's used `color-scheme`, re-theming
   * it and its descendants without redefining any custom property.
   *
   * It is otherwise renderless aside from its default slot, which receives the
   * current theme state and mutators as slot props.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { onMounted, onScopeDispose, provide, useTemplateRef } from 'vue';

  import { createThemeStore, ThemeStoreKey } from '../../composables/use-theme';

  import type { ResolvedTheme, Theme } from '../../composables/use-theme';

  const props = withDefaults(
    defineProps<{
      /** Initial theme when nothing is persisted / present in the DOM. Defaults to `'auto'`. */
      defaultTheme?: Theme;
      /** `localStorage` key used to persist the preference. Defaults to `'mp-theme'`. */
      storageKey?: string;
      /** Persist the preference to `localStorage`. Defaults to `true`. */
      persist?: boolean;
      /**
       * Theme the whole document (`document.documentElement`). When `false`, the
       * theme is scoped to a rendered wrapper element instead, enabling nested
       * providers / per-subtree themes. Defaults to `true`.
       */
      global?: boolean;
      /** Tag used for the scoping wrapper element when `global` is `false`. Defaults to `'div'`. */
      as?: string;
    }>(),
    {
      defaultTheme: 'auto',
      storageKey: 'mp-theme',
      persist: true,
      global: true,
      as: 'div',
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
    // In non-global mode the theme is scoped to the wrapper element, which is
    // assigned once it has mounted (see below).
    scoped: !props.global,
  });

  provide(ThemeStoreKey, store);

  // Wrapper element used to scope the theme when `global` is `false`.
  const root = useTemplateRef<HTMLElement>('root');
  onMounted(() => {
    if (!props.global) store.setTarget(root.value ?? undefined);
  });

  onScopeDispose(() => store.dispose());
</script>

<template>
  <component
    :is="as"
    v-if="!global"
    ref="root"
    class="base-theme-provider"
  >
    <slot
      :cycle-theme="store.cycleTheme"
      :resolved-theme="store.resolvedTheme.value"
      :set-theme="store.setTheme"
      :system-theme="store.systemTheme.value"
      :theme="store.theme.value"
      :toggle-theme="store.toggleTheme"
    />
  </component>
  <slot
    v-else
    :cycle-theme="store.cycleTheme"
    :resolved-theme="store.resolvedTheme.value"
    :set-theme="store.setTheme"
    :system-theme="store.systemTheme.value"
    :theme="store.theme.value"
    :toggle-theme="store.toggleTheme"
  />
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-theme-provider {
      // A scoped provider only carries the theme attributes; it shouldn't
      // introduce a box of its own.
      display: contents;
    }
  }
</style>
