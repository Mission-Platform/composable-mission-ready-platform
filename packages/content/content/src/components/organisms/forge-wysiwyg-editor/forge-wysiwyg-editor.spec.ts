import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { toHtml } from '../../../builders';
import { insertHtmlAtSelection, type WysiwygCommand } from '../../../utils/commands';

import { ForgeWysiwygEditor } from './forge-wysiwyg-editor';

import type { ContentDocument } from '../../../ast';
import type { MpElement } from '@mission-platform/forge-jsx';

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

describe('ForgeWysiwygEditor modern DOM formatting commands', () => {
  interface EditorHarness {
    surface: HTMLElement;
    execCommandSpy: ReturnType<typeof vi.fn>;
    onCommand: (command: WysiwygCommand) => void;
    onSelectBlock: (command: WysiwygCommand) => void;
    cleanup: () => void;
  }

  function createEditorHarness(
    initialHtml: string,
    properties: {
      onUpdateModelValue?: (document: ContentDocument) => void;
      onChange?: (document: ContentDocument) => void;
    } = {},
  ): EditorHarness {
    const surface = document.createElement('div');
    surface.contentEditable = 'true';
    surface.innerHTML = initialHtml;
    document.body.append(surface);

    const execCommandSpy = vi.fn();
    (document as unknown as { execCommand: unknown }).execCommand = execCommandSpy;

    const element = ForgeWysiwygEditor({
      onUpdateModelValue: properties.onUpdateModelValue,
      onChange: properties.onChange,
    });

    const children = element.children as MpElement[];
    const toolbar = children[0] as MpElement;
    const body = children[1] as MpElement;
    const surfaceChild = (body.children as MpElement[])[0] as MpElement;

    const surfaceReference = surfaceChild.properties.ref as { current: HTMLElement | undefined };
    surfaceReference.current = surface;

    const onCommand = toolbar.properties.onCommand as (command: WysiwygCommand) => void;
    const onSelectBlock = toolbar.properties.onSelectBlock as (command: WysiwygCommand) => void;

    return {
      surface,
      execCommandSpy,
      onCommand,
      onSelectBlock,
      cleanup: () => {
        surface.remove();
        delete (document as unknown as { execCommand?: unknown }).execCommand;
        globalThis.getSelection()?.removeAllRanges();
      },
    };
  }

  it('applies inline formatting commands (bold, italic) without calling execCommand', () => {
    const harness = createEditorHarness('<p>Hello world</p>');
    try {
      const textNode = harness.surface.querySelector('p')?.firstChild;
      expect(textNode).toBeDefined();
      expect(textNode).not.toBeNull();
      if (!textNode) {
        throw new Error('Expected textNode to exist');
      }

      const range = document.createRange();
      range.setStart(textNode, 6);
      range.setEnd(textNode, 11);
      const selection = globalThis.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      // 1. Apply bold
      harness.onCommand('bold');
      expect(harness.execCommandSpy).not.toHaveBeenCalled();
      expect(harness.surface.innerHTML).toBe('<p>Hello <strong>world</strong></p>');

      // 2. Apply italic onto the bold selection
      harness.onCommand('italic');
      expect(harness.execCommandSpy).not.toHaveBeenCalled();
      expect(harness.surface.innerHTML).toBe('<p>Hello <strong><em>world</em></strong></p>');

      // 3. Toggle bold off — leaves italic intact
      harness.onCommand('bold');
      expect(harness.execCommandSpy).not.toHaveBeenCalled();
      expect(harness.surface.innerHTML).toBe('<p>Hello <em>world</em></p>');
    } finally {
      harness.cleanup();
    }
  });

  it('applies block formatting commands (heading, list) without calling execCommand', () => {
    const harness = createEditorHarness('<p>Hello world</p>');
    try {
      const textNode = harness.surface.querySelector('p')?.firstChild;
      expect(textNode).toBeDefined();
      expect(textNode).not.toBeNull();
      if (!textNode) {
        throw new Error('Expected textNode to exist');
      }
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.collapse(true);
      const selection = globalThis.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      // 1. Convert paragraph to heading1
      harness.onSelectBlock('heading1');
      expect(harness.execCommandSpy).not.toHaveBeenCalled();
      expect(harness.surface.innerHTML).toBe('<h1>Hello world</h1>');

      // 2. Convert heading1 to bullet list
      harness.onCommand('bulletList');
      expect(harness.execCommandSpy).not.toHaveBeenCalled();
      expect(harness.surface.innerHTML).toBe('<ul><li>Hello world</li></ul>');

      // 3. Switch to numbered list
      harness.onCommand('numberedList');
      expect(harness.execCommandSpy).not.toHaveBeenCalled();
      expect(harness.surface.innerHTML).toBe('<ol><li>Hello world</li></ol>');

      // 4. Toggle list off back to paragraph
      harness.onCommand('numberedList');
      expect(harness.execCommandSpy).not.toHaveBeenCalled();
      expect(harness.surface.innerHTML).toBe('<p>Hello world</p>');
    } finally {
      harness.cleanup();
    }
  });

  it('fires onUpdateModelValue and onChange with updated document AST on command execution', () => {
    const onUpdateModelValue = vi.fn();
    const onChange = vi.fn();
    const harness = createEditorHarness('<p>Sample text</p>', { onUpdateModelValue, onChange });

    try {
      const textNode = harness.surface.querySelector('p')?.firstChild;
      expect(textNode).toBeDefined();
      expect(textNode).not.toBeNull();
      if (!textNode) {
        throw new Error('Expected textNode to exist');
      }
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 6);
      const selection = globalThis.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      harness.onCommand('bold');

      expect(onUpdateModelValue).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);

      const documentModel = onUpdateModelValue.mock.calls[0]?.[0] as ContentDocument;
      expect(documentModel).toBeDefined();
      expect(toHtml(documentModel)).toBe('<p><strong>Sample</strong> text</p>');
    } finally {
      harness.cleanup();
    }
  });

  it('modernizes insertHtmlAtSelection using createContextualFragment without calling execCommand', () => {
    const harness = createEditorHarness('<p>Start End</p>');
    try {
      const textNode = harness.surface.querySelector('p')?.firstChild;
      expect(textNode).toBeDefined();
      expect(textNode).not.toBeNull();
      if (!textNode) {
        throw new Error('Expected textNode to exist');
      }
      const range = document.createRange();
      range.setStart(textNode, 6);
      range.collapse(true);
      const selection = globalThis.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const inserted = insertHtmlAtSelection(document, '<span>Middle</span>');

      expect(inserted).toBe(true);
      expect(harness.execCommandSpy).not.toHaveBeenCalled();
      expect(harness.surface.innerHTML).toBe('<p>Start <span>Middle</span>End</p>');
    } finally {
      harness.cleanup();
    }
  });
});
