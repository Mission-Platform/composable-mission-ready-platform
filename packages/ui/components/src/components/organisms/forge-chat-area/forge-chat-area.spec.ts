import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeChatArea } from './forge-chat-area';

/**
 * Exercises the **neutral** `ForgeChatArea` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the live-region log, the message list, and the header/footer slots.
 */
const ReactChatArea = toReactComponent(ForgeChatArea, 'ChatArea');
const VueChatArea = toVueComponent(ForgeChatArea, 'ChatArea');

describe('ForgeChatArea authors the same component for React and Vue', () => {
  it('renders the live-region log wrapping a message list on both frameworks', async () => {
    const properties = { ariaLabel: 'Conversation', children: 'Hello there' };
    const react = renderToStaticMarkup(createElement(ReactChatArea, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueChatArea, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="log"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('aria-label="Conversation"');
      expect(html).toContain('forge-chat-area__messages');
      expect(html).toContain('Hello there');
    }
  });

  it('renders the header and footer slots when provided on both frameworks', async () => {
    const properties = { header: 'Support chat', footer: 'Type a message…', children: 'Body' };
    const react = renderToStaticMarkup(createElement(ReactChatArea, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueChatArea, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-chat-area__header');
      expect(html).toContain('Support chat');
      expect(html).toContain('forge-chat-area__footer');
      expect(html).toContain('Type a message…');
    }
  });
});
