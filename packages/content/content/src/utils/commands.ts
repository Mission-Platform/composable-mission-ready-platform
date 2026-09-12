/**
 * Framework-neutral rich-text command layer for the WYSIWYG editor.
 *
 * The editor's editing surface is a native `contenteditable` region, so the
 * actual formatting is delegated to the browser's built-in editing commands
 * (`document.execCommand`). This module keeps that mapping **pure and testable**:
 * it describes every supported command as data, exposes a pure translation to
 * the underlying `execCommand` name + argument, and wraps the imperative calls
 * in small guarded helpers that degrade gracefully in non-browser / unsupported
 * environments (so SSR and unit tests never throw).
 */

import { topLevelBlockFor } from './blocks';

/** Every rich-text command the editor toolbar can invoke. */
export type WysiwygCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'bulletList'
  | 'numberedList'
  | 'blockquote'
  | 'monospace'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'paragraph'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignJustify'
  | 'link'
  | 'unlink'
  | 'image'
  | 'undo'
  | 'redo'
  | 'clearFormatting';

/** The argument a command expects from the caller (a prompt value), if any. */
export type WysiwygCommandArgument = 'none' | 'url' | 'image';

/** A pure description of a rich-text command. */
export interface WysiwygCommandDescriptor {
  /** The `document.execCommand` name this command maps to. */
  readonly execCommand: string;
  /** A fixed `execCommand` argument (e.g. the block tag for `formatBlock`), if any. */
  readonly fixedValue?: string;
  /** The argument the command must be supplied with by the caller. */
  readonly argument: WysiwygCommandArgument;
}

/** The canonical, framework-neutral command table. */
export const WYSIWYG_COMMANDS: Readonly<Record<WysiwygCommand, WysiwygCommandDescriptor>> = {
  bold: { execCommand: 'bold', argument: 'none' },
  italic: { execCommand: 'italic', argument: 'none' },
  underline: { execCommand: 'underline', argument: 'none' },
  strikethrough: { execCommand: 'strikeThrough', argument: 'none' },
  bulletList: { execCommand: 'insertUnorderedList', argument: 'none' },
  numberedList: { execCommand: 'insertOrderedList', argument: 'none' },
  blockquote: { execCommand: 'formatBlock', fixedValue: 'blockquote', argument: 'none' },
  monospace: { execCommand: 'formatBlock', fixedValue: 'pre', argument: 'none' },
  heading1: { execCommand: 'formatBlock', fixedValue: 'h1', argument: 'none' },
  heading2: { execCommand: 'formatBlock', fixedValue: 'h2', argument: 'none' },
  heading3: { execCommand: 'formatBlock', fixedValue: 'h3', argument: 'none' },
  heading4: { execCommand: 'formatBlock', fixedValue: 'h4', argument: 'none' },
  heading5: { execCommand: 'formatBlock', fixedValue: 'h5', argument: 'none' },
  heading6: { execCommand: 'formatBlock', fixedValue: 'h6', argument: 'none' },
  paragraph: { execCommand: 'formatBlock', fixedValue: 'p', argument: 'none' },
  alignLeft: { execCommand: 'justifyLeft', argument: 'none' },
  alignCenter: { execCommand: 'justifyCenter', argument: 'none' },
  alignRight: { execCommand: 'justifyRight', argument: 'none' },
  alignJustify: { execCommand: 'justifyFull', argument: 'none' },
  link: { execCommand: 'createLink', argument: 'url' },
  unlink: { execCommand: 'unlink', argument: 'none' },
  image: { execCommand: 'insertImage', argument: 'image' },
  undo: { execCommand: 'undo', argument: 'none' },
  redo: { execCommand: 'redo', argument: 'none' },
  clearFormatting: { execCommand: 'removeFormat', argument: 'none' },
} as const;

/** The resolved `execCommand` invocation for a command (pure). */
export interface ResolvedExecCommand {
  /** The `document.execCommand` name. */
  readonly command: string;
  /** The resolved argument value (a `formatBlock` tag needs `<>` wrapping), if any. */
  readonly value?: string;
}

/**
 * Translate a high-level {@link WysiwygCommand} (plus an optional caller-supplied
 * value for `url`/`image` commands) into the concrete `execCommand` name and
 * argument — a **pure** function with no DOM access.
 */
