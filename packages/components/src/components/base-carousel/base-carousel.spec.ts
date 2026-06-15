import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick } from 'vue';

import BaseCarousel from './base-carousel.vue';

function mountWithSlides(slideCount: number, properties: Record<string, unknown> = {}) {
  return mount(BaseCarousel, {
    props: properties,
    attachTo: document.body,
    slots: {
      default: () =>
        Array.from({ length: slideCount }, (_, index) => h('div', { class: 'slide' }, `Slide ${index + 1}`)),
    },
  });
}

function dispatchPointer(
  element: Element,
  type: 'pointerdown' | 'pointerup' | 'pointercancel' | 'pointerleave',
  init: { clientX: number; clientY: number; pointerType?: string; pointerId?: number },
): void {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    clientX: number;
    clientY: number;
    pointerType: string;
    pointerId: number;
    button: number;
  };
  Object.defineProperty(event, 'clientX', { value: init.clientX });
  Object.defineProperty(event, 'clientY', { value: init.clientY });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'touch' });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  Object.defineProperty(event, 'button', { value: 0 });
  element.dispatchEvent(event);
}

function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('BaseCarousel', () => {
  it('renders a region with the carousel role description', () => {
    const wrapper = mountWithSlides(3);
    expect(wrapper.element.tagName).toBe('SECTION');
    expect(wrapper.attributes('aria-roledescription')).toBe('carousel');
  });

  it('renders all provided slides', () => {
    const wrapper = mountWithSlides(3);
    expect(wrapper.findAll('.slide')).toHaveLength(3);
  });

  it('renders previous and next controls by default when there is more than one slide', () => {
    const wrapper = mountWithSlides(3);
    expect(wrapper.find('.base-carousel__control--prev').exists()).toBe(true);
    expect(wrapper.find('.base-carousel__control--next').exists()).toBe(true);
  });

  it('hides controls when only one slide is present', () => {
    const wrapper = mountWithSlides(1);
    expect(wrapper.find('.base-carousel__control--prev').exists()).toBe(false);
    expect(wrapper.find('.base-carousel__control--next').exists()).toBe(false);
  });

  it('hides controls when controls prop is false', () => {
    const wrapper = mountWithSlides(3, { controls: false });
    expect(wrapper.find('.base-carousel__control--prev').exists()).toBe(false);
  });

  it('renders one indicator per slide', () => {
    const wrapper = mountWithSlides(4);
    expect(wrapper.findAll('.base-carousel__indicator')).toHaveLength(4);
  });

  it('hides indicators when indicators prop is false', () => {
    const wrapper = mountWithSlides(3, { indicators: false });
    expect(wrapper.find('.base-carousel__indicators').exists()).toBe(false);
  });

  it('advances to the next slide when the next control is clicked', async () => {
    const wrapper = mountWithSlides(3);
    await wrapper.find('.base-carousel__control--next').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1]);
  });

  it('loops to the first slide from the last when loop is enabled', async () => {
    const wrapper = mountWithSlides(2, { modelValue: 1, loop: true });
    await wrapper.find('.base-carousel__control--next').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([0]);
  });

  it('disables the next control on the last slide when loop is disabled', () => {
    const wrapper = mountWithSlides(2, { modelValue: 1, loop: false });
    expect(wrapper.find('.base-carousel__control--next').attributes('disabled')).toBeDefined();
  });

  it('jumps to a slide when its indicator is clicked', async () => {
    const wrapper = mountWithSlides(3);
    const indicators = wrapper.findAll('.base-carousel__indicator');
    await indicators[2].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([2]);
  });

  it('marks the active indicator', () => {
    const wrapper = mountWithSlides(3, { modelValue: 1 });
    const indicators = wrapper.findAll('.base-carousel__indicator');
    expect(indicators[1].classes()).toContain('base-carousel__indicator--active');
  });

  describe('keyboard controls', () => {
    it('advances to the next slide on ArrowRight', async () => {
      const wrapper = mountWithSlides(3);
      await wrapper.trigger('keydown', { key: 'ArrowRight' });
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1]);
    });

    it('moves to the previous slide on ArrowLeft', async () => {
      const wrapper = mountWithSlides(3, { modelValue: 2 });
      await wrapper.trigger('keydown', { key: 'ArrowLeft' });
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1]);
    });

    it('jumps to the first slide on Home', async () => {
      const wrapper = mountWithSlides(4, { modelValue: 2 });
      await wrapper.trigger('keydown', { key: 'Home' });
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([0]);
    });

    it('jumps to the last slide on End', async () => {
      const wrapper = mountWithSlides(4);
      await wrapper.trigger('keydown', { key: 'End' });
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3]);
    });

    it('is focusable via tabindex', () => {
      const wrapper = mountWithSlides(3);
      expect(wrapper.attributes('tabindex')).toBe('0');
    });
  });

  describe('touch/pointer swipe', () => {
    it('advances on a left swipe past the threshold', async () => {
      const wrapper = mountWithSlides(3);
      const viewport = wrapper.find('.base-carousel__viewport').element;
      dispatchPointer(viewport, 'pointerdown', { clientX: 200, clientY: 100 });
      dispatchPointer(viewport, 'pointerup', { clientX: 100, clientY: 100 });
      await nextTick();
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1]);
    });

    it('moves back on a right swipe past the threshold', async () => {
      const wrapper = mountWithSlides(3, { modelValue: 1 });
      const viewport = wrapper.find('.base-carousel__viewport').element;
      dispatchPointer(viewport, 'pointerdown', { clientX: 100, clientY: 100 });
      dispatchPointer(viewport, 'pointerup', { clientX: 220, clientY: 100 });
      await nextTick();
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([0]);
    });

    it('ignores swipes below the threshold', async () => {
      const wrapper = mountWithSlides(3);
      const viewport = wrapper.find('.base-carousel__viewport').element;
      dispatchPointer(viewport, 'pointerdown', { clientX: 100, clientY: 100 });
      dispatchPointer(viewport, 'pointerup', { clientX: 110, clientY: 100 });
      await nextTick();
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('ignores predominantly vertical drags', async () => {
      const wrapper = mountWithSlides(3);
      const viewport = wrapper.find('.base-carousel__viewport').element;
      dispatchPointer(viewport, 'pointerdown', { clientX: 100, clientY: 100 });
      dispatchPointer(viewport, 'pointerup', { clientX: 150, clientY: 300 });
      await nextTick();
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });
  });

  describe('autoplay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('advances slides on a regular interval when autoplay is enabled', async () => {
      const wrapper = mountWithSlides(3, { autoplay: true, interval: 1000, pauseOnHover: false });
      vi.advanceTimersByTime(1000);
      await nextTick();
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1]);
      vi.advanceTimersByTime(1000);
      await nextTick();
      expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([2]);
    });

    it('does not autoplay when autoplay is false', async () => {
      const wrapper = mountWithSlides(3, { autoplay: false, interval: 1000 });
      vi.advanceTimersByTime(5000);
      await nextTick();
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('pauses on hover when pauseOnHover is true', async () => {
      const wrapper = mountWithSlides(3, { autoplay: true, interval: 1000, pauseOnHover: true });
      await wrapper.trigger('mouseenter');
      vi.advanceTimersByTime(3000);
      await nextTick();
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      await wrapper.trigger('mouseleave');
      vi.advanceTimersByTime(1000);
      await nextTick();
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1]);
    });

    it('renders an accessible pause control while autoplaying (WCAG 2.2.2)', () => {
      const wrapper = mountWithSlides(3, { autoplay: true, pauseOnHover: false });
      const toggle = wrapper.find('.base-carousel__autoplay');
      expect(toggle.exists()).toBe(true);
      expect(toggle.attributes('aria-label')).toBe('Pause automatic slide rotation');
      expect(toggle.attributes('aria-pressed')).toBe('false');
    });

    it('does not render the pause control when autoplay is off', () => {
      const wrapper = mountWithSlides(3, { autoplay: false });
      expect(wrapper.find('.base-carousel__autoplay').exists()).toBe(false);
    });

    it('stops auto-rotation when the user activates the pause control', async () => {
      const wrapper = mountWithSlides(3, { autoplay: true, interval: 1000, pauseOnHover: false });
      const toggle = wrapper.find('.base-carousel__autoplay');
      await toggle.trigger('click');
      expect(toggle.attributes('aria-label')).toBe('Start automatic slide rotation');
      expect(toggle.attributes('aria-pressed')).toBe('true');
      vi.advanceTimersByTime(3000);
      await nextTick();
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });
  });

  describe('reduced motion', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('does not auto-rotate or show the pause control when reduced motion is preferred', async () => {
      vi.useFakeTimers();
      stubReducedMotion(true);
      const wrapper = mountWithSlides(3, { autoplay: true, interval: 1000, pauseOnHover: false });
      vi.advanceTimersByTime(3000);
      await nextTick();
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.find('.base-carousel__autoplay').exists()).toBe(false);
      vi.useRealTimers();
    });
  });
});
