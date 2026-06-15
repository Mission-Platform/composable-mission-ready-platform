<script lang="ts" setup>
  /**
   * `BaseThemeComposer` — Runtime theme-attribute composer for the Mission
   * Platform UI.
   *
   * Lets consumers configure attributes of the theme (brand/accent colours,
   * text/surface/border/focus colours, font families, base font size, and base
   * corner radius) plus arbitrary raw `--mp-*` token overrides via an escape
   * hatch. It resolves the configuration (see `useThemeComposer`) into `--mp-*`
   * CSS custom properties and either scopes them to its own wrapper element
   * (default) or applies them globally to `document.documentElement` when
   * `global` is set.
   *
   * The composed configuration is exposed through `v-model` and shared with all
   * descendants via `provide`/`inject`, so nested `useThemeComposer` calls read
   * and mutate the same store. The default slot receives the current state and
   * mutators as slot props.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { onScopeDispose, provide, watch } from 'vue';

  import { createThemeComposer, ThemeComposerKey } from '../../composables/use-theme-composer';

  import type { ThemeComposerAttribute, ThemeComposerConfig } from '../../composables/use-theme-composer';

  const props = withDefaults(
    defineProps<{
      /** The composed theme configuration (`v-model`). */
      modelValue?: ThemeComposerConfig;
      /**
       * Apply the composed variables to `document.documentElement` instead of
       * the local wrapper element. Defaults to `false`.
       */
      global?: boolean;
      /** Persist the configuration to `localStorage`. Defaults to `false`. */
      persist?: boolean;
      /** `localStorage` key used to persist the configuration. Defaults to `'mp-theme-composer'`. */
      storageKey?: string;
      /** Tag used for the scoping wrapper element when `global` is `false`. Defaults to `'div'`. */
      as?: string;
    }>(),
    {
      modelValue: undefined,
      global: false,
      persist: false,
      storageKey: 'mp-theme-composer',
      as: 'div',
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [config: ThemeComposerConfig];
  }>();

  /**
   * Default slot — receives the current theme-composer state and mutators.
   * @slot default
   */
  defineSlots<{
    default?: (props: {
      config: ThemeComposerConfig;
      cssVariables: Record<string, string>;
      styleString: string;
      setConfig: (partial: ThemeComposerConfig) => void;
      setAttribute: <K extends ThemeComposerAttribute>(attribute: K, value: ThemeComposerConfig[K]) => void;
      setToken: (key: string, value: string) => void;
      removeToken: (key: string) => void;
      reset: () => void;
    }) => unknown;
  }>();

  const store = createThemeComposer({
    initialConfig: props.modelValue ?? {},
    global: props.global,
    persist: props.persist,
    storageKey: props.storageKey,
  });

  provide(ThemeComposerKey, store);

  // Keep `v-model` in sync with the store, guarding against feedback loops.
  let syncingFromProp = false;

  watch(
    store.config,
    (value) => {
      if (syncingFromProp) return;
      emit('update:modelValue', value);
    },
    { deep: true },
  );

  watch(
    () => props.modelValue,
    (value) => {
      if (!value || value === store.config.value) return;
      syncingFromProp = true;
      store.replaceConfig(value);
      syncingFromProp = false;
    },
    { deep: true },
  );

  onScopeDispose(() => store.dispose());
</script>

<template>
  <component
    :is="as"
    v-if="!global"
    :style="store.styleString.value"
    class="base-theme-composer"
  >
    <slot
      :config="store.config.value"
      :css-variables="store.cssVariables.value"
      :remove-token="store.removeToken"
      :reset="store.reset"
      :set-attribute="store.setAttribute"
      :set-config="store.setConfig"
      :set-token="store.setToken"
      :style-string="store.styleString.value"
    />
  </component>
  <slot
    v-else
    :config="store.config.value"
    :css-variables="store.cssVariables.value"
    :remove-token="store.removeToken"
    :reset="store.reset"
    :set-attribute="store.setAttribute"
    :set-config="store.setConfig"
    :set-token="store.setToken"
    :style-string="store.styleString.value"
  />
</template>

<style lang="scss" scoped>
  .base-theme-composer {
    display: contents;
  }
</style>
