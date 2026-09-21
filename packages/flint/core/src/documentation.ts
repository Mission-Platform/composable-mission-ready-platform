import type { FlintDocumentation, FlintDocumentationTag } from './ast.js';

const tagsWithSubjects = new Set(['arg', 'argument', 'param', 'parameter', 'typeparam', 'throws', 'exception']);

/**
 * Normalizes a single comment line by removing leading asterisks and excess whitespace.
 *
 * @param line - Raw comment line to normalize.
 * @returns Cleaned and whitespace-collapsed line.
 */
function normalizeLine(line: string): string {
  return line
    .replace(/^\s*\* ?/u, '')
    .trim()
    .replaceAll(/\s+/gu, ' ');
}

/**
 * Normalizes an array of lines into a single trimmed paragraph.
 *
 * @param lines - Sequence of lines belonging to a single paragraph.
 * @returns Collapsed paragraph string.
 */
function normalizeParagraph(lines: readonly string[]): string {
  return lines.join(' ').trim().replaceAll(/\s+/gu, ' ');
}

/**
 * Splits a doc comment into normalized individual lines.
 *
 * @param comment - Raw doc comment string.
 * @returns Array of normalized comment lines.
 */
function normalizedLines(comment: string): string[] {
  const inner = comment.startsWith('/**') && comment.endsWith('*/') ? comment.slice(3, -2) : comment;
  return inner.split(/\r?\n/u).map((line) => normalizeLine(line));
}

/**
 * Parses a documentation tag line into a structured documentation tag.
 *
 * @param line - Line starting with '@'.
 * @returns Structured documentation tag object.
 */
// skipcq: JS-R1005
function parseTag(line: string): FlintDocumentationTag {
  const match = /^@([^\s]+)(?:\s+(.*))?$/u.exec(line);
  const name = match?.[1] ?? '';
  const remainder = match?.[2]?.trim() ?? '';
  if (tagsWithSubjects.has(name)) {
    const separator = remainder.search(/\s/u);
    if (separator < 0) return { name, ...(remainder.length === 0 ? {} : { subject: remainder }), text: '' };
    return { name, subject: remainder.slice(0, separator), text: remainder.slice(separator + 1).trim() };
  }
  return { name, text: remainder };
}

/**
 * Assembles description lines into normalized paragraph blocks separated by double newlines.
 *
 * @param lines - Raw description lines.
 * @returns Paragraphs joined by double newlines.
 */
function buildDescription(lines: readonly string[]): string {
  const paragraphs: string[] = [];
  let paragraph: string[] = [];
  for (const line of lines) {
    if (line.length === 0) {
      if (paragraph.length > 0) paragraphs.push(normalizeParagraph(paragraph));
      paragraph = [];
    } else {
      paragraph.push(line);
    }
  }
  if (paragraph.length > 0) paragraphs.push(normalizeParagraph(paragraph));
  return paragraphs.join('\n\n');
}

/**
 * Parses a Flint doc comment into structured description and documentation tags.
 *
 * @param comment - Raw doc comment string.
 * @returns Structured documentation record with normalized description and tags.
 */
// skipcq: JS-R1005
export function parseFlintDocumentation(comment: string): FlintDocumentation {
  const lines = normalizedLines(comment);
  const descriptionLines: string[] = [];
  const tags: FlintDocumentationTag[] = [];
  let currentTag: FlintDocumentationTag | undefined;
  let inTags = false;

  for (const line of lines) {
    if (line.startsWith('@')) {
      currentTag = parseTag(line);
      tags.push(currentTag);
      inTags = true;
    } else if (inTags && currentTag !== undefined) {
      const continuation = line.trim();
      if (continuation.length > 0)
        currentTag = { ...currentTag, text: [currentTag.text, continuation].filter(Boolean).join(' ') };
      tags[tags.length - 1] = currentTag;
    } else {
      descriptionLines.push(line);
    }
  }

  return { description: buildDescription(descriptionLines), tags };
}

/**
 * Renders a structured Flint documentation record back to doc comment markdown.
 *
 * @param documentation - Structured documentation record.
 * @returns Formatted documentation markdown text.
 */
export function renderFlintDocumentation(documentation: FlintDocumentation): string {
  const tagLines = documentation.tags.map(({ name, subject, text }) =>
    [`@${name}`, subject, text].filter((part): part is string => part !== undefined && part.length > 0).join(' '),
  );
  return [documentation.description, ...tagLines].filter((part) => part.length > 0).join('\n\n');
}
