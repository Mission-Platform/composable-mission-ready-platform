import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeWysiwygEditor } from './forge-wysiwyg-editor';

/**
 * Exercises the **neutral** `ForgeWysiwygEditor` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge-jsx` adapters.
 * The contenteditable content is written imperatively in a client mount effect,
 * so the SSR markup is the empty surface plus its toolbar and status bar — which
 * keeps the component SSG-safe.
 */
const ReactWysiwygEditor = toReactComponent(ForgeWysiwygEditor, 'WysiwygEditor');
const VueWysiwygEditor = toVueComponent(ForgeWysiwygEditor, 'WysiwygEditor');

async function renderBoth(properties: Record<string, unknown>): Promise<{ react: string; vue: string }> {
  const react = renderToStaticMarkup(createElement(ReactWysiwygEditor, properties));
  const vue = await renderToString(createSSRApp({ render: () => vueH(VueWysiwygEditor, properties) }));
  return { react, vue };
}

describe('ForgeWysiwygEditor authors the same component for React and Vue', () => {
  it('renders the toolbar, editing surface, and status bar on both frameworks', async () => {
    const { react, vue } = await renderBoth({ placeholder: 'Write something…' });

    for (const html of [react, vue]) {
      // Toolbar region with its accessible name and the format controls.
      expect(html).toContain('role="toolbar"');
      expect(html).toContain('aria-label="Formatting"');
      // The block-style dropdown (headings/paragraph/quote/monospace) and its
      // current-format trigger, plus the code-block insert control.
      expect(html).toContain('aria-label="Block format"');
      expect(html).toContain('Paragraph');
      expect(html).toContain('aria-label="Code block"');
      // Editing surface (contenteditable is applied imperatively on the client).
      expect(html).toContain('role="textbox"');
      expect(html).toContain('aria-label="Rich text editor"');
      expect(html).toContain('data-placeholder="Write something');
      // Live status bar (its own component).
      expect(html).toContain('role="status"');
      expect(html).toContain('words');
      expect(html).toContain('characters');
    }
  });

  it('hides the toolbar but keeps the editing surface when readonly', async () => {
    const { react, vue } = await renderBoth({ readonly: true });

    for (const html of [react, vue]) {
      expect(html).not.toContain('role="toolbar"');
      expect(html).toContain('role="textbox"');
    }
  });

  it('honours overridden labels', async () => {
    const { react, vue } = await renderBoth({ labels: { toolbar: 'Mise en forme', editor: 'Éditeur' } });

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Mise en forme"');
      expect(html).toContain('aria-label="Éditeur"');
    }
  });

  // Regression guard for the "opening the code editor freezes the browser" bug:
  // the code-block dialog embeds a heavy `ForgeMonacoEditor`. It must be mounted
  // **only when opened**, never on every render — otherwise Monaco loads at
  // editor mount (and is re-patched on each keystroke), which locks the tab up
  // in a real browser. Because the code dialog is closed by default, it must be
  // absent from the initial markup even though its toolbar trigger is present.
  it('does not mount the code-block dialog until it is opened', async () => {
    const { react, vue } = await renderBoth({});

    for (const html of [react, vue]) {
      // The toolbar control that opens the dialog is always available…
      expect(html).toContain('aria-label="Code block"');
      // …but the Monaco-backed dialog itself must not be in the DOM yet.
      expect(html).not.toContain('Insert code block');
      expect(html).not.toContain('<dialog');
    }
  });
});
