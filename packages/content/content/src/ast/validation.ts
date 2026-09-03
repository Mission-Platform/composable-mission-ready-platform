import {
  CONTENT_DOCUMENT_VERSION,
  type ContentBlock,
  type ContentDocument,
  type ContentInline,
  type ContentMark,
} from './types';

export interface ContentValidationResult {
  valid: boolean;
  errors: string[];
}

function isMark(value: unknown): value is ContentMark {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    ['strong', 'emphasis', 'underline', 'strikethrough'].includes(value.type as string)
  );
}

function isInline(value: unknown): value is ContentInline {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  const inline = value as Record<string, unknown>;
  if (inline.type === 'text')
    return (
      typeof inline.value === 'string' &&
      (inline.marks === undefined || (Array.isArray(inline.marks) && inline.marks.every(isMark)))
    );
  if (inline.type === 'inline-code') return typeof inline.value === 'string';
  if (inline.type === 'raw-html') return typeof inline.value === 'string';
  if (inline.type === 'image') return typeof inline.src === 'string' && typeof inline.alt === 'string';
  return (
    inline.type === 'link' &&
    typeof inline.url === 'string' &&
    Array.isArray(inline.children) &&
    inline.children.every(isInline)
  );
}

function isBlock(value: unknown): value is ContentBlock {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  const block = value as Record<string, unknown>;
  if (block.type === 'paragraph') return Array.isArray(block.children) && block.children.every(isInline);
  if (block.type === 'heading') {
    const level = block.level;
    return (
      typeof level === 'number' &&
      Number.isInteger(level) &&
      level >= 1 &&
      level <= 6 &&
      Array.isArray(block.children) &&
      block.children.every(isInline)
    );
  }
  if (block.type === 'quote') return Array.isArray(block.children) && block.children.every(isBlock);
  if (block.type === 'code') return typeof block.value === 'string';
  if (block.type === 'image') return typeof block.src === 'string' && typeof block.alt === 'string';
  if (block.type === 'raw-html') return typeof block.value === 'string';
  if (block.type === 'list') {
    const items = block.items;
    return (
      typeof block.ordered === 'boolean' &&
      Array.isArray(items) &&
      items.every((item) => {
        if (typeof item !== 'object' || item === null) return false;
        const listItem = item as Record<string, unknown>;
        return listItem.type === 'list-item' && Array.isArray(listItem.children) && listItem.children.every(isBlock);
      })
    );
  }
  return false;
}

export function validateDocument(document: unknown): ContentValidationResult {
  const errors: string[] = [];
  if (typeof document !== 'object' || document === null)
    return { valid: false, errors: ['Document must be an object.'] };
  const value = document as Record<string, unknown>;
  if (value.type !== 'document') errors.push('Document type must be "document".');
  if (value.version !== CONTENT_DOCUMENT_VERSION) errors.push(`Document version must be ${CONTENT_DOCUMENT_VERSION}.`);
  if (Array.isArray(value.children)) {
    for (const [index, child] of value.children.entries()) {
      if (!isBlock(child)) errors.push(`Document child ${index} is not a valid content block.`);
    }
  } else {
    errors.push('Document children must be an array.');
  }
  return { valid: errors.length === 0, errors };
}

export function isContentDocument(value: unknown): value is ContentDocument {
  return validateDocument(value).valid;
}

export function assertContentDocument(value: unknown): asserts value is ContentDocument {
  const result = validateDocument(value);
  if (!result.valid) throw new TypeError(result.errors.join(' '));
}

function normalizeInline(inline: ContentInline): ContentInline {
  if (inline.type === 'link') return { ...inline, children: normalizeInlines(inline.children) };
  if (inline.type === 'text' && inline.marks !== undefined && inline.marks.length === 0)
    return { type: 'text', value: inline.value };
  return { ...inline };
}

function normalizeInlines(inlines: ContentInline[]): ContentInline[] {
  const result: ContentInline[] = [];
  for (const inline of inlines.map((value) => normalizeInline(value))) {
    const previous = result.at(-1);
    if (
      inline.type === 'text' &&
      previous?.type === 'text' &&
      JSON.stringify(inline.marks ?? []) === JSON.stringify(previous.marks ?? [])
    )
      previous.value += inline.value;
    else result.push(inline);
  }
  return result;
}

function normalizeBlock(block: ContentBlock): ContentBlock {
  if (block.type === 'paragraph' || block.type === 'heading')
    return { ...block, children: normalizeInlines(block.children) };
  if (block.type === 'quote') return { ...block, children: block.children.map((child) => normalizeBlock(child)) };
  if (block.type === 'list')
    return {
      ...block,
      items: block.items.map((item) => ({ ...item, children: item.children.map((child) => normalizeBlock(child)) })),
    };
  return { ...block };
}

export function normalizeDocument(document: ContentDocument): ContentDocument {
  assertContentDocument(document);
  return {
    version: CONTENT_DOCUMENT_VERSION,
    type: 'document',
    children: document.children.map((block) => normalizeBlock(block)),
  };
}
