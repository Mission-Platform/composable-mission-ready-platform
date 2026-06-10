import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import BaseThemeToggle from './base-theme-toggle.vue';

describe('BaseThemeToggle', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  describe('rendering', () => {
    it('renders a <button> with type="button"', () => {
      const wrapper = mount(BaseThemeToggle);
      expect(wrapper.element.tagName).toBe('BUTTON');
      expect(wrapper.attributes('type')).toBe('button');
    });

    it('defaults to the auto theme class when no data-theme is set', () => {
      const wrapper = mount(BaseThemeToggle);
      expect(wrapper.classes()).toContain('theme-toggle--auto');
      expect(wrapper.attributes('aria-pressed')).toBe('false');
    });

    it('reads the current data-theme attribute from <html> on mount', async () => {
      document.documentElement.dataset.theme = 'dark';
      const wrapper = mount(BaseThemeToggle);
      await nextTick();
      expect(wrapper.classes()).toContain('theme-toggle--dark');
      expect(wrapper.attributes('aria-pressed')).toBe('true');
    });

    it('renders the default label "Auto mode" when in auto mode', () => {
      const wrapper = mount(BaseThemeToggle);
      expect(wrapper.find('.theme-toggle__label').text()).toBe('Auto mode');
    });

    it('renders the default label "Light mode" when in light mode', async () => {
      document.documentElement.dataset.theme = 'light';
      const wrapper = mount(BaseThemeToggle);
      await nextTick();
      expect(wrapper.find('.theme-toggle__label').text()).toBe('Light mode');
    });

    it('renders the default label "Dark mode" when in dark mode', async () => {
      document.documentElement.dataset.theme = 'dark';
      const wrapper = mount(BaseThemeToggle);
      await nextTick();
      expect(wrapper.find('.theme-toggle__label').text()).toBe('Dark mode');
    });

    it('renders a custom label slot when provided', () => {
      const wrapper = mount(BaseThemeToggle, { slots: { default: 'Custom label' } });
      expect(wrapper.find('.theme-toggle__label').text()).toBe('Custom label');
    });
  });

  describe('aria-label', () => {
    it('falls back to a generated aria-label when no prop is provided (auto -> light)', () => {
      const wrapper = mount(BaseThemeToggle);
      expect(wrapper.attributes('aria-label')).toBe('Switch to light theme');
    });

    it('falls back to a generated aria-label when no prop is provided (light -> dark)', async () => {
      document.documentElement.dataset.theme = 'light';
      const wrapper = mount(BaseThemeToggle);
      await nextTick();
      expect(wrapper.attributes('aria-label')).toBe('Switch to dark theme');
    });

    it('falls back to a generated aria-label when no prop is provided (dark -> auto)', async () => {
      document.documentElement.dataset.theme = 'dark';
      const wrapper = mount(BaseThemeToggle);
      await nextTick();
      expect(wrapper.attributes('aria-label')).toBe('Switch to auto theme');
    });

    it('uses the ariaLabel prop verbatim when provided', () => {
      const wrapper = mount(BaseThemeToggle, { props: { ariaLabel: 'Toggle theme' } });
      expect(wrapper.attributes('aria-label')).toBe('Toggle theme');
    });
  });

  describe('toggle behaviour', () => {
    it('cycles light -> dark -> auto -> light on click', async () => {
      document.documentElement.dataset.theme = 'light';
      const wrapper = mount(BaseThemeToggle);
      await nextTick();

      await wrapper.trigger('click');
      expect(document.documentElement.dataset.theme).toBe('dark');

      await wrapper.trigger('click');
      expect(document.documentElement.dataset.theme).toBeNull();

      await wrapper.trigger('click');
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('emits a change event with the new theme', async () => {
      document.documentElement.dataset.theme = 'light';
      const wrapper = mount(BaseThemeToggle);
      await nextTick();

      await wrapper.trigger('click');
      expect(wrapper.emitted('change')?.[0]).toEqual(['dark']);

      await wrapper.trigger('click');
      expect(wrapper.emitted('change')?.[1]).toEqual(['auto']);

      await wrapper.trigger('click');
      expect(wrapper.emitted('change')?.[2]).toEqual(['light']);
    });
  });
});
