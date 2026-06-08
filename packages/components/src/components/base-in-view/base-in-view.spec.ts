import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import BaseInView from './base-in-view.vue';

type IntersectionCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

interface MockIntersectionObserver {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  takeRecords: ReturnType<typeof vi.fn>;
  trigger: (isIntersecting: boolean) => void;
  options: IntersectionObserverInit | undefined;
}

let lastObserver: MockIntersectionObserver | undefined;

beforeEach(() => {
  lastObserver = undefined;
  const Mock = vi.fn(function (
    this: MockIntersectionObserver,
    callback: IntersectionCallback,
    options?: IntersectionObserverInit,
  ) {
    this.observe = vi.fn();
    this.disconnect = vi.fn();
    this.unobserve = vi.fn();
    this.takeRecords = vi.fn(() => []);
    this.trigger = (isIntersecting: boolean) => callback([{ isIntersecting }]);
    this.options = options;
    lastObserver = this;
  });
  vi.stubGlobal('IntersectionObserver', Mock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BaseInView', () => {
  describe('rendering', () => {
    it('renders a <div> wrapper by default', () => {
      const wrapper = mount(BaseInView);
      expect(wrapper.element.tagName).toBe('DIV');
      expect(wrapper.classes()).toContain('in-view');
    });

    it('renders a custom tag when provided', () => {
      const wrapper = mount(BaseInView, { props: { tag: 'section' } });
      expect(wrapper.element.tagName).toBe('SECTION');
    });

    it('exposes inView and hasBeenInView state to the default slot', () => {
      const wrapper = mount(BaseInView, {
        slots: {
          default: `<template #default="{ inView, hasBeenInView }">
            <span data-test="state">{{ inView }}-{{ hasBeenInView }}</span>
          </template>`,
        },
      });
      expect(wrapper.find('[data-test="state"]').text()).toBe('false-false');
    });
  });

  describe('IntersectionObserver wiring', () => {
    it('creates an observer with the provided threshold and rootMargin', () => {
      mount(BaseInView, { props: { threshold: 0.5, rootMargin: '50px' } });
      expect(lastObserver).toBeDefined();
      expect(lastObserver?.options).toEqual({ threshold: 0.5, rootMargin: '50px' });
      expect(lastObserver?.observe).toHaveBeenCalledOnce();
    });

    it('emits "enter" and updates state when the element intersects', async () => {
      const wrapper = mount(BaseInView, {
        slots: {
          default: `<template #default="{ inView, hasBeenInView }">
            <span data-test="state">{{ inView }}-{{ hasBeenInView }}</span>
          </template>`,
        },
      });

      lastObserver?.trigger(true);
      await nextTick();

      expect(wrapper.emitted('enter')).toHaveLength(1);
      expect(wrapper.find('[data-test="state"]').text()).toBe('true-true');
    });

    it('disconnects the observer after entering when once=true (default)', () => {
      mount(BaseInView);
      lastObserver?.trigger(true);
      expect(lastObserver?.disconnect).toHaveBeenCalledOnce();
    });

    it('keeps observing and emits "leave" when once=false', async () => {
      const wrapper = mount(BaseInView, { props: { once: false } });

      lastObserver?.trigger(true);
      await nextTick();
      lastObserver?.trigger(false);
      await nextTick();

      expect(wrapper.emitted('enter')).toHaveLength(1);
      expect(wrapper.emitted('leave')).toHaveLength(1);
      expect(lastObserver?.disconnect).not.toHaveBeenCalled();
    });

    it('disconnects the observer on unmount', () => {
      const wrapper = mount(BaseInView, { props: { once: false } });
      const observer = lastObserver;
      wrapper.unmount();
      expect(observer?.disconnect).toHaveBeenCalled();
    });
  });
});
