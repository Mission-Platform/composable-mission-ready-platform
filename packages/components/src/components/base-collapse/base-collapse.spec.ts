import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseCollapse from './base-collapse.vue';

describe('BaseCollapse', () => {
  it('renders summary text', () => {
    const wrapper = mountWithI18n(BaseCollapse, { props: { summary: 'My Section' } });
    expect(wrapper.find('summary').text()).toContain('My Section');
  });

  it('is closed by default', () => {
    const wrapper = mountWithI18n(BaseCollapse, { props: { summary: 'Test' } });
    expect(wrapper.find('details').attributes('open')).toBeUndefined();
  });

  it('can be opened by default via prop', () => {
    const wrapper = mountWithI18n(BaseCollapse, { props: { summary: 'Test', open: true } });
    expect(wrapper.find('details').attributes()).toHaveProperty('open');
  });

  it('applies disabled class when disabled', () => {
    const wrapper = mountWithI18n(BaseCollapse, { props: { summary: 'Test', disabled: true } });
    expect(wrapper.find('details').classes()).toContain('base-collapse--disabled');
  });

  it('renders default slot content', () => {
    const wrapper = mountWithI18n(BaseCollapse, {
      props: { summary: 'Test' },
      slots: { default: 'Slot content here' },
    });
    expect(wrapper.find('.base-collapse__content').text()).toContain('Slot content here');
  });
});
