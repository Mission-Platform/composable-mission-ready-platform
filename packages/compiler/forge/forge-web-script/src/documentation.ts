import type { ForgeWebScriptDocumentation, ForgeWebScriptDocumentationTag } from './ast.js';

const tagsWithSubjects = new Set(['arg', 'argument', 'param', 'parameter', 'typeparam', 'throws', 'exception']);

function normalizeLine(line: string): string {
  return line
    .replace(/^\s*\* ?/u, '')
    .trim()
    .replaceAll(/\s+/gu, ' ');
}

function normalizeParagraph(lines: readonly string[]): string {
  return lines.join(' ').trim().replaceAll(/\s+/gu, ' ');
}

function normalizedLines(comment: string): string[] {
  const inner = comment.startsWith('/**') && comment.endsWith('*/') ? comment.slice(3, -2) : comment;
  return inner.split(/\r?\n/u).map((line) => normalizeLine(line));
}

function parseTag(line: string): ForgeWebScriptDocumentationTag {
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

export function parseForgeWebScriptDocumentation(comment: string): ForgeWebScriptDocumentation {
  const lines = normalizedLines(comment);
  const descriptionLines: string[] = [];
  const tags: ForgeWebScriptDocumentationTag[] = [];
  let currentTag: ForgeWebScriptDocumentationTag | undefined;
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

  const paragraphs: string[] = [];
  let paragraph: string[] = [];
  for (const line of descriptionLines) {
    if (line.length === 0) {
      if (paragraph.length > 0) paragraphs.push(normalizeParagraph(paragraph));
      paragraph = [];
    } else paragraph.push(line);
  }
  if (paragraph.length > 0) paragraphs.push(normalizeParagraph(paragraph));

  return { description: paragraphs.join('\n\n'), tags };
}

export function renderForgeWebScriptDocumentation(documentation: ForgeWebScriptDocumentation): string {
  const tagLines = documentation.tags.map(({ name, subject, text }) =>
    [`@${name}`, subject, text].filter((part): part is string => part !== undefined && part.length > 0).join(' '),
  );
  return [documentation.description, ...tagLines].filter((part) => part.length > 0).join('\n\n');
}
