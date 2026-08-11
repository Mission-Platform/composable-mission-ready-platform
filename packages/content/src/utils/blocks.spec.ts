import { beforeEach, describe, expect, it } from 'vitest';

import {
  applyBlockAlign,
  createCodeBlockHtml,
  moveBlock,
  readBlockAlign,
  scanCodeBlocks,
  serializeSurface,
  topLevelBlockFor,
} from './blocks';

/** Build a detached `contenteditable` surface from an HTML string. */
function makeSurface(html: string): HTMLElement {
  const surface = document.createElement('div');
  surface.innerHTML = html;
  return surface;
}

describe('createCodeBlockHtml', () => {
  it('URL-encodes the code and marks the placeholder non-editable', () => {
    const html = createCodeBlockHtml('const a = 1;\n"x" < y', 'typescript');
    const host = makeSurface(html).firstElementChild as HTMLElement;
    expect(Object.hasOwn(host.dataset, 'mpCodeBlock')).toBe(true);
    expect(host.getAttribute('contenteditable')).toBe('false');
    expect(host.dataset.mpLanguage).toBe('typescript');
    expect(decodeURIComponent(host.dataset.mpCode ?? '')).toBe('const a = 1;\n"x" < y');
  });

  it('defaults the language to plaintext', () => {
    const host = makeSurface(createCodeBlockHtml('x')).firstElementChild as HTMLElement;
    expect(host.dataset.mpLanguage).toBe('plaintext');
  });
});

describe('serializeSurface', () => {
  it('empties portalled code-block markup and strips transient keys', () => {
    const surface = makeSurface(`<p>hi</p>${createCodeBlockHtml('const a = 1;', 'typescript')}`);
    const embed = surface.querySelector('[data-mp-code-block]') as HTMLElement;
    // Simulate the portalled ForgeCodeBlock DOM + the transient render key.
    embed.dataset.mpKey = 'cb-0';
    embed.innerHTML = '<pre><code>const a = 1;</code></pre>';

    const serialized = serializeSurface(surface);
    expect(serialized).toContain('<p>hi</p>');
    expect(serialized).toContain('data-mp-code-block');
    expect(serialized).not.toContain('data-mp-key');
    expect(serialized).not.toContain('<pre>');
    // The (empty) placeholder retains the source of truth.
    const roundTripped = makeSurface(serialized).querySelector('[data-mp-code-block]') as HTMLElement;
    expect(decodeURIComponent(roundTripped.dataset.mpCode ?? '')).toBe('const a = 1;');
  });
});

describe('scanCodeBlocks', () => {
  it('discovers embeds, allocates stable keys, and decodes the code', () => {
    const surface = makeSurface(`${createCodeBlockHtml('one', 'json')}${createCodeBlockHtml('two')}`);
    let counter = 0;
    const allocate = (): string => `cb-${counter++}`;

    const first = scanCodeBlocks(surface, allocate);
    expect(first).toHaveLength(2);
    expect(first[0]).toMatchObject({ key: 'cb-0', code: 'one', language: 'json' });
    expect(first[1]).toMatchObject({ key: 'cb-1', code: 'two', language: 'plaintext' });

    // A re-scan reuses the already-assigned keys (no new allocations).
    const second = scanCodeBlocks(surface, allocate);
    expect(second.map((block) => block.key)).toEqual(['cb-0', 'cb-1']);
    expect(counter).toBe(2);
  });
});

describe('topLevelBlockFor', () => {
  it('resolves the direct child of the surface that contains a node', () => {
    const surface = makeSurface('<p>outer<strong>inner</strong></p><h2>next</h2>');
    const inner = surface.querySelector('strong')?.firstChild;
    const block = topLevelBlockFor(surface, inner);
    expect(block?.tagName).toBe('P');
  });

  it('returns undefined for a node outside the surface', () => {
    const surface = makeSurface('<p>a</p>');
    expect(topLevelBlockFor(surface, document.createElement('div'))).toBeUndefined();
  });
});

describe('moveBlock', () => {
  let surface: HTMLElement;

  beforeEach(() => {
    surface = makeSurface('<p id="a">a</p><p id="b">b</p><p id="c">c</p>');
  });

  it('moves a block up and reports success', () => {
    const b = surface.querySelector('#b') as HTMLElement;
    expect(moveBlock(surface, b, 'up')).toBe(true);
    expect([...surface.children].map((element) => element.id)).toEqual(['b', 'a', 'c']);
  });

  it('moves a block down and reports success', () => {
    const b = surface.querySelector('#b') as HTMLElement;
    expect(moveBlock(surface, b, 'down')).toBe(true);
    expect([...surface.children].map((element) => element.id)).toEqual(['a', 'c', 'b']);
  });

  it('is a no-op at the boundaries', () => {
    const a = surface.querySelector('#a') as HTMLElement;
    const c = surface.querySelector('#c') as HTMLElement;
    expect(moveBlock(surface, a, 'up')).toBe(false);
    expect(moveBlock(surface, c, 'down')).toBe(false);
    expect([...surface.children].map((element) => element.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('applyBlockAlign / readBlockAlign', () => {
  it('applies and reads back each alignment', () => {
    const block = document.createElement('p');
    expect(readBlockAlign(block)).toBeUndefined();

    applyBlockAlign(block, 'alignCenter');
    expect(block.style.textAlign).toBe('center');
    expect(readBlockAlign(block)).toBe('alignCenter');

    applyBlockAlign(block, 'alignJustify');
    expect(readBlockAlign(block)).toBe('alignJustify');
  });
});