export function resolveExecCommand(command: WysiwygCommand, value?: string): ResolvedExecCommand {
  const descriptor = WYSIWYG_COMMANDS[command];
  if (descriptor.fixedValue !== undefined) {
    // `formatBlock` expects the tag wrapped in angle brackets for the widest
    // cross-browser support (e.g. `<blockquote>`).
    return { command: descriptor.execCommand, value: `<${descriptor.fixedValue}>` };
  }
  if (descriptor.argument !== 'none') {
    return { command: descriptor.execCommand, value };
  }
  return { command: descriptor.execCommand };
}

/** Whether a command needs a value prompted from the user before it can run. */
export function commandRequiresArgument(command: WysiwygCommand): boolean {
  return WYSIWYG_COMMANDS[command].argument !== 'none';
}

/**
 * Insert an HTML fragment at the current selection, guarded for SSR/jsdom.
 * Uses modern Selection and Range APIs first, degrading gracefully to
 * `execCommand('insertHTML')` when Range manipulation is unavailable.
 */
export function insertHtmlAtSelection(documentReference: Document | undefined, html: string): boolean {
  if (documentReference === undefined) {
    return false;
  }
  const selection = documentReference.getSelection?.() ?? documentReference.defaultView?.getSelection?.();
  if (selection && selection.rangeCount > 0) {
    try {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const fragment = range.createContextualFragment(html);
      const lastChild = fragment.lastChild;
      range.insertNode(fragment);
      if (lastChild) {
        const nextRange = documentReference.createRange();
        nextRange.setStartAfter(lastChild);
        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
      }
      return true;
    } catch {
      // Degrade to execCommand fallback
    }
  }
  if (typeof documentReference.execCommand === 'function') {
    try {
      return documentReference.execCommand('insertHTML', false, html);
    } catch {
      return false;
    }
  }
  return false;
}

const INLINE_TAGS: Readonly<Record<string, { tag: string; aliases: readonly string[] }>> = {
  bold: { tag: 'strong', aliases: ['STRONG', 'B'] },
  italic: { tag: 'em', aliases: ['EM', 'I'] },
  underline: { tag: 'u', aliases: ['U'] },
  strikethrough: { tag: 's', aliases: ['S', 'DEL', 'STRIKE'] },
};

const BLOCK_TAGS: Readonly<Record<string, string>> = {
  heading1: 'h1',
  heading2: 'h2',
  heading3: 'h3',
  heading4: 'h4',
  heading5: 'h5',
  heading6: 'h6',
  paragraph: 'p',
  blockquote: 'blockquote',
  monospace: 'pre',
};

/** Finds the closest ancestor element that matches one of the provided tag names. */
function findAncestorTag(
  node: Node | null | undefined,
  tags: readonly string[],
  boundary?: HTMLElement | null,
): HTMLElement | undefined {
  let current: Node | null | undefined = node;
  while (current && current !== boundary && current !== current.ownerDocument?.body) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement;
      if (tags.includes(element.tagName.toUpperCase())) {
        return element;
      }
    }
    current = current.parentNode;
  }
  return undefined;
}

/** Unwraps an element by moving its children to its parent and removing the element. */
function unwrapElement(element: Element): void {
  const parent = element.parentNode;
  if (!parent) {
    return;
  }
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  element.remove();
}

/** Checks if a fragment contains meaningful content (text or specific non-empty elements). */
function fragmentHasMeaningfulContent(fragment: DocumentFragment, ignoreWhitespace = false): boolean {
  if (ignoreWhitespace) {
    return (
      (fragment.textContent ?? '').trim().length > 0 ||
      fragment.querySelector('img, br, video, audio, input, textarea, hr') !== null
    );
  }
  return (
    (fragment.textContent ?? '').length > 0 ||
    fragment.querySelector('img, br, video, audio, input, textarea, hr') !== null
  );
}

/** Locates the contenteditable editing surface enclosing a node, defaulting to the document body. */
function findEditingSurface(node: Node | null, documentReference: Document): HTMLElement | undefined {
  if (!node) {
    return undefined;
  }
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  return element?.closest<HTMLElement>('[contenteditable="true"]') ?? documentReference.body;
}

