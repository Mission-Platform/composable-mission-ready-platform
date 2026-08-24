import { type MpChild, type MpElement, Slot, useEffect, useState } from '@mission-platform/forge';

import {
  configToCssVariables,
  configToStyleString,
  mergeConfig,
  removeConfigToken,
  setConfigAttribute,
  setConfigToken,
  type ThemeComposerAttribute,
  type ThemeComposerConfig,
} from '@/stores/theme-composer-store/theme-composer-store';

import styles from './forge-theme-composer.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ThemeComposerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ThemeComposerProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Size token controlling the composer's scale. Defaults to `'md'`. */
  size?: ThemeComposerSize;
  /**
   * The composed theme configuration (the controlled value).
   * @model onUpdateModelValue
   */
  modelValue?: ThemeComposerConfig;
  /** Apply the composed variables to `document.documentElement` instead of the wrapper. Defaults to `false`. */
  global?: boolean;
  /** Persist the configuration to `localStorage`. Retained for API parity; not applied by the controlled neutral version. Defaults to `false`. */
  persist?: boolean;
  /** `localStorage` key. Retained for API parity; not applied by the controlled neutral version. */
  storageKey?: string;
  /** Fired with the next configuration whenever it changes (the controlled-value callback). */
  onUpdateModelValue?: (config: ThemeComposerConfig) => void;
}

/**
 * `ForgeThemeComposer` — composes runtime `--mp-*` design-token overrides (brand
 * colours, text/surface/border colours, fonts, base size/radius, plus a raw
 * token escape hatch) and applies them to its scope. Authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * The original Vue SFC shared a reactive store via `provide`/`inject` and `v-model`.
 * The neutral dialect has neither, so this version is a **controlled** component:
 * it holds the configuration in a neutral {@link useState} hook (seeded from
 * `modelValue`), resolves it to CSS custom properties with the pure helpers in
 * `../theme-composer-store`, applies them to its `display: contents` wrapper
 * (`<div>`) — or to `document.documentElement` when `global` — and emits every
 * change through the `onUpdateModelValue` callback prop (the substitute for
 * `v-model`). Its default scoped slot receives `{ config, cssVariables,
 * styleString, setConfig, setAttribute, setToken, removeToken, reset }`.
 *
 * The shared (`provide`/`inject`) store, `localStorage` persistence, and the
 * configurable wrapper tag (`as`) are intentionally reduced: the
 * `modelValue`/`onUpdateModelValue` pair is the single source of truth and the
 * wrapper is a fixed `<div>`.
 */
export function ForgeThemeComposer(properties: Readonly<ThemeComposerProperties>): MpElement {
  const { modelValue, global = false, onUpdateModelValue, size = 'md' } = properties;

  const [config, setConfigState] = useState<ThemeComposerConfig>(modelValue ?? {});

  useEffect(() => {
    if (!global || typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    const variables = configToCssVariables(config);
    for (const [name, value] of Object.entries(variables)) {
      root.style.setProperty(name, value);
    }
    if (config.colorScheme) {
      root.style.colorScheme = config.colorScheme;
    }
    return () => {
      for (const name of Object.keys(variables)) {
        root.style.removeProperty(name);
      }
      if (config.colorScheme) {
        root.style.removeProperty('color-scheme');
      }
    };
  }, [config, global]);

  const cssVariables = configToCssVariables(config);
  const styleString = configToStyleString(config);
  const styleObject = {
    ...cssVariables,
    ...(config.colorScheme ? { colorScheme: config.colorScheme } : {}),
  };
  const wrapperStyle = global ? undefined : styleObject;

  const apply = (next: ThemeComposerConfig): void => {
    setConfigState(next);
    onUpdateModelValue?.(next);
  };
  const setConfig = (partial: ThemeComposerConfig): void => apply(mergeConfig(config, partial));
  const setAttribute = <K extends ThemeComposerAttribute>(attribute: K, value: ThemeComposerConfig[K]): void =>
    apply(setConfigAttribute(config, attribute, value));
  const setToken = (key: string, value: string): void => apply(setConfigToken(config, key, value));
  const removeToken = (key: string): void => apply(removeConfigToken(config, key));
  const reset = (): void => apply(modelValue ?? {});

  return (
    <div
      className={[styles['forge-theme-composer'], size ? `forge-size--${size}` : undefined]}
      style={wrapperStyle}
    >
      <Slot
        config={config}
        cssVariables={cssVariables}
        styleString={styleString}
        setConfig={setConfig}
        setAttribute={setAttribute}
        setToken={setToken}
        removeToken={removeToken}
        reset={reset}
      />
    </div>
  );
}
