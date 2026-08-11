import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeWysiwygStatusBar } from './forge-wysiwyg-status-bar';

const ReactStatusBar = toReactComponent(ForgeWysiwygStatusBar, 'WysiwygStatusBar');
const VueStatusBar = toVueComponent(ForgeWysiwygStatusBar, 'WysiwygStatusBar');

async function renderBoth(properties: Record<string, unknown>): Promise<{ react: string; vue: string }> {
  const react = renderToStaticMarkup(createElement(ReactStatusBar, properties));
  const vue = await renderToString(createSSRApp({ render: () => vueH(VueStatusBar, properties) }));
  return { react, vue };
}

describe('ForgeWysiwygStatusBar authors the same component for React and Vue', () => {
  it('renders the default word/character segments from the stats', async () => {
    const { react, vue } = await renderBoth({ stats: { words: 12, characters: 56, charactersNoSpaces: 48 } });

    for (const html of [react, vue]) {
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Editor status"');
      expect(html).toContain('12 words');
      expect(html).toContain('56 characters');
    }
  });

  it('replaces the built-in segments with custom items', async () => {
    const { react, vue } = await renderBoth({
      items: [
        { id: 'reading-time', label: 'min read', value: 3 },
        { id: 'saved', label: 'All changes saved' },
      ],
    });

    for (const html of [react, vue]) {
      expect(html).toContain('3 min read');
      expect(html).toContain('All changes saved');
      expect(html).not.toContain('words');
    }
  });
});