/** Resolves the nearest enclosing block-level element for a node within an editing surface. */
function findBlockElement(node: Node | null | undefined, surface?: HTMLElement | null): HTMLElement | undefined {
  if (surface) {
    const top = topLevelBlockFor(surface, node);
    if (top) {
      return top;
    }
  }
  const blockTags = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'DIV', 'LI', 'UL', 'OL']);
  let current: Node | null | undefined = node;
  while (current && current !== surface && current !== current.ownerDocument?.body) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement;
      if (blockTags.has(element.tagName.toUpperCase())) {
        return element;
      }
    }
    current = current.parentNode;
  }
  return undefined;
}

/** Splits an active ancestor element into extracted content fragments before and after a selection range. */
function splitAncestorFragments(
  documentReference: Document,
  range: Range,
  activeAncestor: HTMLElement,
): { beforeFragment: DocumentFragment; afterFragment: DocumentFragment } {
  const afterRange = documentReference.createRange();
  afterRange.setStart(range.endContainer, range.endOffset);
  afterRange.setEnd(activeAncestor, activeAncestor.childNodes.length);
  const afterFragment = afterRange.extractContents();

  const beforeRange = documentReference.createRange();
  beforeRange.setStart(activeAncestor, 0);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const beforeFragment = beforeRange.extractContents();

  return { beforeFragment, afterFragment };
}

/** Clones and reinserts outer formatting wrappers for non-empty fragments before and after an unformatted selection. */
function preserveSurroundingFragments(
  activeAncestor: HTMLElement,
  beforeFragment: DocumentFragment,
  afterFragment: DocumentFragment,
): void {
  const parent = activeAncestor.parentNode;
  if (beforeFragment.childNodes.length > 0 && fragmentHasMeaningfulContent(beforeFragment, true)) {
    const beforeElement = activeAncestor.cloneNode(false) as HTMLElement;
    beforeElement.append(beforeFragment);
    parent?.insertBefore(beforeElement, activeAncestor);
  }

  if (afterFragment.childNodes.length > 0 && fragmentHasMeaningfulContent(afterFragment, true)) {
    const afterElement = activeAncestor.cloneNode(false) as HTMLElement;
    afterElement.append(afterFragment);
    parent?.insertBefore(afterElement, activeAncestor.nextSibling);
  }
}

/** Toggles an active inline format off when the caret is collapsed inside an active ancestor element. */
function toggleInlineTagCollapsed(
  documentReference: Document,
  selection: Selection,
  range: Range,
  activeAncestor: HTMLElement,
): boolean {
  const { beforeFragment, afterFragment } = splitAncestorFragments(documentReference, range, activeAncestor);
  const parent = activeAncestor.parentNode;
  preserveSurroundingFragments(activeAncestor, beforeFragment, afterFragment);

  const zeroWidthSpace = documentReference.createTextNode('\u200B');
  parent?.insertBefore(zeroWidthSpace, activeAncestor);
  activeAncestor.remove();

  const nextRange = documentReference.createRange();
  nextRange.setStart(zeroWidthSpace, 1);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return true;
}

/** Unwraps an active inline format across a non-collapsed selection range. */
function unwrapInlineTag(
  documentReference: Document,
  selection: Selection,
  range: Range,
  activeAncestor: HTMLElement,
): boolean {
  const { beforeFragment, afterFragment } = splitAncestorFragments(documentReference, range, activeAncestor);
  preserveSurroundingFragments(activeAncestor, beforeFragment, afterFragment);

  const firstChild = activeAncestor.firstChild;
  const lastChild = activeAncestor.lastChild;
  unwrapElement(activeAncestor);

  if (firstChild && lastChild) {
    const nextRange = documentReference.createRange();
    nextRange.setStartBefore(firstChild);
    nextRange.setEndAfter(lastChild);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }
  return true;
}

/** Wraps a collapsed caret in a new inline format tag with a zero-width space placeholder. */
function wrapCollapsedRange(documentReference: Document, selection: Selection, range: Range, tag: string): boolean {
  const wrapper = documentReference.createElement(tag);
  const zeroWidthSpace = documentReference.createTextNode('\u200B');
  wrapper.append(zeroWidthSpace);
  range.insertNode(wrapper);

  const nextRange = documentReference.createRange();
  nextRange.setStart(zeroWidthSpace, 1);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return true;
}

