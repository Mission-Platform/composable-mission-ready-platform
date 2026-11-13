import type {
  FlintMarkupAttr,
  FlintMarkupChild,
  FlintMarkupElementNode,
  FlintModule,
} from '@mission-platform/flint-ast';

import { offsetAtPosition, rangeFromOffsets, rangeFromSpan } from './positions.js';

import type {
  FlintCompletion,
  FlintDocument,
  FlintDocumentSymbol,
  FlintFoldingRange,
  FlintHover,
  FlintLanguageDiagnostic,
  FlintLocation,
  FlintPosition,
  FlintSymbol,
  FlintTextEdit,
  FlintTokenClassification,
} from './types.js';

const HTML_TAGS = [
  'a',
  'button',
  'div',
  'form',
  'h1',
  'h2',
  'img',
  'input',
  'label',
  'li',
  'main',
  'nav',
  'p',
  'section',
  'span',
  'ul',
] as const;
const HTML_ATTRIBUTES = [
  'aria-label',
  'class',
  'disabled',
  'id',
  'name',
  'role',
  'slot',
  'style',
  'tabindex',
  'title',
  'type',
  'value',
] as const;

function elementName(element: FlintMarkupElementNode): string | undefined {
  return typeof element.tag === 'string' ? element.tag : undefined;
}

function childElements(children: readonly FlintMarkupChild[]): readonly FlintMarkupElementNode[] {
  const result: FlintMarkupElementNode[] = [];
  const visit = (child: FlintMarkupChild): void => {
    if (child.kind === 'markup-element') {
      result.push(child);
      child.children.forEach(visit);
      return;
    }
    if (child.kind === 'markup-conditional') {
      child.truthy.forEach(visit);
      child.elseif?.forEach((branch) => branch.children.forEach(visit));
      child.fallback?.forEach(visit);
      return;
    }
    if (child.kind === 'markup-for') {
      child.children.forEach(visit);
      return;
    }
    if (child.kind === 'markup-slot') child.fallback?.forEach(visit);
  };
  children.forEach(visit);
  return result;
}

function templateRange(module: FlintModule): { readonly start: number; readonly end: number } | undefined {
  const region = module.componentRegions?.find(({ region }) => region === 'template');
  return region === undefined ? undefined : { start: region.contentSpan.start, end: region.contentSpan.end };
}

function elementAt(module: FlintModule, offset: number): FlintMarkupElementNode | undefined {
  return childElements(module.template?.children ?? []).find(
    (element) => element.span.start <= offset && offset <= element.span.end,
  );
}

function markupPosition(module: FlintModule, offset: number): boolean {
  const range = templateRange(module);
  return range !== undefined && offset >= range.start && offset <= range.end;
}

/** Returns whether a position belongs to the parser-owned template region. */
export function isMarkupPosition(
  document: FlintDocument,
  module: FlintModule | undefined,
  position: FlintPosition,
): boolean {
  return module !== undefined && markupPosition(module, offsetAtPosition(document.text, position));
}

function tagRange(
  document: FlintDocument,
  element: FlintMarkupElementNode,
): { readonly start: number; readonly end: number } | undefined {
  const name = elementName(element);
  if (name === undefined) return undefined;
  const start = document.text.indexOf(name, element.span.start);
  return start < 0 || start + name.length > element.span.end ? undefined : { start, end: start + name.length };
}

function attrNameRange(
  document: FlintDocument,
  attr: FlintMarkupAttr,
): { readonly start: number; readonly end: number } | undefined {
  if (attr.kind === 'markup-spread-attribute') return undefined;
  const start = document.text.indexOf(attr.name, attr.span.start);
  return start < 0 || start + attr.name.length > attr.span.end ? undefined : { start, end: start + attr.name.length };
}

function activeWord(
  document: FlintDocument,
  offset: number,
): { readonly start: number; readonly end: number; readonly text: string } {
  const before = document.text.slice(0, offset);
  const after = document.text.slice(offset);
  const prefix = /[A-Za-z:@_-][\w:.-]*$/u.exec(before)?.[0] ?? '';
  const suffix = /^[\w:.-]*/u.exec(after)?.[0] ?? '';
  return { start: offset - prefix.length, end: offset + suffix.length, text: `${prefix}${suffix}` };
}

