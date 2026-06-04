import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseSkeleton from './BaseSkeleton.vue';

describe('BaseSkeleton', () => {
  it('renders a span element', () => {
    const wrapper = mountWithI18n(BaseSkeleton);
    expect(wrapper.find('span').exists()).toBe(true);
  });

  it('is aria-hidden', () => {
    const wrapper = mountWithI18n(BaseSkeleton);
    expect(wrapper.find('span').attributes('aria-hidden')).toBe('true');
  });

  it('applies line class by default', () => {
    const wrapper = mountWithI18n(BaseSkeleton);
    expect(wrapper.find('span').classes()).toContain('base-skeleton--line');
  });

  it('applies circle class', () => {
    const wrapper = mountWithI18n(BaseSkeleton, { props: { shape: 'circle' } });
    expect(wrapper.find('span').classes()).toContain('base-skeleton--circle');
  });

  it('applies block class', () => {
    const wrapper = mountWithI18n(BaseSkeleton, { props: { shape: 'block' } });
    expect(wrapper.find('span').classes()).toContain('base-skeleton--block');
  });

  it('applies animated class by default', () => {
    const wrapper = mountWithI18n(BaseSkeleton);
    expect(wrapper.find('span').classes()).toContain('base-skeleton--animated');
  });

  it('can disable animation', () => {
    const wrapper = mountWithI18n(BaseSkeleton, { props: { animated: false } });
    expect(wrapper.find('span').classes()).not.toContain('base-skeleton--animated');
  });

  it('applies custom width and height styles', () => {
    const wrapper = mountWithI18n(BaseSkeleton, { props: { width: '200px', height: '20px' } });
    expect(wrapper.find('span').attributes('style')).toContain('200px');
    expect(wrapper.find('span').attributes('style')).toContain('20px');
  });
});