/** Wraps a non-collapsed selection range in a new inline format tag, unwrapping any duplicate inner aliases. */
function wrapInlineRange(
  documentReference: Document,
  selection: Selection,
  range: Range,
  spec: { tag: string; aliases: readonly string[] },
): boolean {
  const wrapper = documentReference.createElement(spec.tag);
  const fragment = range.extractContents();
  for (const alias of spec.aliases) {
    for (const inner of fragment.querySelectorAll(alias.toLowerCase())) {
      unwrapElement(inner);
    }
  }
  wrapper.append(fragment);
  range.insertNode(wrapper);

  const nextRange = documentReference.createRange();
  nextRange.selectNodeContents(wrapper);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return true;
}

/**
 * Executes an inline formatting command (bold, italic, etc.) on the current selection.
 */
function executeInlineFormat(
  documentReference: Document,
  selection: Selection,
  range: Range,
  spec: { tag: string; aliases: readonly string[] },
  surface: HTMLElement,
): boolean {
  const activeAncestor =
    findAncestorTag(range.commonAncestorContainer, spec.aliases, surface) ??
    findAncestorTag(selection.anchorNode, spec.aliases, surface);

  if (activeAncestor) {
    return range.collapsed
      ? toggleInlineTagCollapsed(documentReference, selection, range, activeAncestor)
      : unwrapInlineTag(documentReference, selection, range, activeAncestor);
  }

  return range.collapsed
    ? wrapCollapsedRange(documentReference, selection, range, spec.tag)
    : wrapInlineRange(documentReference, selection, range, spec);
}

/**
 * Formats the current block into a new block tag (e.g. heading or blockquote).
 */
function executeBlockFormat(
  documentReference: Document,
  selection: Selection,
  targetTag: string,
  surface: HTMLElement,
): boolean {
  const currentBlock =
    topLevelBlockFor(surface, selection.anchorNode) ?? findBlockElement(selection.anchorNode, surface);
  if (!currentBlock) {
    return false;
  }

  if (currentBlock.tagName.toLowerCase() === targetTag.toLowerCase()) {
    return true;
  }

  const newBlock = documentReference.createElement(targetTag);
  if (currentBlock.style.textAlign) {
    newBlock.style.textAlign = currentBlock.style.textAlign;
  }
  while (currentBlock.firstChild) {
    newBlock.append(currentBlock.firstChild);
  }
  if (!newBlock.firstChild || (newBlock.textContent?.length === 0 && !newBlock.querySelector('br, img'))) {
    newBlock.append(documentReference.createElement('br'));
  }
  currentBlock.replaceWith(newBlock);

  const nextRange = documentReference.createRange();
  nextRange.selectNodeContents(newBlock);
  nextRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return true;
}

/**
 * Toggles an existing list off by converting all child list items back to paragraph elements.
 */
function toggleListOff(documentReference: Document, selection: Selection, existingListElement: HTMLElement): boolean {
  const items = [...existingListElement.querySelectorAll(':scope > li')];
  const paragraphs: HTMLElement[] = [];
  for (const listItem of items) {
    const paragraph = documentReference.createElement('p');
    while (listItem.firstChild) {
      paragraph.append(listItem.firstChild);
    }
    if (!paragraph.firstChild) {
      paragraph.append(documentReference.createElement('br'));
    }
    paragraphs.push(paragraph);
  }
  if (paragraphs.length === 0) {
    const paragraph = documentReference.createElement('p');
    paragraph.append(documentReference.createElement('br'));
    paragraphs.push(paragraph);
  }
  existingListElement.replaceWith(...paragraphs);

  const nextRange = documentReference.createRange();
  const firstParagraph = paragraphs[0];
  if (firstParagraph) {
    nextRange.selectNodeContents(firstParagraph);
  }
  nextRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return true;
}

/**
 * Switches an existing list's type (e.g. ordered list to unordered list or vice versa).
 */
function switchListType(
  documentReference: Document,
  selection: Selection,
  existingListElement: HTMLElement,
  targetTag: string,
): boolean {
  const newListElement = documentReference.createElement(targetTag);
  while (existingListElement.firstChild) {
    newListElement.append(existingListElement.firstChild);
  }
  existingListElement.replaceWith(newListElement);

  const nextRange = documentReference.createRange();
  nextRange.selectNodeContents(newListElement);
  nextRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return true;
}

/**
 * Converts selected or enclosing block elements into a list of the specified tag.
 */