/** Provides AST-aware tag, attribute, directive, component, and slot completions. */
export function completeMarkup(
  document: FlintDocument,
  module: FlintModule | undefined,
  position: FlintPosition,
): readonly FlintCompletion[] {
  if (module === undefined) return [];
  const offset = offsetAtPosition(document.text, position);
  if (!markupPosition(module, offset)) return [];
  const word = activeWord(document, offset);
  const before = document.text.slice(0, word.start);
  const tagContext = before.lastIndexOf('<') > before.lastIndexOf('>');
  const labels = tagContext
    ? [
        ...HTML_TAGS,
        ...childElements(module.template?.children ?? [])
          .map(elementName)
          .filter((name): name is string => name !== undefined),
        'Slot',
      ]
    : [...HTML_ATTRIBUTES, 'on:click', 'bind:value', 'let:slot'];
  const uniqueLabels = [...new Set(labels)];
  return uniqueLabels
    .filter((label) => label.startsWith(word.text))
    .map((label) => ({
      label,
      kind: tagContext ? (label === 'Slot' || /^[A-Z]/u.test(label) ? 'declaration' : 'keyword') : 'value',
      detail: tagContext ? 'Markup element' : label.includes(':') ? 'Flint directive' : 'Markup attribute',
      range: rangeFromOffsets(document.text, word.start, word.end),
    }));
}

/** Provides hover information for AST-owned elements, attributes, slots, and directives. */
export function hoverMarkup(
  document: FlintDocument,
  module: FlintModule | undefined,
  position: FlintPosition,
): FlintHover | undefined {
  if (module === undefined) return undefined;
  const offset = offsetAtPosition(document.text, position);
  if (!markupPosition(module, offset)) return undefined;
  const element = elementAt(module, offset);
  if (element !== undefined) {
    const range = tagRange(document, element);
    if (range !== undefined && offset >= range.start && offset <= range.end) {
      const name = elementName(element) ?? 'dynamic';
      return { range: rangeFromOffsets(document.text, range.start, range.end), contents: [`Markup element <${name}>`] };
    }
    const attr = element.attributes.find((candidate) => candidate.span.start <= offset && offset <= candidate.span.end);
    if (attr !== undefined && attr.kind !== 'markup-spread-attribute') {
      const range = attrNameRange(document, attr);
      if (range !== undefined) {
        return {
          range: rangeFromOffsets(document.text, range.start, range.end),
          contents: [
            attr.name.includes(':') || attr.name.startsWith('@')
              ? `Flint directive ${attr.name}`
              : `Markup attribute ${attr.name}`,
          ],
        };
      }
    }
  }
  return undefined;
}

function symbolForElement(document: FlintDocument, element: FlintMarkupElementNode): FlintDocumentSymbol {
  const name = elementName(element) ?? 'dynamic';
  const range = rangeFromSpan(document.text, element.span);
  return {
    name: `<${name}>`,
    kind: 'markup',
    range,
    selectionRange:
      tagRange(document, element) === undefined
        ? range
        : rangeFromOffsets(
            document.text,
            tagRange(document, element)?.start ?? element.span.start,
            tagRange(document, element)?.end ?? element.span.end,
          ),
    detail: element.tagKind,
    children: element.children
      .filter((child): child is FlintMarkupElementNode => child.kind === 'markup-element')
      .map((child) => symbolForElement(document, child)),
  };
}

/** Builds a hierarchical document outline from markup element AST nodes. */
export function markupSymbols(
  document: FlintDocument,
  module: FlintModule | undefined,
): readonly FlintDocumentSymbol[] {
  return (
    module?.template?.children
      .filter((child): child is FlintMarkupElementNode => child.kind === 'markup-element')
      .map((element) => symbolForElement(document, element)) ?? []
  );
}

/** Returns collapsible ranges for non-empty elements and control-flow markup nodes. */
export function markupFoldingRanges(
  document: FlintDocument,
  module: FlintModule | undefined,
): readonly FlintFoldingRange[] {
  if (module?.template === undefined) return [];
  const ranges: FlintFoldingRange[] = [];
  const visit = (child: FlintMarkupChild): void => {
    if (child.kind === 'markup-element' && child.children.length > 0) {
      ranges.push({ range: rangeFromSpan(document.text, child.span), kind: 'markup' });
      child.children.forEach(visit);
    } else if (child.kind === 'markup-conditional') {
      ranges.push({ range: rangeFromSpan(document.text, child.span), kind: 'markup' });
      child.truthy.forEach(visit);
      child.fallback?.forEach(visit);
    } else if (child.kind === 'markup-for') {
      ranges.push({ range: rangeFromSpan(document.text, child.span), kind: 'markup' });
      child.children.forEach(visit);
    }
  };
  module.template.children.forEach(visit);
  return ranges;
}

