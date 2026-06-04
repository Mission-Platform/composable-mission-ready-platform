import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HideAt from './HideAt.vue';

function mockWindowWidth(width: number): void {
  Object.defineProperty(globalThis.window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(globalThis.window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const match = query.match(/\(min-width:\s*(\d+)px\)/);
      const minWidth = match ? Number.parseInt(match[1], 10) : 0;

      return {
        matches: width >= minWidth,
        media: query,
        onchange: undefined,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList;
    },
  });
}

beforeEach(() => {
  mockWindowWidth(1024);
});

describe('HideAt', () => {
  describe('min prop', () => {
    it('hides slot when viewport is at or above min breakpoint', () => {
      mockWindowWidth(1920);
      const wrapper = mount(HideAt, {
        props: { min: 'lg' },
        slots: { default: '<p>content</p>' },
      });
      expect(wrapper.find('p').exists()).toBe(false);
    });

    it('shows slot when viewport is below min breakpoint', () => {
      mockWindowWidth(768);
      const wrapper = mount(HideAt, {
        props: { min: 'lg' },
        slots: { default: '<p>content</p>' },
      });
      expect(wrapper.find('p').exists()).toBe(true);
    });

    it('hides slot when no props are provided (always hidden)', () => {
      mockWindowWidth(320);
      const wrapper = mount(HideAt, {
        slots: { default: '<span>always</span>' },
      });
      expect(wrapper.find('span').exists()).toBe(false);
    });
  });

  describe('max prop', () => {
    it('hides slot when viewport is below max breakpoint', () => {
      mockWindowWidth(768);
      const wrapper = mount(HideAt, {
        props: { max: 'lg' },
        slots: { default: '<p>content</p>' },
      });
      expect(wrapper.find('p').exists()).toBe(false);
    });

    it('shows slot when viewport is at or above max breakpoint', () => {
      mockWindowWidth(1920);
      const wrapper = mount(HideAt, {
        props: { max: 'lg' },
        slots: { default: '<p>content</p>' },
      });
      expect(wrapper.find('p').exists()).toBe(true);
    });
  });

  describe('min + max props', () => {
    it('hides slot only when within the min–max range', () => {
      mockWindowWidth(1024);
      const wrapper = mount(HideAt, {
        props: { min: 'md', max: 'xl' },
        slots: { default: '<p>content</p>' },
      });
      expect(wrapper.find('p').exists()).toBe(false);
    });

    it('shows slot when viewport is above max', () => {
      mockWindowWidth(2560);
      const wrapper = mount(HideAt, {
        props: { min: 'md', max: 'lg' },
        slots: { default: '<p>content</p>' },
      });
      expect(wrapper.find('p').exists()).toBe(true);
    });

    it('shows slot when viewport is below min', () => {
      mockWindowWidth(480);
      const wrapper = mount(HideAt, {
        props: { min: 'md', max: 'xl' },
        slots: { default: '<p>content</p>' },
      });
      expect(wrapper.find('p').exists()).toBe(true);
    });
  });
});
