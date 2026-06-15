import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseTimelineItem from './base-timeline-item.vue';
import BaseTimeline from './base-timeline.vue';

describe('BaseTimeline', () => {
  it('renders an ordered list with the vertical class by default', () => {
    const wrapper = mountWithI18n(BaseTimeline);
    const root = wrapper.find('.base-timeline');
    expect(root.exists()).toBe(true);
    expect(root.element.tagName).toBe('OL');
    expect(root.classes()).toContain('base-timeline--vertical');
  });

  it('applies the horizontal orientation class', () => {
    const wrapper = mountWithI18n(BaseTimeline, { props: { orientation: 'horizontal' } });
    expect(wrapper.find('.base-timeline--horizontal').exists()).toBe(true);
  });

  it('applies the alternate modifier only for vertical timelines', () => {
    const vertical = mountWithI18n(BaseTimeline, { props: { align: 'alternate' } });
    expect(vertical.find('.base-timeline--alternate').exists()).toBe(true);

    const horizontal = mountWithI18n(BaseTimeline, { props: { orientation: 'horizontal', align: 'alternate' } });
    expect(horizontal.find('.base-timeline--alternate').exists()).toBe(false);
  });

  it('renders item children passed through the default slot', () => {
    const wrapper = mountWithI18n(BaseTimeline, {
      slots: {
        default: '<li class="custom-item">A</li><li class="custom-item">B</li>',
      },
    });
    expect(wrapper.findAll('.custom-item')).toHaveLength(2);
  });
});

describe('BaseTimelineItem', () => {
  it('renders a list item with a default filled dot', () => {
    const wrapper = mountWithI18n(BaseTimelineItem);
    const root = wrapper.find('.base-timeline-item');
    expect(root.element.tagName).toBe('LI');
    expect(wrapper.find('.base-timeline-item__dot').exists()).toBe(true);
  });

  it('renders the title and time props', () => {
    const wrapper = mountWithI18n(BaseTimelineItem, {
      props: { title: 'Launched', time: 'Jan 2024' },
      slots: { default: 'Details here' },
    });
    expect(wrapper.find('.base-timeline-item__title').text()).toBe('Launched');
    expect(wrapper.find('.base-timeline-item__time').text()).toBe('Jan 2024');
    expect(wrapper.find('.base-timeline-item__body').text()).toContain('Details here');
  });

  it('applies the variant class', () => {
    const wrapper = mountWithI18n(BaseTimelineItem, { props: { variant: 'success' } });
    expect(wrapper.find('.base-timeline-item--success').exists()).toBe(true);
  });

  it('applies the outlined modifier', () => {
    const wrapper = mountWithI18n(BaseTimelineItem, { props: { outlined: true } });
    expect(wrapper.find('.base-timeline-item--outlined').exists()).toBe(true);
  });

  it('renders a custom marker slot in place of the dot', () => {
    const wrapper = mountWithI18n(BaseTimelineItem, {
      slots: { marker: '<span class="custom-marker" />' },
    });
    expect(wrapper.find('.custom-marker').exists()).toBe(true);
    expect(wrapper.find('.base-timeline-item__dot').exists()).toBe(false);
  });

  it('inherits the orientation from a parent timeline via provide/inject', () => {
    const composed = mountWithI18n({
      components: { BaseTimeline, BaseTimelineItem },
      template: `<BaseTimeline orientation="horizontal"><BaseTimelineItem title="X" /></BaseTimeline>`,
    });
    expect(composed.find('.base-timeline-item--horizontal').exists()).toBe(true);
  });

  it('defaults to vertical when used without a parent timeline', () => {
    const wrapper = mountWithI18n(BaseTimelineItem, { props: { title: 'Standalone' } });
    expect(wrapper.find('.base-timeline-item--vertical').exists()).toBe(true);
  });
});