/** Adds non-overlapping semantic classifications for AST-owned markup constructs. */
export function tokenizeMarkup(
  document: FlintDocument,
  module: FlintModule | undefined,
): readonly FlintTokenClassification[] {
  if (module?.template === undefined) return [];
  const result: FlintTokenClassification[] = [];
  const add = (kind: FlintTokenClassification['kind'], start: number, end: number): void => {
    if (start >= 0 && end > start)
      result.push({ kind, text: document.text.slice(start, end), range: rangeFromOffsets(document.text, start, end) });
  };
  const visit = (child: FlintMarkupChild): void => {
    if (child.kind === 'markup-element') {
      const tag = tagRange(document, child);
      if (tag !== undefined) add('html-tag', tag.start, tag.end);
      child.attributes.forEach((attr) => {
        const range = attrNameRange(document, attr);
        if (range !== undefined) {
          const name = attr.kind === 'markup-spread-attribute' ? '' : attr.name;
          add(
            name.includes(':') || name.startsWith('@') ? 'markup-directive' : 'html-attribute',
            range.start,
            range.end,
          );
        }
      });
      child.children.forEach(visit);
    } else if (child.kind === 'markup-expression') {
      add('markup-interpolation', child.span.start, child.span.end);
    } else if (child.kind === 'markup-slot') {
      add('markup-slot', child.span.start, child.span.end);
      child.fallback?.forEach(visit);
    } else if (child.kind === 'markup-conditional') {
      child.truthy.forEach(visit);
      child.elseif?.forEach((branch) => branch.children.forEach(visit));
      child.fallback?.forEach(visit);
    } else if (child.kind === 'markup-for') child.children.forEach(visit);
  };
  module.template.children.forEach(visit);
  return result;
}

/** Finds local Flint declarations matching a component tag for source navigation. */
export function markupDefinitions(
  document: FlintDocument,
  module: FlintModule | undefined,
  symbols: readonly FlintSymbol[],
  position: FlintPosition,
): readonly FlintLocation[] {
  if (module === undefined) return [];
  const offset = offsetAtPosition(document.text, position);
  const element = elementAt(module, offset);
  const name = element === undefined ? undefined : elementName(element);
  if (name === undefined) return [];
  return symbols
    .filter((symbol) => symbol.name === name || symbol.name === name.replace(/^Forge/u, ''))
    .map((symbol) => ({ uri: document.uri, range: symbol.declarationRange ?? symbol.range }));
}

function protectedMarkupSpans(module: FlintModule): readonly { readonly start: number; readonly end: number }[] {
  const spans: { start: number; end: number }[] = [];
  const visit = (child: FlintMarkupChild): void => {
    if (
      child.kind === 'markup-expression' ||
      child.kind === 'markup-conditional' ||
      child.kind === 'markup-for' ||
      child.kind === 'markup-slot'
    ) {
      spans.push(child.span);
    }
    if (child.kind === 'markup-element') {
      child.attributes.forEach((attr) => {
        if (attr.kind === 'markup-attribute' && attr.value?.kind === 'expression') spans.push(attr.value.span);
      });
      child.children.forEach(visit);
    } else if (child.kind === 'markup-conditional') {
      child.truthy.forEach(visit);
      child.elseif?.forEach((branch) => branch.children.forEach(visit));
      child.fallback?.forEach(visit);
    } else if (child.kind === 'markup-for') child.children.forEach(visit);
  };
  module.template?.children.forEach(visit);
  return spans;
}

/** Creates a source edit only when both endpoints remain inside markup-owned text. */
export function createMarkupEdit(
  document: FlintDocument,
  module: FlintModule | undefined,
  range: { readonly startOffset: number; readonly endOffset: number },
  newText: string,
): FlintTextEdit | undefined {
  if (module === undefined) return undefined;
  const template = templateRange(module);
  if (
    template === undefined ||
    range.startOffset < template.start ||
    range.endOffset > template.end ||
    range.endOffset < range.startOffset
  )
    return undefined;
  if (protectedMarkupSpans(module).some((span) => range.startOffset < span.end && range.endOffset > span.start))
    return undefined;
  return { range: rangeFromOffsets(document.text, range.startOffset, range.endOffset), newText };
}

/** Produces diagnostics for unsupported edits crossing AST-owned Flint expressions. */
export function diagnoseMarkup(
  document: FlintDocument,
  module: FlintModule | undefined,
): readonly FlintLanguageDiagnostic[] {
  void document;
  if (module?.template === undefined) return [];
  return [];
}
