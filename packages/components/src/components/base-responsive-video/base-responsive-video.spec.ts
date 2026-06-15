import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseResponsiveVideo from './base-responsive-video.vue';

describe('BaseResponsiveVideo', () => {
  it('renders a <video> element', () => {
    const wrapper = mount(BaseResponsiveVideo, { props: { src: '/v.mp4' } });
    expect(wrapper.element.tagName).toBe('VIDEO');
    expect(wrapper.find('video').attributes('src')).toBe('/v.mp4');
  });

  it('renders controls by default and applies the default aspect ratio', () => {
    const wrapper = mount(BaseResponsiveVideo, { props: { src: '/v.mp4' } });
    const video = wrapper.find('video');
    expect(video.attributes('controls')).toBeDefined();
    expect(video.attributes('style')).toContain('aspect-ratio: 16 / 9');
  });

  it('renders <source> entries and omits the top-level src when sources are provided', () => {
    const wrapper = mount(BaseResponsiveVideo, {
      props: {
        sources: [
          { src: '/v.webm', type: 'video/webm' },
          { src: '/v.mp4', type: 'video/mp4' },
        ],
      },
    });
    const sources = wrapper.findAll('source');
    expect(sources).toHaveLength(2);
    expect(sources[0].attributes('type')).toBe('video/webm');
    expect(wrapper.find('video').attributes('src')).toBeUndefined();
  });

  it('forwards the poster image', () => {
    const wrapper = mount(BaseResponsiveVideo, { props: { src: '/v.mp4', poster: '/p.jpg' } });
    expect(wrapper.find('video').attributes('poster')).toBe('/p.jpg');
  });

  it('applies aria-label from the label prop', () => {
    const wrapper = mount(BaseResponsiveVideo, { props: { src: '/v.mp4', label: 'Demo' } });
    expect(wrapper.find('video').attributes('aria-label')).toBe('Demo');
  });

  it('applies the rounded class', () => {
    const wrapper = mount(BaseResponsiveVideo, { props: { src: '/v.mp4', rounded: true } });
    expect(wrapper.classes()).toContain('base-responsive-video--rounded');
  });

  it('emits play, pause, and ended events', async () => {
    const wrapper = mount(BaseResponsiveVideo, { props: { src: '/v.mp4' } });
    await wrapper.find('video').trigger('play');
    await wrapper.find('video').trigger('pause');
    await wrapper.find('video').trigger('ended');
    expect(wrapper.emitted('play')).toHaveLength(1);
    expect(wrapper.emitted('pause')).toHaveLength(1);
    expect(wrapper.emitted('ended')).toHaveLength(1);
  });
});
