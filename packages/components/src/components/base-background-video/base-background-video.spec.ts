import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseBackgroundVideo from './base-background-video.vue';

describe('BaseBackgroundVideo', () => {
  it('renders a decorative, looping, muted, inline <video>', () => {
    const wrapper = mount(BaseBackgroundVideo, { props: { src: '/v.mp4' } });
    const video = wrapper.find('video');
    expect(video.exists()).toBe(true);
    expect(video.attributes('aria-hidden')).toBe('true');
    expect(video.attributes('loop')).toBeDefined();
    expect(video.attributes('playsinline')).toBeDefined();
    expect(video.attributes('tabindex')).toBe('-1');
  });

  it('does not expose controls', () => {
    const wrapper = mount(BaseBackgroundVideo, { props: { src: '/v.mp4' } });
    expect(wrapper.find('video').attributes('controls')).toBeUndefined();
  });

  it('renders <source> entries and omits the top-level src when sources are provided', () => {
    const wrapper = mount(BaseBackgroundVideo, {
      props: { sources: [{ src: '/v.webm', type: 'video/webm' }] },
    });
    expect(wrapper.findAll('source')).toHaveLength(1);
    expect(wrapper.find('video').attributes('src')).toBeUndefined();
  });

  it('applies the overlay class when overlay is set', () => {
    const wrapper = mount(BaseBackgroundVideo, { props: { src: '/v.mp4', overlay: true } });
    expect(wrapper.classes()).toContain('base-background-video--overlay');
  });

  it('applies the minHeight style', () => {
    const wrapper = mount(BaseBackgroundVideo, { props: { src: '/v.mp4', minHeight: '40rem' } });
    expect(wrapper.attributes('style')).toContain('min-height: 40rem');
  });

  it('renders foreground content from the default slot', () => {
    const wrapper = mount(BaseBackgroundVideo, {
      props: { src: '/v.mp4' },
      slots: { default: '<h2>Overlaid title</h2>' },
    });
    expect(wrapper.find('.base-background-video__content h2').text()).toBe('Overlaid title');
  });

  it('forwards the poster image', () => {
    const wrapper = mount(BaseBackgroundVideo, { props: { src: '/v.mp4', poster: '/p.jpg' } });
    expect(wrapper.find('video').attributes('poster')).toBe('/p.jpg');
  });
});
