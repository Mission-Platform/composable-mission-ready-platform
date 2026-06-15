import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseChatArea from './base-chat-area.vue';

describe('BaseChatArea', () => {
  it('renders a polite log region containing a semantic list', () => {
    const wrapper = mountWithI18n(BaseChatArea, { slots: { default: '<li class="msg" />' } });
    const log = wrapper.find('.base-chat-area__log');
    expect(log.attributes('role')).toBe('log');
    expect(log.attributes('aria-live')).toBe('polite');
    expect(wrapper.find('.base-chat-area__messages').element.tagName).toBe('UL');
    expect(wrapper.find('.msg').exists()).toBe(true);
  });

  it('renders the header slot only when provided', () => {
    const without = mountWithI18n(BaseChatArea);
    expect(without.find('.base-chat-area__header').exists()).toBe(false);

    const withHeader = mountWithI18n(BaseChatArea, { slots: { header: '<h2 class="title">Chat</h2>' } });
    expect(withHeader.find('.base-chat-area__header .title').exists()).toBe(true);
  });

  it('renders the footer slot only when provided', () => {
    const without = mountWithI18n(BaseChatArea);
    expect(without.find('.base-chat-area__footer').exists()).toBe(false);

    const withFooter = mountWithI18n(BaseChatArea, { slots: { footer: '<form class="composer" />' } });
    expect(withFooter.find('.base-chat-area__footer .composer').exists()).toBe(true);
  });

  it('applies the accessible label to the log region', () => {
    const wrapper = mountWithI18n(BaseChatArea, { props: { ariaLabel: 'Support conversation' } });
    expect(wrapper.find('.base-chat-area__log').attributes('aria-label')).toBe('Support conversation');
  });

  it('exposes a scrollToBottom method', () => {
    const wrapper = mountWithI18n(BaseChatArea, { attachTo: document.body });
    expect(typeof (wrapper.vm as unknown as { scrollToBottom: () => void }).scrollToBottom).toBe('function');
    expect(() => (wrapper.vm as unknown as { scrollToBottom: () => void }).scrollToBottom()).not.toThrow();
    wrapper.unmount();
  });
});
