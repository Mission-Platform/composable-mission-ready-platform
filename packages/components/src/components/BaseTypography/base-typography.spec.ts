import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseTypography from './BaseTypography.vue';

import type { TypographyVariant } from './BaseTypography.vue';

describe('BaseTypography', () => {
  it('renders slot content', () => {
    const wrapper = mount(BaseTypography, { slots: { default: 'Hello world' } });
    expect(wrapper.text()).toBe('Hello world');
  });

  it('renders a <p> element by default (body-md variant)', () => {
    const wrapper = mount(BaseTypography);
    expect(wrapper.find('.base-typography').element.tagName).toBe('P');
  });

  it('applies default classes', () => {
    const wrapper = mount(BaseTypography);
    const element = wrapper.find('.base-typography');
    expect(element.classes()).toContain('base-typography');
    expect(element.classes()).toContain('base-typography--body-md');
    expect(element.classes()).toContain('base-typography--color-primary');
  });

  it('renders heading variants with the correct HTML tag', () => {
    const cases: Array<[string, string]> = [
      ['display', 'H1'],
      ['h1', 'H1'],
      ['h2', 'H2'],
      ['h3', 'H3'],
      ['h4', 'H4'],
      ['h5', 'H5'],
      ['h6', 'H6'],
    ];
    for (const [variant, expectedTag] of cases) {
      const wrapper = mount(BaseTypography, { props: { variant: variant as TypographyVariant } });
      expect(wrapper.find('.base-typography').element.tagName).toBe(expectedTag);
    }
  });

  it('renders body variants as <p>', () => {
    for (const variant of ['body-lg', 'body-md', 'body-sm', 'body-xs'] as const) {
      const wrapper = mount(BaseTypography, { props: { variant } });
      expect(wrapper.find('.base-typography').element.tagName).toBe('P');
    }
  });

  it('renders label and caption variants as <span>', () => {
    for (const variant of ['label', 'caption'] as const) {
      const wrapper = mount(BaseTypography, { props: { variant } });
      expect(wrapper.find('.base-typography').element.tagName).toBe('SPAN');
    }
  });

  it('renders code variant as <code>', () => {
    const wrapper = mount(BaseTypography, { props: { variant: 'code' } });
    expect(wrapper.find('.base-typography').element.tagName).toBe('CODE');
  });

  it('applies variant class', () => {
    const wrapper = mount(BaseTypography, { props: { variant: 'h2' } });
    expect(wrapper.find('.base-typography').classes()).toContain('base-typography--h2');
  });

  it('applies weight class when weight prop is set', () => {
    for (const weight of ['regular', 'medium', 'semibold', 'bold'] as const) {
      const wrapper = mount(BaseTypography, { props: { weight } });
      expect(wrapper.find('.base-typography').classes()).toContain(`base-typography--weight-${weight}`);
    }
  });

  it('does not apply weight class when weight prop is not set', () => {
    const wrapper = mount(BaseTypography);
    expect(
      wrapper
        .find('.base-typography')
        .classes()
        .some((c) => c.startsWith('base-typography--weight-')),
    ).toBe(false);
  });

  it('applies color class', () => {
    for (const color of ['primary', 'secondary', 'tertiary', 'disabled', 'inverse'] as const) {
      const wrapper = mount(BaseTypography, { props: { color } });
      expect(wrapper.find('.base-typography').classes()).toContain(`base-typography--color-${color}`);
    }
  });

  it('does not apply color class when color is "inherit"', () => {
    const wrapper = mount(BaseTypography, { props: { color: 'inherit' } });
    expect(
      wrapper
        .find('.base-typography')
        .classes()
        .some((c) => c.startsWith('base-typography--color-')),
    ).toBe(false);
  });

  it('applies align class when align prop is set', () => {
    for (const align of ['start', 'center', 'end'] as const) {
      const wrapper = mount(BaseTypography, { props: { align } });
      expect(wrapper.find('.base-typography').classes()).toContain(`base-typography--align-${align}`);
    }
  });

  it('does not apply align class when align prop is not set', () => {
    const wrapper = mount(BaseTypography);
    expect(
      wrapper
        .find('.base-typography')
        .classes()
        .some((c) => c.startsWith('base-typography--align-')),
    ).toBe(false);
  });

  it('applies truncate class when truncate prop is true', () => {
    const wrapper = mount(BaseTypography, { props: { truncate: true } });
    expect(wrapper.find('.base-typography').classes()).toContain('base-typography--truncate');
  });

  it('does not apply truncate class by default', () => {
    const wrapper = mount(BaseTypography);
    expect(wrapper.find('.base-typography').classes()).not.toContain('base-typography--truncate');
  });

  it('renders a custom element via the "as" prop', () => {
    const wrapper = mount(BaseTypography, { props: { as: 'article' } });
    expect(wrapper.find('.base-typography').element.tagName).toBe('ARTICLE');
  });

  it('"as" prop overrides the default tag for a variant', () => {
    const wrapper = mount(BaseTypography, { props: { variant: 'h1', as: 'div' } });
    expect(wrapper.find('.base-typography').element.tagName).toBe('DIV');
  });

  // ── truncatePopup ─────────────────────────────────────────────────────────

  it('renders a wrapper span when truncatePopup is true', () => {
    const wrapper = mount(BaseTypography, {
      props: { truncatePopup: true },
      slots: { default: 'Some text' },
    });
    expect(wrapper.find('.base-typography-popup-wrapper').exists()).toBe(true);
    expect(wrapper.find('.base-typography-popup-wrapper').element.tagName).toBe('SPAN');
  });

  it('always applies truncate class to the inner element when truncatePopup is true', () => {
    const wrapper = mount(BaseTypography, {
      props: { truncatePopup: true },
      slots: { default: 'Some text' },
    });
    const inner = wrapper.find('.base-typography');
    expect(inner.classes()).toContain('base-typography--truncate');
  });

  it('does not show popup on mount (no overflow by default in jsdom)', () => {
    const wrapper = mount(BaseTypography, {
      props: { truncatePopup: true },
      slots: { default: 'Some text' },
    });
    expect(wrapper.find('.base-typography-popup').exists()).toBe(false);
  });

  it('shows popup on mouseenter when text is overflowing', async () => {
    const wrapper = mount(BaseTypography, {
      props: { truncatePopup: true },
      slots: { default: 'A very long truncated text' },
    });
    // Simulate overflow
    const inner = wrapper.find('.base-typography').element as HTMLElement;
    Object.defineProperty(inner, 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(inner, 'clientWidth', { value: 100, configurable: true });

    await wrapper.find('.base-typography').trigger('mouseenter');
    expect(wrapper.find('.base-typography-popup').exists()).toBe(true);
    expect(wrapper.find('.base-typography-popup').text()).toBe('A very long truncated text');
  });

  it('hides popup on mouseleave', async () => {
    const wrapper = mount(BaseTypography, {
      props: { truncatePopup: true },
      slots: { default: 'A very long truncated text' },
    });
    const inner = wrapper.find('.base-typography').element as HTMLElement;
    Object.defineProperty(inner, 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(inner, 'clientWidth', { value: 100, configurable: true });

    await wrapper.find('.base-typography').trigger('mouseenter');
    expect(wrapper.find('.base-typography-popup').exists()).toBe(true);

    await wrapper.find('.base-typography').trigger('mouseleave');
    expect(wrapper.find('.base-typography-popup').exists()).toBe(false);
  });

  it('does not show popup on mouseenter when text is not overflowing', async () => {
    const wrapper = mount(BaseTypography, {
      props: { truncatePopup: true },
      slots: { default: 'Short' },
    });
    // No overflow: scrollWidth <= clientWidth (jsdom defaults to 0)
    await wrapper.find('.base-typography').trigger('mouseenter');
    expect(wrapper.find('.base-typography-popup').exists()).toBe(false);
  });

  it('popup has role="tooltip"', async () => {
    const wrapper = mount(BaseTypography, {
      props: { truncatePopup: true },
      slots: { default: 'A very long truncated text' },
    });
    const inner = wrapper.find('.base-typography').element as HTMLElement;
    Object.defineProperty(inner, 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(inner, 'clientWidth', { value: 100, configurable: true });

    await wrapper.find('.base-typography').trigger('mouseenter');
    expect(wrapper.find('.base-typography-popup').attributes('role')).toBe('tooltip');
  });
});
