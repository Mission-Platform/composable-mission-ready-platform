import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import {
  configToCssVariables,
  createThemeComposer,
  cssVariablesToString,
  resetThemeComposer,
  useThemeComposer,
} from '../../composables/use-theme-composer';

import BaseThemeComposer from './base-theme-composer.vue';

import type { ThemeComposerConfig } from '../../composables/use-theme-composer';

function clearRootStyle(): void {
  document.documentElement.removeAttribute('style');
}

beforeEach(() => {
  clearRootStyle();
  localStorage.clear();
  resetThemeComposer();
});

afterEach(() => {
  clearRootStyle();
  localStorage.clear();
  resetThemeComposer();
});

describe('configToCssVariables', () => {
  it('maps friendly attributes to --mp-* custom properties', () => {
    const variables = configToCssVariables({ primaryColor: '#f00', radius: '1rem', fontFamily: 'Inter' });
    expect(variables['--mp-color-primary-default']).toBe('#f00');
    expect(variables['--mp-radius-md']).toBe('1rem');
    expect(variables['--mp-font-family-sans']).toBe('Inter');
  });

  it('ignores undefined and empty-string attributes', () => {
    const variables = configToCssVariables({ primaryColor: undefined, textColor: '' });
    expect(Object.keys(variables)).toHaveLength(0);
  });

  it('merges raw token overrides, normalising keys', () => {
    const variables = configToCssVariables({ tokens: { 'spacing-4': '2rem', '--my-var': '5px' } });
    expect(variables['--mp-spacing-4']).toBe('2rem');
    expect(variables['--my-var']).toBe('5px');
  });

  it('lets raw tokens win over attribute-derived variables', () => {
    const variables = configToCssVariables({
      primaryColor: '#f00',
      tokens: { '--mp-color-primary-default': '#0f0' },
    });
    expect(variables['--mp-color-primary-default']).toBe('#0f0');
  });
});

describe('cssVariablesToString', () => {
  it('serialises a variable map into an inline style string', () => {
    expect(cssVariablesToString({ '--mp-color-primary-default': '#f00', '--mp-radius-md': '1rem' })).toBe(
      '--mp-color-primary-default: #f00; --mp-radius-md: 1rem;',
    );
  });

  it('returns an empty string for an empty map', () => {
    expect(cssVariablesToString({})).toBe('');
  });
});

describe('createThemeComposer', () => {
  it('exposes reactive cssVariables and styleString from the config', async () => {
    const store = createThemeComposer({ initialConfig: { primaryColor: '#f00' } });
    expect(store.cssVariables.value['--mp-color-primary-default']).toBe('#f00');

    store.setAttribute('radius', '1rem');
    await nextTick();
    expect(store.cssVariables.value['--mp-radius-md']).toBe('1rem');
    expect(store.styleString.value).toContain('--mp-radius-md: 1rem;');
    store.dispose();
  });

  it('merges with setConfig and replaces with replaceConfig', () => {
    const store = createThemeComposer({ initialConfig: { primaryColor: '#f00' } });
    store.setConfig({ secondaryColor: '#00f' });
    expect(store.config.value).toMatchObject({ primaryColor: '#f00', secondaryColor: '#00f' });
    store.replaceConfig({ textColor: '#111' });
    expect(store.config.value).toEqual({ textColor: '#111' });
    store.dispose();
  });

  it('sets and removes individual raw tokens', () => {
    const store = createThemeComposer();
    store.setToken('spacing-4', '2rem');
    expect(store.cssVariables.value['--mp-spacing-4']).toBe('2rem');
    store.removeToken('spacing-4');
    expect(store.cssVariables.value['--mp-spacing-4']).toBeUndefined();
    store.dispose();
  });

  it('resets to the initial configuration', () => {
    const store = createThemeComposer({ initialConfig: { primaryColor: '#f00' } });
    store.setAttribute('primaryColor', '#0f0');
    store.reset();
    expect(store.config.value).toEqual({ primaryColor: '#f00' });
    store.dispose();
  });

  it('applies and cleans up variables on document.documentElement when global', async () => {
    const store = createThemeComposer({ global: true, initialConfig: { primaryColor: '#f00' } });
    expect(document.documentElement.style.getPropertyValue('--mp-color-primary-default')).toBe('#f00');

    store.setAttribute('primaryColor', undefined);
    await nextTick();
    expect(document.documentElement.style.getPropertyValue('--mp-color-primary-default')).toBe('');

    store.setAttribute('radius', '1rem');
    await nextTick();
    expect(document.documentElement.style.getPropertyValue('--mp-radius-md')).toBe('1rem');

    store.dispose();
    expect(document.documentElement.style.getPropertyValue('--mp-radius-md')).toBe('');
  });

  it('persists and restores the configuration from localStorage', () => {
    const store = createThemeComposer({ persist: true, storageKey: 'mp-tc', initialConfig: { primaryColor: '#f00' } });
    expect(JSON.parse(localStorage.getItem('mp-tc') as string)).toMatchObject({ primaryColor: '#f00' });
    store.dispose();

    const restored = createThemeComposer({ persist: true, storageKey: 'mp-tc' });
    expect(restored.config.value).toMatchObject({ primaryColor: '#f00' });
    restored.dispose();
  });
});

describe('useThemeComposer', () => {
  it('returns a shared fallback store when no provider is present', () => {
    const a = useThemeComposer();
    const b = useThemeComposer();
    expect(a).toBe(b);
  });
});

describe('BaseThemeComposer', () => {
  it('scopes composed variables to its wrapper element by default', () => {
    const wrapper = mount(BaseThemeComposer, { props: { modelValue: { primaryColor: '#f00' } } });
    const root = wrapper.find('.base-theme-composer');
    expect(root.exists()).toBe(true);
    expect(root.attributes('style')).toContain('--mp-color-primary-default: #f00;');
    // Does not leak to the document root in local mode.
    expect(document.documentElement.style.getPropertyValue('--mp-color-primary-default')).toBe('');
  });

  it('renders the wrapper with the configured tag', () => {
    const wrapper = mount(BaseThemeComposer, { props: { as: 'section' } });
    expect(wrapper.find('section.base-theme-composer').exists()).toBe(true);
  });

  it('applies variables globally and renderlessly when global is set', () => {
    mount(BaseThemeComposer, {
      props: { global: true, modelValue: { primaryColor: '#f00' } },
      slots: { default: () => h('span', 'child') },
    });
    expect(document.documentElement.style.getPropertyValue('--mp-color-primary-default')).toBe('#f00');
  });

  it('shares its store with descendants through useThemeComposer', () => {
    const Child = defineComponent({
      setup() {
        const { cssVariables } = useThemeComposer();
        return () => h('span', cssVariables.value['--mp-color-primary-default'] ?? 'none');
      },
    });
    const wrapper = mount(BaseThemeComposer, {
      props: { modelValue: { primaryColor: '#f00' } },
      slots: { default: () => h(Child) },
    });
    expect(wrapper.find('span').text()).toBe('#f00');
  });

  it('emits update:modelValue when a slot mutator changes the config', async () => {
    const wrapper = mount(BaseThemeComposer, {
      slots: {
        default: (slotProperties: { setAttribute: (a: 'primaryColor', v: string) => void }) =>
          h('button', { onClick: () => slotProperties.setAttribute('primaryColor', '#0f0') }, 'set'),
      },
    });
    await wrapper.find('button').trigger('click');
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect((emitted?.at(-1)?.[0] as ThemeComposerConfig).primaryColor).toBe('#0f0');
  });
});
