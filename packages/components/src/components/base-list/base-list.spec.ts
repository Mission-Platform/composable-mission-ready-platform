import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseList from './base-list.vue';

const items = [{ label: 'First' }, { label: 'Second' }, { label: 'Third' }];

describe('BaseList', () => {
  it('renders a ul by default', () => {
    const wrapper = mountWithI18n(BaseList, { props: { items } });
    expect(wrapper.find('ul').exists()).toBe(true);
  });

  it('renders an ol for ordered variant', () => {
    const wrapper = mountWithI18n(BaseList, { props: { items, variant: 'ordered' } });
    expect(wrapper.find('ol').exists()).toBe(true);
  });

  it('renders a dl for description variant', () => {
    const descItems = [{ term: 'Key', content: 'Value' }];
    const wrapper = mountWithI18n(BaseList, { props: { items: descItems, variant: 'description' } });
    expect(wrapper.find('dl').exists()).toBe(true);
    expect(wrapper.find('dt').text()).toBe('Key');
    expect(wrapper.find('dd').text()).toBe('Value');
  });

  it('renders all items', () => {
    const wrapper = mountWithI18n(BaseList, { props: { items } });
    expect(wrapper.findAll('li')).toHaveLength(3);
  });

  it('applies divided class when divided', () => {
    const wrapper = mountWithI18n(BaseList, { props: { items, divided: true } });
    expect(wrapper.find('ul').classes()).toContain('base-list--divided');
  });

  it('uses no list-style for none variant', () => {
    const wrapper = mountWithI18n(BaseList, { props: { items, variant: 'none' } });
    expect(wrapper.find('ul').classes()).toContain('base-list--none');
  });
});
