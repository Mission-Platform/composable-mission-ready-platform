import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseResponsiveImage from './base-responsive-image.vue';

describe('BaseResponsiveImage', () => {
  it('renders a <picture> with a fallback <img>', () => {
    const wrapper = mount(BaseResponsiveImage, { props: { src: '/a.jpg', alt: 'A' } });
    expect(wrapper.element.tagName).toBe('PICTURE');
    const img = wrapper.find('img');
    expect(img.attributes('src')).toBe('/a.jpg');
    expect(img.attributes('alt')).toBe('A');
  });

  it('applies default loading and decoding attributes', () => {
    const wrapper = mount(BaseResponsiveImage, { props: { src: '/a.jpg', alt: 'A' } });
    const img = wrapper.find('img');
    expect(img.attributes('loading')).toBe('lazy');
    expect(img.attributes('decoding')).toBe('async');
  });

  it('renders a <source> per entry', () => {
    const wrapper = mount(BaseResponsiveImage, {
      props: {
        src: '/a.jpg',
        alt: 'A',
        sources: [
          { srcset: '/a.webp', type: 'image/webp' },
          { srcset: '/a-large.jpg', media: '(min-width: 768px)' },
        ],
      },
    });
    const sources = wrapper.findAll('source');
    expect(sources).toHaveLength(2);
    expect(sources[0].attributes('type')).toBe('image/webp');
    expect(sources[1].attributes('media')).toBe('(min-width: 768px)');
  });

  it('forwards srcset and sizes to the fallback img', () => {
    const wrapper = mount(BaseResponsiveImage, {
      props: { src: '/a.jpg', alt: 'A', srcset: '/a-2x.jpg 2x', sizes: '100vw' },
    });
    const img = wrapper.find('img');
    expect(img.attributes('srcset')).toBe('/a-2x.jpg 2x');
    expect(img.attributes('sizes')).toBe('100vw');
  });

  it('applies aspect-ratio to the picture', () => {
    const wrapper = mount(BaseResponsiveImage, { props: { src: '/a.jpg', alt: 'A', aspectRatio: '16 / 9' } });
    expect(wrapper.attributes('style')).toContain('aspect-ratio: 16 / 9');
  });

  it('applies the rounded class', () => {
    const wrapper = mount(BaseResponsiveImage, { props: { src: '/a.jpg', alt: 'A', rounded: true } });
    expect(wrapper.classes()).toContain('base-responsive-image--rounded');
  });

  it('emits load and error events', async () => {
    const wrapper = mount(BaseResponsiveImage, { props: { src: '/a.jpg', alt: 'A' } });
    await wrapper.find('img').trigger('load');
    await wrapper.find('img').trigger('error');
    expect(wrapper.emitted('load')).toHaveLength(1);
    expect(wrapper.emitted('error')).toHaveLength(1);
  });
});
