import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseTabs from './base-tabs.vue';

import type { TabItem } from './base-tabs.vue';

const tabs: TabItem[] = [
  { id: 'a', label: 'Tab A' },
  { id: 'b', label: 'Tab B' },
  { id: 'c', label: 'Tab C', disabled: true },
];

describe('BaseTabs', () => {
  it('renders a tablist', () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs } });
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true);
  });

  it('renders correct number of tabs', () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs } });
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(3);
  });

  it('sets first tab as active by default', () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs } });
    const firstTab = wrapper.findAll('[role="tab"]')[0];
    expect(firstTab.attributes('aria-selected')).toBe('true');
  });

  it('sets modelValue tab as active when provided', () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs, modelValue: 'b' } });
    const tabs_els = wrapper.findAll('[role="tab"]');
    expect(tabs_els[1].attributes('aria-selected')).toBe('true');
  });

  it('emits update:modelValue when tab clicked', async () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs } });
    await wrapper.findAll('[role="tab"]')[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['b']);
  });

  it('does not emit when disabled tab clicked', async () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs } });
    await wrapper.findAll('[role="tab"]')[2].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });

  it('renders tabpanels', () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs } });
    expect(wrapper.findAll('[role="tabpanel"]')).toHaveLength(3);
  });

  it('hides non-active panels', () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs } });
    const panels = wrapper.findAll('[role="tabpanel"]');
    expect(panels[1].attributes('hidden')).toBeDefined();
  });

  it('applies pill variant class', () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs, variant: 'pill' } });
    expect(wrapper.find('.base-tabs').classes()).toContain('base-tabs--pill');
  });
});

// ─── closable ────────────────────────────────────────────────────────────────

describe('closable', () => {
  it('does not render close buttons by default', () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs } });
    expect(wrapper.findAll('.base-tabs__close')).toHaveLength(0);
  });

  it('renders a close button for every tab when closable is true', () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs, closable: true } });
    expect(wrapper.findAll('.base-tabs__close')).toHaveLength(tabs.length);
  });

  it('emits close with the correct tab id when close button is clicked', async () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs, closable: true } });
    await wrapper.findAll('.base-tabs__close')[1].trigger('click');
    expect(wrapper.emitted('close')?.[0]).toEqual(['b']);
  });

  it('does not emit select when close button is clicked', async () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs, closable: true } });
    await wrapper.findAll('.base-tabs__close')[0].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });
});

// ─── addable ─────────────────────────────────────────────────────────────────

describe('addable', () => {
  it('does not render the add button by default', () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs } });
    expect(wrapper.find('.base-tabs__add').exists()).toBe(false);
  });

  it('renders the add button when addable is true', () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs, addable: true } });
    expect(wrapper.find('.base-tabs__add').exists()).toBe(true);
  });

  it('emits add when the add button is clicked', async () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs, addable: true } });
    await wrapper.find('.base-tabs__add').trigger('click');
    expect(wrapper.emitted('add')).toBeTruthy();
  });
});

// ─── rename ──────────────────────────────────────────────────────────────────

describe('rename', () => {
  it('emits rename with the correct tab id on dblclick', async () => {
    const wrapper = mountWithI18n(BaseTabs, { props: { tabs } });
    await wrapper.findAll('[role="tab"]')[0].trigger('dblclick');
    expect(wrapper.emitted('rename')?.[0]).toEqual(['a']);
  });
});
