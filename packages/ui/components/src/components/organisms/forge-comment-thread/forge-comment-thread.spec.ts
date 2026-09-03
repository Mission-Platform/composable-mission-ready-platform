import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeCommentThread } from './forge-comment-thread';

const ReactCommentThread = toReactComponent(ForgeCommentThread, 'CommentThread');
const VueCommentThread = toVueComponent(ForgeCommentThread, 'CommentThread');
const comments = [
  {
    id: '1',
    author: 'Morgan',
    body: 'Please review this.',
    timestamp: '2026-08-24',
    replies: [{ id: '1-1', author: 'Taylor', body: 'Done.', timestamp: '2026-08-24' }],
  },
];

describe('ForgeCommentThread', () => {
  it('renders comments and a labelled reply form on both frameworks', async () => {
    const properties = { comments, currentUser: 'Morgan', maxDepth: 1 };
    const react = renderToStaticMarkup(createElement(ReactCommentThread, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCommentThread, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Comments"');
      expect(html).toContain('Morgan');
      expect(html).toContain('Please review this.');
      expect(html).toContain('Taylor');
      expect(html).toContain('aria-label="Add a comment"');
      expect(html).toContain('Post comment');
    }
  });

  it('does not render replies deeper than maxDepth', () => {
    const html = renderToStaticMarkup(createElement(ReactCommentThread, { comments, maxDepth: 0 }));
    expect(html).not.toContain('Done.');
  });
});
