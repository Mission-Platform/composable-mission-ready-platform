import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseVirtualTabs from './BaseVirtualTabs.vue';

import type { TabItem } from '../BaseTabs';

const tabs: TabItem[] = [
  { id: 'a', label: 'Tab A' },
  { id: 'b', label: 'Tab B' },
  { id: 'c', label: 'Tab C', disabled: true },
];

// ─── rendering ───────────────────────────────────────────────────────────────

describe('BaseVirtualTabs', () => {
  it('renders a tablist', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs } });
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true);
  });

  it('renders the correct number of tab buttons', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs } });
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(3);
  });

  it('sets the first tab as active by default', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs } });
    expect(wrapper.findAll('[role="tab"]')[0].attributes('aria-selected')).toBe('true');
  });

  it('sets modelValue tab as active when provided', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs, modelValue: 'b' } });
    expect(wrapper.findAll('[role="tab"]')[1].attributes('aria-selected')).toBe('true');
  });

  it('applies the pill variant class', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs, variant: 'pill' } });
    expect(wrapper.find('.base-virtual-tabs').classes()).toContain('base-virtual-tabs--pill');
  });
});

// ─── virtual rendering (only active panel mounted) ────────────────────────────

describe('virtual panel rendering', () => {
  it('renders exactly one tabpanel at a time', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs } });
    expect(wrapper.findAll('[role="tabpanel"]')).toHaveLength(1);
  });

  it('renders the panel for the default (first) active tab', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, {
      props: { tabs },
      slots: { a: '<p class="content-a">Content A</p>' },
    });
    expect(wrapper.find('.content-a').exists()).toBe(true);
  });

  it('does not mount inactive tab panels', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, {
      props: { tabs },
      slots: {
        a: '<p class="content-a">Content A</p>',
        b: '<p class="content-b">Content B</p>',
      },
    });
    expect(wrapper.find('.content-a').exists()).toBe(true);
    expect(wrapper.find('.content-b').exists()).toBe(false);
  });

  it('swaps to the new panel and unmounts the old one when a tab is clicked', async () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, {
      props: { tabs },
      slots: {
        a: '<p class="content-a">Content A</p>',
        b: '<p class="content-b">Content B</p>',
      },
    });

    await wrapper.findAll('[role="tab"]')[1].trigger('click');

    expect(wrapper.find('.content-b').exists()).toBe(true);
    expect(wrapper.find('.content-a').exists()).toBe(false);
  });

  it('renders the panel for modelValue tab when provided', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, {
      props: { tabs, modelValue: 'b' },
      slots: {
        a: '<p class="content-a">Content A</p>',
        b: '<p class="content-b">Content B</p>',
      },
    });
    expect(wrapper.find('.content-b').exists()).toBe(true);
    expect(wrapper.find('.content-a').exists()).toBe(false);
  });

  it('panel has the correct id and aria-labelledby attributes', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs } });
    const panel = wrapper.find('[role="tabpanel"]');
    expect(panel.attributes('id')).toBe('panel-a');
    expect(panel.attributes('aria-labelledby')).toBe('tab-a');
  });
});

// ─── tab selection ────────────────────────────────────────────────────────────

describe('tab selection', () => {
  it('emits update:modelValue when a tab is clicked', async () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs } });
    await wrapper.findAll('[role="tab"]')[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['b']);
  });

  it('emits change when a tab is clicked', async () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs } });
    await wrapper.findAll('[role="tab"]')[1].trigger('click');
    expect(wrapper.emitted('change')?.[0]).toEqual(['b']);
  });

  it('does not emit when a disabled tab is clicked', async () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs } });
    await wrapper.findAll('[role="tab"]')[2].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });
});

// ─── closable ─────────────────────────────────────────────────────────────────

describe('closable', () => {
  it('does not render close buttons by default', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs } });
    expect(wrapper.findAll('.base-tabs__close')).toHaveLength(0);
  });

  it('renders a close button for every tab when closable is true', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs, closable: true } });
    expect(wrapper.findAll('.base-tabs__close')).toHaveLength(tabs.length);
  });

  it('emits close with the correct tab id when the close button is clicked', async () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs, closable: true } });
    await wrapper.findAll('.base-tabs__close')[1].trigger('click');
    expect(wrapper.emitted('close')?.[0]).toEqual(['b']);
  });

  it('does not emit select (update:modelValue) when a close button is clicked', async () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs, closable: true } });
    await wrapper.findAll('.base-tabs__close')[0].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });
});

// ─── addable ──────────────────────────────────────────────────────────────────

describe('addable', () => {
  it('does not render the add button by default', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs } });
    expect(wrapper.find('.base-tabs__add').exists()).toBe(false);
  });

  it('renders the add button when addable is true', () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs, addable: true } });
    expect(wrapper.find('.base-tabs__add').exists()).toBe(true);
  });

  it('emits add when the add button is clicked', async () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs, addable: true } });
    await wrapper.find('.base-tabs__add').trigger('click');
    expect(wrapper.emitted('add')).toBeTruthy();
  });

  it('emits add exactly once per click', async () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs, addable: true } });
    await wrapper.find('.base-tabs__add').trigger('click');
    await wrapper.find('.base-tabs__add').trigger('click');
    expect(wrapper.emitted('add')).toHaveLength(2);
  });
});

// ─── rename ───────────────────────────────────────────────────────────────────

describe('rename', () => {
  it('emits rename with the correct tab id on dblclick', async () => {
    const wrapper = mountWithI18n(BaseVirtualTabs, { props: { tabs } });
    await wrapper.findAll('[role="tab"]')[0].trigger('dblclick');
    expect(wrapper.emitted('rename')?.[0]).toEqual(['a']);
  });
});
