import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseAvatar from './base-avatar.vue';

describe('BaseAvatar', () => {
  describe('default rendering', () => {
    it('renders a root .avatar wrapper', () => {
      const wrapper = mount(BaseAvatar);
      expect(wrapper.find('.avatar').exists()).toBe(true);
    });

    it('applies default size and shape classes (md, circle)', () => {
      const wrapper = mount(BaseAvatar);
      const image = wrapper.find('.avatar__image');
      expect(image.classes()).toContain('avatar--md');
      expect(image.classes()).toContain('avatar--circle');
    });

    it('does not render a status indicator by default', () => {
      const wrapper = mount(BaseAvatar);
      expect(wrapper.find('.avatar__status').exists()).toBe(false);
    });
  });

  describe('src image', () => {
    it('renders an <img> when src is provided', () => {
      const wrapper = mount(BaseAvatar, {
        props: { src: 'https://example.com/me.png', alt: 'Me' },
      });
      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toBe('https://example.com/me.png');
      expect(img.attributes('alt')).toBe('Me');
    });

    it('does not render initials when src is provided', () => {
      const wrapper = mount(BaseAvatar, {
        props: { src: 'https://example.com/me.png', initials: 'JS' },
      });
      expect(wrapper.find('.avatar__initials').exists()).toBe(false);
    });
  });

  describe('initials fallback', () => {
    it('renders initials when no src is provided', () => {
      const wrapper = mount(BaseAvatar, { props: { initials: 'JS' } });
      const initials = wrapper.find('.avatar__initials');
      expect(initials.exists()).toBe(true);
      expect(initials.text()).toBe('JS');
    });

    it('renders the default slot when neither src nor initials are provided', () => {
      const wrapper = mount(BaseAvatar, { slots: { default: '<svg data-test="icon" />' } });
      expect(wrapper.find('[data-test="icon"]').exists()).toBe(true);
    });
  });

  describe('size and shape', () => {
    it.each(['xs', 'sm', 'md', 'lg', 'xl'] as const)('applies size class %s', (size) => {
      const wrapper = mount(BaseAvatar, { props: { size } });
      expect(wrapper.find('.avatar__image').classes()).toContain(`avatar--${size}`);
    });

    it('applies square shape class', () => {
      const wrapper = mount(BaseAvatar, { props: { shape: 'square' } });
      expect(wrapper.find('.avatar__image').classes()).toContain('avatar--square');
    });
  });

  describe('status indicator', () => {
    it.each(['online', 'offline', 'away', 'busy'] as const)('renders the %s status', (status) => {
      const wrapper = mount(BaseAvatar, { props: { status } });
      const indicator = wrapper.find('.avatar__status');
      expect(indicator.exists()).toBe(true);
      expect(indicator.attributes('aria-label')).toBe(status);
      expect(indicator.attributes('role')).toBe('status');
    });
  });
});