function convertBlockToList(
  documentReference: Document,
  selection: Selection,
  range: Range,
  targetTag: string,
  surface: HTMLElement,
): boolean {
  const selectedBlocks = [...surface.children].filter(
    (child): child is HTMLElement => child instanceof HTMLElement && range.intersectsNode(child),
  );

  const fallbackBlock =
    topLevelBlockFor(surface, selection.anchorNode) ?? findBlockElement(selection.anchorNode, surface);
  const blocksToConvert = selectedBlocks.length > 0 ? selectedBlocks : fallbackBlock ? [fallbackBlock] : [];

  if (blocksToConvert.length === 0) {
    return false;
  }

  const listElement = documentReference.createElement(targetTag);
  for (const block of blocksToConvert) {
    const listItem = documentReference.createElement('li');
    while (block.firstChild) {
      listItem.append(block.firstChild);
    }
    if (!listItem.firstChild) {
      listItem.append(documentReference.createElement('br'));
    }
    listElement.append(listItem);
  }

  const firstBlock = blocksToConvert[0];
  if (firstBlock) {
    firstBlock.replaceWith(listElement);
  }
  for (let index = 1; index < blocksToConvert.length; index++) {
    const block = blocksToConvert[index];
    if (block) {
      block.remove();
    }
  }

  const nextRange = documentReference.createRange();
  nextRange.selectNodeContents(listElement.firstElementChild ?? listElement);
  nextRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return true;
}

/**
 * Executes a list format command, either toggling an existing list off,
 * switching list types, or converting selected blocks into a new list.
 */
function executeListFormat(
  documentReference: Document,
  selection: Selection,
  range: Range,
  listType: 'bulletList' | 'numberedList',
  surface: HTMLElement,
): boolean {
  const targetTag = listType === 'bulletList' ? 'ul' : 'ol';
  const existingListElement = findAncestorTag(selection.anchorNode, ['UL', 'OL'], surface);

  if (existingListElement) {
    if (existingListElement.tagName.toLowerCase() === targetTag) {
      return toggleListOff(documentReference, selection, existingListElement);
    }
    return switchListType(documentReference, selection, existingListElement, targetTag);
  }

  return convertBlockToList(documentReference, selection, range, targetTag, surface);
}

const SAFE_URL_PATTERN = /^(?:https?:\/\/|mailto:|tel:|\/|#|\?)/i;

/** Returns true when the URL scheme is considered safe for hyperlinks and media sources. */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }
  return SAFE_URL_PATTERN.test(trimmed);
}

/**
 * Inserts or updates a hyperlink at the current selection.
 */
function executeLink(
  documentReference: Document,
  selection: Selection,
  range: Range,
  url: string,
  surface: HTMLElement,
): boolean {
  if (!isSafeUrl(url)) {
    return false;
  }
  const existingAnchor =
    findAncestorTag(range.commonAncestorContainer, ['A'], surface) ??
    findAncestorTag(selection.anchorNode, ['A'], surface);

  if (existingAnchor) {
    existingAnchor.setAttribute('href', url);
    return true;
  }

  if (range.collapsed) {
    const anchorElement = documentReference.createElement('a');
    anchorElement.href = url;
    anchorElement.textContent = url;
    range.insertNode(anchorElement);

    const nextRange = documentReference.createRange();
    nextRange.setStartAfter(anchorElement);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    return true;
  }

  const anchorElement = documentReference.createElement('a');
  anchorElement.href = url;
  const fragment = range.extractContents();
  anchorElement.append(fragment);
  range.insertNode(anchorElement);

  const nextRange = documentReference.createRange();
  nextRange.selectNodeContents(anchorElement);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return true;
}

/**
 * Removes hyperlinks intersecting the current selection.
 */
function executeUnlink(
  _documentReference: Document,
  selection: Selection,
  range: Range,
  surface: HTMLElement,
): boolean {
  const existingAnchor =
    findAncestorTag(range.commonAncestorContainer, ['A'], surface) ??
    findAncestorTag(selection.anchorNode, ['A'], surface);

  if (existingAnchor) {
    unwrapElement(existingAnchor);
    return true;
  }

  if (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE) {
    const containerElement = range.commonAncestorContainer as Element;
    const links = [...containerElement.querySelectorAll('a')].filter((anchorElement) =>
      range.intersectsNode(anchorElement),
    );
    for (const anchorElement of links) {
      unwrapElement(anchorElement);
    }
    return links.length > 0;
  }
  return false;
}

