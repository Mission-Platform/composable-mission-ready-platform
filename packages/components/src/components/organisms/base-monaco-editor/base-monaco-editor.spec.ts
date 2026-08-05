import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseMonacoEditor } from './base-monaco-editor';

/**
 * Exercises the **neutral** `BaseMonacoEditor` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge` adapters.
 * Monaco mounts imperatively on the client via a dynamic `import('monaco-editor')`,
 * so the SSR markup is the empty host `<div>` (with its height + language) —
 * which is exactly what keeps the component SSG-safe.
 */
const ReactMonacoEditor = toReactComponent(BaseMonacoEditor, 'MonacoEditor');
const VueMonacoEditor = toVueComponent(BaseMonacoEditor, 'MonacoEditor');

describe('BaseMonacoEditor authors the same component for React and Vue', () => {
  it('renders the sized editor host on both frameworks', async () => {
    const properties = { modelValue: 'const x = 1;', language: 'typescript', height: '420px' };
    const react = renderToStaticMarkup(createElement(ReactMonacoEditor, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMonacoEditor, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Code editor"');
      expect(html).toContain('data-language="typescript"');
      expect(html).toContain('420px');
    }
  });

  it('does not pull monaco-editor into the SSR module graph', async () => {
    // The component is rendered to a static host only; `monaco-editor` is loaded
    // lazily inside the client mount effect, so no editor markup is present.
    const react = renderToStaticMarkup(createElement(ReactMonacoEditor, { modelValue: '' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMonacoEditor, { modelValue: '' }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('data-language="plaintext"');
      expect(html).not.toContain('monaco-editor-background');
    }
  });
});
