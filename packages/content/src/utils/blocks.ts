/**
 * DOM helpers for the WYSIWYG editing surface: block-level manipulation (used by
 * the per-block controls overlay) and the non-editable code-block embeds.
 *
 * These are deliberate, small, guarded helpers so the editor component stays
 * declarative and the tricky `contenteditable` bookkeeping is pure and unit
 * testable in jsdom.
 */

/** The alignment a block can be given (mirrors the `align*` commands). */
export type WysiwygBlockAlign = 'alignLeft' | 'alignCenter' | 'alignRight' | 'alignJustify';

/** Attribute marking a non-editable code-block embed inside the surface. */
export const CODE_BLOCK_ATTRIBUTE = 'data-mp-code-block';

/** CSS selector matching every code-block embed host. */
export const CODE_BLOCK_SELECTOR = `[${CODE_BLOCK_ATTRIBUTE}]`;

/** A discovered code-block embed: its host element plus the code it renders. */
export interface CodeBlockEmbed {
  /** Stable render key for the framework list. */
  key: string;
  /** The (non-editable) host element the `ForgeCodeBlock` is portalled into. */
  host: HTMLElement;
  /** The source code to render. */
  code: string;
  /** The syntax language (defaults to `plaintext`). */
  language: string;
}

const ALIGN_TO_CSS: Readonly<Record<WysiwygBlockAlign, string>> = {
  alignLeft: 'left',
  alignCenter: 'center',
  alignRight: 'right',
  alignJustify: 'justify',
};

const CSS_TO_ALIGN: Readonly<Record<string, WysiwygBlockAlign>> = {
  left: 'alignLeft',
  center: 'alignCenter',
  right: 'alignRight',
  justify: 'alignJustify',
};

/**
 * Build the HTML for a non-editable code-block placeholder. The code + language
 * are stored (URL-encoded) in data attributes — the placeholder's own DOM is
 * left empty so the live `ForgeCodeBlock` can be portalled into it without ever
 * leaking into the serialized model value.
 */
export function createCodeBlockHtml(code: string, language = 'plaintext'): string {
  return (
    `<div ${CODE_BLOCK_ATTRIBUTE}="" data-mp-code="${encodeURIComponent(code)}" ` +
    `data-mp-language="${language}" contenteditable="false"></div>`
  );
}

/**
 * Serialize the editing surface to the HTML model value, **emptying** every
 * code-block embed first so the portalled `ForgeCodeBlock` markup (and transient
 * bookkeeping attributes) never appear in the persisted value — only the stable
 * `data-mp-code`/`data-mp-language` placeholder is kept.
 */
export function serializeSurface(host: HTMLElement): string {
  const clone = host.cloneNode(true) as HTMLElement;
  for (const embed of clone.querySelectorAll<HTMLElement>(CODE_BLOCK_SELECTOR)) {
    embed.innerHTML = '';
    delete embed.dataset.mpKey;
  }
  return clone.innerHTML;
}

/**
 * Discover every code-block embed inside the surface, assigning each a stable
 * `data-mp-key` (via `allocateKey`) the first time it is seen so framework list
 * keys stay stable across re-renders.
 */
export function scanCodeBlocks(host: HTMLElement, allocateKey: () => string): CodeBlockEmbed[] {
  const embeds = [...host.querySelectorAll<HTMLElement>(CODE_BLOCK_SELECTOR)];
  return embeds.map((element) => {
    let key = element.dataset.mpKey;
    if (key === undefined || key.length === 0) {
      key = allocateKey();
      element.dataset.mpKey = key;
    }
    return {
      key,
      host: element,
      code: decodeURIComponent(element.dataset.mpCode ?? ''),
      language: element.dataset.mpLanguage ?? 'plaintext',
    };
  });
}

/**
 * Resolve the top-level block element (a direct child of the surface) that
 * contains `node`, or `undefined` when there is none.
 */
export function topLevelBlockFor(surface: HTMLElement, node: Node | null | undefined): HTMLElement | undefined {
  let current: Node | null | undefined = node;
  while (current !== null && current !== undefined && current !== surface) {
    if (current.parentNode === surface && current.nodeType === Node.ELEMENT_NODE) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  return undefined;
}

/**
 * Move a top-level block up or down one position among its siblings. Returns
 * whether the block actually moved.
 */
export function moveBlock(surface: HTMLElement, block: HTMLElement, direction: 'up' | 'down'): boolean {
  if (block.parentElement !== surface) {
    return false;
  }
  if (direction === 'up') {
    const previous = block.previousElementSibling;
    if (previous === null) {
      return false;
    }
    previous.before(block);
    return true;
  }
  const next = block.nextElementSibling;
  if (next === null) {
    return false;
  }
  block.before(next);
  return true;
}

/** Apply a text alignment to a block element. */
export function applyBlockAlign(block: HTMLElement, align: WysiwygBlockAlign): void {
  block.style.textAlign = ALIGN_TO_CSS[align];
}

/** Read the current alignment of a block element, if any. */
export function readBlockAlign(block: HTMLElement): WysiwygBlockAlign | undefined {
  return CSS_TO_ALIGN[block.style.textAlign];
}
