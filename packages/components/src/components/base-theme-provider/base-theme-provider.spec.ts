import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import { resetThemeStore, useTheme } from '../../composables/use-theme';

import BaseThemeProvider from './base-theme-provider.vue';

import type { Theme } from '../../composables/use-theme';


beforeEach(() => {
  delete document.documentElement.dataset.theme;
  localStorage.clear();
  resetThemeStore();
});

afterEach(() => {
  delete document.documentElement.dataset.theme;
  localStorage.clear();
  resetThemeStore();
});

describe('BaseThemeProvider', () => {
  it('applies the default theme to <html> via data-theme', () => {
    mount(BaseThemeProvider, { props: { defaultTheme: 'dark' } });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('removes data-theme for the auto theme', () => {
    mount(BaseThemeProvider, { props: { defaultTheme: 'auto', persist: false } });
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('respects a pre-applied data-theme attribute over the default (SSR-friendly)', () => {
    document.documentElement.dataset.theme = 'dark';
    mount(BaseThemeProvider, { props: { defaultTheme: 'light', persist: false } });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('persists the preference to localStorage', () => {
    mount(BaseThemeProvider, { props: { defaultTheme: 'light', storageKey: 'my-theme' } });
    expect(localStorage.getItem('my-theme')).toBe('light');
  });

  it('exposes theme state and mutators through the default slot', async () => {
    const wrapper = mount(BaseThemeProvider, {
      props: { defaultTheme: 'light' },
      slots: {
        default: (slotProperties: { theme: Theme; setTheme: (t: Theme) => void }) =>
          h('button', { onClick: () => slotProperties.setTheme('dark') }, slotProperties.theme),
      },
    });
    expect(wrapper.find('button').text()).toBe('light');
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('button').text()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('shares its store with descendants through useTheme', () => {
    const Child = defineComponent({
      setup() {
        const { resolvedTheme } = useTheme();
        return () => h('span', resolvedTheme.value);
      },
    });
    const wrapper = mount(BaseThemeProvider, {
      props: { defaultTheme: 'dark' },
      slots: { default: () => h(Child) },
    });
    expect(wrapper.find('span').text()).toBe('dark');
  });

  it('cycles light → dark → auto', async () => {
    const wrapper = mount(BaseThemeProvider, {
      props: { defaultTheme: 'light', persist: false },
      slots: {
        default: (slotProperties: { theme: Theme; cycleTheme: () => void }) =>
          h('button', { onClick: slotProperties.cycleTheme }, slotProperties.theme),
      },
    });
    const button = wrapper.find('button');
    expect(button.text()).toBe('light');
    await button.trigger('click');
    expect(button.text()).toBe('dark');
    await button.trigger('click');
    expect(button.text()).toBe('auto');
  });
});
