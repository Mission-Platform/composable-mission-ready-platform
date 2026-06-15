import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseChatBubble from './base-chat-bubble.vue';

describe('BaseChatBubble', () => {
  it('renders the message body inside a semantic list item', () => {
    const wrapper = mountWithI18n(BaseChatBubble, { slots: { default: 'Hello there' } });
    const root = wrapper.find('.base-chat-bubble');
    expect(root.element.tagName).toBe('LI');
    expect(wrapper.find('.base-chat-bubble__body').text()).toBe('Hello there');
  });

  it('defaults to the start side and default variant', () => {
    const wrapper = mountWithI18n(BaseChatBubble);
    expect(wrapper.find('.base-chat-bubble--start').exists()).toBe(true);
    expect(wrapper.find('.base-chat-bubble--default').exists()).toBe(true);
  });

  it('applies the end side and primary variant', () => {
    const wrapper = mountWithI18n(BaseChatBubble, { props: { side: 'end', variant: 'primary' } });
    expect(wrapper.find('.base-chat-bubble--end').exists()).toBe(true);
    expect(wrapper.find('.base-chat-bubble--primary').exists()).toBe(true);
  });

  it('renders the author and timestamp meta line', () => {
    const wrapper = mountWithI18n(BaseChatBubble, { props: { author: 'Ada', timestamp: '10:30' } });
    const meta = wrapper.find('.base-chat-bubble__meta');
    expect(meta.exists()).toBe(true);
    expect(meta.text()).toContain('Ada');
    expect(meta.text()).toContain('10:30');
  });

  it('omits the meta line when neither author nor timestamp is set', () => {
    const wrapper = mountWithI18n(BaseChatBubble, { slots: { default: 'x' } });
    expect(wrapper.find('.base-chat-bubble__meta').exists()).toBe(false);
  });

  it('renders an avatar when an avatar source is provided', () => {
    const wrapper = mountWithI18n(BaseChatBubble, { props: { avatar: '/a.png', avatarAlt: 'Ada' } });
    expect(wrapper.find('.base-chat-bubble__avatar').exists()).toBe(true);
  });

  it('omits the avatar wrapper when no avatar is provided', () => {
    const wrapper = mountWithI18n(BaseChatBubble);
    expect(wrapper.find('.base-chat-bubble__avatar').exists()).toBe(false);
  });

  it('applies the pending modifier', () => {
    const wrapper = mountWithI18n(BaseChatBubble, { props: { pending: true } });
    expect(wrapper.find('.base-chat-bubble--pending').exists()).toBe(true);
  });

  it('renders the footer slot when provided', () => {
    const wrapper = mountWithI18n(BaseChatBubble, { slots: { footer: '<span class="reactions" />' } });
    expect(wrapper.find('.base-chat-bubble__footer .reactions').exists()).toBe(true);
  });
});
