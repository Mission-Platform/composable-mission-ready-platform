import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseChatBubble } from './base-chat-bubble';

/**
 * Exercises the **neutral** `BaseChatBubble` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the `<li>` semantics, the meta line, and the message body.
 */
const ReactChatBubble = toReactComponent(BaseChatBubble, 'ChatBubble');
const VueChatBubble = toVueComponent(BaseChatBubble, 'ChatBubble');

describe('BaseChatBubble authors the same component for React and Vue', () => {
  it('renders an outgoing bubble with author, timestamp, and body on both frameworks', async () => {
    const properties = { side: 'end' as const, variant: 'primary' as const, author: 'Ada', timestamp: '12:30' };
    const react = renderToStaticMarkup(createElement(ReactChatBubble, properties, 'Hello there'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueChatBubble, properties, () => 'Hello there') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<li');
      expect(html).toContain('Ada');
      expect(html).toContain('12:30');
      expect(html).toContain('Hello there');
    }
  });

  it('renders an avatar when avatarAlt is provided on both frameworks', async () => {
    const properties = { author: 'Bob', avatarAlt: 'BO' };
    const react = renderToStaticMarkup(createElement(ReactChatBubble, properties, 'Hi'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueChatBubble, properties, () => 'Hi') }));

    for (const html of [react, vue]) {
      // The fallback BaseAvatar renders the initials.
      expect(html).toContain('BO');
      expect(html).toContain('Hi');
    }
  });
});
