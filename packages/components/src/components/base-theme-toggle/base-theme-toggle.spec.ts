import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import BaseThemeToggle from './base-theme-toggle.vue';

describe('BaseThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  describe('rendering', () => {
    it('renders a <button> with type="button"', () => {
      const wrapper = mount(BaseThemeToggle);
      expect(wrapper.element.tagName).toBe('BUTTON');
      expect(wrapper.attributes('type')).toBe('button');
    });

    it('defaults to the light theme class when no data-theme is set', () => {
      const wrapper = mount(BaseThemeToggle);
      expect(wrapper.classes()).toContain('theme-toggle--light');
      expect(wrapper.attributes('aria-pressed')).toBe('false');
    });

    it('reads the current data-theme attribute from <html> on mount', async () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const wrapper = mount(BaseThemeToggle);
      await nextTick();
      expect(wrapper.classes()).toContain('theme-toggle--dark');
      expect(wrapper.attributes('aria-pressed')).toBe('true');
    });

    it('renders the default label "Dark mode" when in light mode', () => {
      const wrapper = mount(BaseThemeToggle);
      expect(wrapper.find('.theme-toggle__label').text()).toBe('Dark mode');
    });

    it('renders a custom label slot when provided', () => {
      const wrapper = mount(BaseThemeToggle, { slots: { default: 'Custom label' } });
      expect(wrapper.find('.theme-toggle__label').text()).toBe('Custom label');
    });
  });

  describe('aria-label', () => {
    it('falls back to a generated aria-label when no prop is provided (light)', () => {
      const wrapper = mount(BaseThemeToggle);
      expect(wrapper.attributes('aria-label')).toBe('Switch to dark theme');
    });

    it('falls back to a generated aria-label when no prop is provided (dark)', async () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const wrapper = mount(BaseThemeToggle);
      await nextTick();
      expect(wrapper.attributes('aria-label')).toBe('Switch to light theme');
    });

    it('uses the ariaLabel prop verbatim when provided', () => {
      const wrapper = mount(BaseThemeToggle, { props: { ariaLabel: 'Toggle theme' } });
      expect(wrapper.attributes('aria-label')).toBe('Toggle theme');
    });
  });

  describe('toggle behaviour', () => {
    it('flips data-theme on the <html> element when clicked', async () => {
      const wrapper = mount(BaseThemeToggle);
      await wrapper.trigger('click');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      await wrapper.trigger('click');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('emits a change event with the new theme', async () => {
      const wrapper = mount(BaseThemeToggle);
      await wrapper.trigger('click');
      expect(wrapper.emitted('change')?.[0]).toEqual(['dark']);

      await wrapper.trigger('click');
      expect(wrapper.emitted('change')?.[1]).toEqual(['light']);
    });
  });
});