/**
 * Inserts an image element at the current selection.
 */
function executeImage(documentReference: Document, selection: Selection, range: Range, url: string): boolean {
  if (!isSafeUrl(url)) {
    return false;
  }
  const imageElement = documentReference.createElement('img');
  imageElement.src = url;
  imageElement.alt = '';
  range.deleteContents();
  range.insertNode(imageElement);

  const nextRange = documentReference.createRange();
  nextRange.setStartAfter(imageElement);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  return true;
}

/**
 * Applies text alignment styling to the block element containing the selection.
 */
function executeAlignment(
  command: 'alignLeft' | 'alignCenter' | 'alignRight' | 'alignJustify',
  surface: HTMLElement,
  selection: Selection,
): boolean {
  const alignMap: Record<string, string> = {
    alignLeft: 'left',
    alignCenter: 'center',
    alignRight: 'right',
    alignJustify: 'justify',
  };
  const block = topLevelBlockFor(surface, selection.anchorNode) ?? findBlockElement(selection.anchorNode, surface);
  if (block) {
    block.style.textAlign = alignMap[command] ?? 'left';
    return true;
  }
  return false;
}

/**
 * Removes inline formatting elements and wraps across the selection.
 */
function executeClearFormatting(selection: Selection, range: Range, surface: HTMLElement): boolean {
  const formattingTags = ['STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'STRIKE', 'A', 'SPAN'];
  let ancestor = findAncestorTag(selection.anchorNode, formattingTags, surface);
  while (ancestor) {
    const next = findAncestorTag(ancestor.parentNode, formattingTags, surface);
    unwrapElement(ancestor);
    ancestor = next;
  }
  if (!range.collapsed) {
    const fragment = range.extractContents();
    for (const tag of formattingTags) {
      for (const formattingElement of fragment.querySelectorAll(tag.toLowerCase())) {
        unwrapElement(formattingElement);
      }
    }
    range.insertNode(fragment);
  }
  return true;
}

/**
 * Dispatches a WYSIWYG command to modern DOM Range-based manipulation handlers.
 */
function executeDomCommand(
  documentReference: Document,
  selection: Selection,
  range: Range,
  command: WysiwygCommand,
  value: string | undefined,
  surface: HTMLElement,
): boolean {
  if (command in INLINE_TAGS) {
    const tagSpec = INLINE_TAGS[command];
    if (tagSpec) {
      return executeInlineFormat(documentReference, selection, range, tagSpec, surface);
    }
    return false;
  }
  if (command in BLOCK_TAGS) {
    const blockTag = BLOCK_TAGS[command];
    if (blockTag) {
      return executeBlockFormat(documentReference, selection, blockTag, surface);
    }
    return false;
  }
  if (command === 'bulletList' || command === 'numberedList') {
    return executeListFormat(documentReference, selection, range, command, surface);
  }
  if (command === 'link') {
    return value ? executeLink(documentReference, selection, range, value, surface) : false;
  }
  if (command === 'unlink') {
    return executeUnlink(documentReference, selection, range, surface);
  }
  if (command === 'image') {
    return value ? executeImage(documentReference, selection, range, value) : false;
  }
  if (command === 'alignLeft' || command === 'alignCenter' || command === 'alignRight' || command === 'alignJustify') {
    return executeAlignment(command, surface, selection);
  }
  if (command === 'clearFormatting') {
    return executeClearFormatting(selection, range, surface);
  }
  return false;
}

/**
 * Run a rich-text command against a document's current selection, guarded so it
 * never throws when `execCommand` is unavailable (SSR, jsdom, locked-down
 * browsers). Uses modern DOM Selection/Range APIs first and degrades to
 * `document.execCommand` only when Range execution is not applicable.
 * Returns whether the command was executed.
 */
export function runCommand(
  documentReference: Document | undefined,
  command: WysiwygCommand,
  value?: string,
  surface?: HTMLElement,
): boolean {
  if (documentReference === undefined) {
    return false;
  }
  const resolved = resolveExecCommand(command, value);
  if (resolved.value === undefined && commandRequiresArgument(command)) {
    // A url/image command with no value supplied is a no-op rather than an error.
    return false;
  }

  const selection = documentReference.getSelection?.() ?? documentReference.defaultView?.getSelection?.();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const editingSurface = surface ?? findEditingSurface(range.commonAncestorContainer, documentReference);
    if (
      editingSurface &&
      (editingSurface === range.commonAncestorContainer || editingSurface.contains(range.commonAncestorContainer))
    ) {
      try {
        const handled = executeDomCommand(documentReference, selection, range, command, value, editingSurface);
        if (handled) {
          return true;
        }
      } catch {
        // Fall back below if modern DOM execution failed
      }
    }
  }

  if (typeof documentReference.execCommand === 'function') {
    try {
      return documentReference.execCommand(resolved.command, false, resolved.value);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Whether a toggle command (`bold`, `italic`, …) is currently active for the
 * selection, inspecting the DOM ancestry when available and falling back to
 * `queryCommandState`.
 */
export function isCommandActive(
  documentReference: Document | undefined,
  command: WysiwygCommand,
  surface?: HTMLElement,
): boolean {
  if (documentReference === undefined) {
    return false;
  }
  const selection = documentReference.getSelection?.() ?? documentReference.defaultView?.getSelection?.();
  if (selection && selection.rangeCount > 0) {
    const anchor = selection.anchorNode;
    if (anchor && (!surface || surface.contains(anchor))) {
      const tagSpec: Record<string, string[]> = {
        bold: ['STRONG', 'B'],
        italic: ['EM', 'I'],
        underline: ['U'],
        strikethrough: ['S', 'DEL', 'STRIKE'],
        bulletList: ['UL'],
        numberedList: ['OL'],
        blockquote: ['BLOCKQUOTE'],
        monospace: ['PRE'],
        link: ['A'],
      };
      const tags = tagSpec[command];
      if (tags) {
        return findAncestorTag(anchor, tags, surface) !== undefined;
      }
    }
  }
  if (typeof documentReference.queryCommandState !== 'function') {
    return false;
  }
  try {
    return documentReference.queryCommandState(WYSIWYG_COMMANDS[command].execCommand);
  } catch {
    return false;
  }
}

/**
 * The ordered set of **block-level format** commands offered by the block-style
 * dropdown (paragraph, the six headings, block quote and the editable monospace
 * block). Each one is a `formatBlock` command, so it converts the block that
 * currently contains the selection.
 */
export const BLOCK_FORMAT_COMMANDS: readonly WysiwygCommand[] = [
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  'blockquote',
  'monospace',
] as const;

/** Map every block-format tag (as returned by `queryCommandValue`) to its command. */
const BLOCK_TAG_TO_COMMAND: Readonly<Record<string, WysiwygCommand>> = {
  p: 'paragraph',
  div: 'paragraph',
  h1: 'heading1',
  h2: 'heading2',
  h3: 'heading3',
  h4: 'heading4',
  h5: 'heading5',
  h6: 'heading6',
  blockquote: 'blockquote',
  pre: 'monospace',
};

/**
 * Resolve the {@link WysiwygCommand} describing the block format of the current
 * selection (e.g. `'heading1'` when the caret sits inside an `<h1>`), defaulting
 * to `'paragraph'`. Inspects DOM container first, falling back to `queryCommandValue`.
 */
export function queryBlockFormat(documentReference: Document | undefined, surface?: HTMLElement): WysiwygCommand {
  if (documentReference === undefined) {
    return 'paragraph';
  }
  const selection = documentReference.getSelection?.() ?? documentReference.defaultView?.getSelection?.();
  if (selection && selection.rangeCount > 0) {
    const anchor = selection.anchorNode;
    if (anchor && (!surface || surface.contains(anchor))) {
      let current: Node | null = anchor;
      while (current && current !== surface && current !== current.ownerDocument?.body) {
        if (current.nodeType === Node.ELEMENT_NODE) {
          const tag = (current as Element).tagName.toLowerCase();
          if (BLOCK_TAG_TO_COMMAND[tag]) {
            return BLOCK_TAG_TO_COMMAND[tag];
          }
        }
        current = current.parentNode;
      }
    }
  }
  if (typeof documentReference.queryCommandValue !== 'function') {
    return 'paragraph';
  }
  try {
    const tag = String(documentReference.queryCommandValue('formatBlock')).toLowerCase();
    return BLOCK_TAG_TO_COMMAND[tag] ?? 'paragraph';
  } catch {
    return 'paragraph';
  }
}
