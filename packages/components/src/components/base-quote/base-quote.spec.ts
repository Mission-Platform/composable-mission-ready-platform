import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseQuote from './base-quote.vue';

describe('BaseQuote', () => {
  it('renders the quote text inside a <blockquote>', () => {
    const wrapper = mount(BaseQuote, { slots: { default: 'To be or not to be.' } });
    const blockquote = wrapper.find('blockquote');
    expect(blockquote.exists()).toBe(true);
    expect(blockquote.text()).toContain('To be or not to be.');
  });

  it('renders a <figure> root', () => {
    const wrapper = mount(BaseQuote);
    expect(wrapper.element.tagName).toBe('FIGURE');
  });

  it('applies default variant and size classes', () => {
    const wrapper = mount(BaseQuote);
    expect(wrapper.classes()).toContain('base-quote--default');
    expect(wrapper.classes()).toContain('base-quote--md');
  });

  it('applies variant class', () => {
    for (const variant of ['default', 'bordered', 'plain'] as const) {
      const wrapper = mount(BaseQuote, { props: { variant } });
      expect(wrapper.classes()).toContain(`base-quote--${variant}`);
    }
  });

  it('forwards the cite attribute to the blockquote', () => {
    const wrapper = mount(BaseQuote, { props: { cite: 'https://example.com' } });
    expect(wrapper.find('blockquote').attributes('cite')).toBe('https://example.com');
  });

  it('does not render a figcaption without attribution', () => {
    const wrapper = mount(BaseQuote, { slots: { default: 'Quote' } });
    expect(wrapper.find('figcaption').exists()).toBe(false);
  });

  it('renders author and source attribution', () => {
    const wrapper = mount(BaseQuote, {
      props: { author: 'Ada Lovelace', source: 'Notes' },
      slots: { default: 'Quote' },
    });
    const caption = wrapper.find('figcaption');
    expect(caption.exists()).toBe(true);
    expect(caption.text()).toContain('Ada Lovelace');
    expect(caption.text()).toContain('Notes');
  });

  it('renders a custom author slot', () => {
    const wrapper = mount(BaseQuote, {
      slots: { default: 'Quote', author: '<span class="custom">Custom</span>' },
    });
    expect(wrapper.find('figcaption .custom').exists()).toBe(true);
  });
});
