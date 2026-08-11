import { normalizeDocument } from '../ast/validation';

import type { ContentAlign, ContentBlock, ContentBuilder, ContentInline } from '../ast';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function escapeMarkdown(value: string): string {
  return value.replaceAll(/([\\`*_[\]<>#])/g, String.raw`\$1`);
}

function style(align: ContentAlign | undefined): string {
  return align === undefined ? '' : ` style="text-align:${align}"`;
}

function markdownInline(inline: ContentInline): string {
  if (inline.type === 'text') {
    let value = escapeMarkdown(inline.value);
    for (const mark of inline.marks ?? []) {
      if (mark.type === 'strong') value = `**${value}**`;
      if (mark.type === 'emphasis') value = `*${value}*`;
      if (mark.type === 'strikethrough') value = `~~${value}~~`;
      if (mark.type === 'underline') value = `<u>${value}</u>`;
    }
    return value;
  }
  if (inline.type === 'inline-code') return `\`${inline.value.replaceAll('`', '\\`')}\``;
  if (inline.type === 'raw-html') return inline.value;
  if (inline.type === 'image')
    return `![${escapeMarkdown(inline.alt)}](${inline.src}${inline.title ? ` "${inline.title}"` : ''})`;
  return `[${inline.children.map((child) => markdownInline(child)).join('')}](${inline.url}${inline.title ? ` "${inline.title}"` : ''})`;
}

function markdownBlock(block: ContentBlock, depth = 0): string {
  if (block.type === 'paragraph') return block.children.map((child) => markdownInline(child)).join('');
  if (block.type === 'heading')
    return `${'#'.repeat(block.level)} ${block.children.map((child) => markdownInline(child)).join('')}`;
  if (block.type === 'image')
    return `![${escapeMarkdown(block.alt)}](${block.src}${block.title ? ` "${block.title}"` : ''})`;
  if (block.type === 'raw-html') return block.value;
  if (block.type === 'code') return `\`\`\`${block.language ?? ''}\n${block.value}\n\`\`\``;
  if (block.type === 'quote')
    return block.children
      .map((child) => markdownBlock(child, depth))
      .join('\n')
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
  const marker = block.ordered ? (index: number) => `${(block.start ?? 1) + index}. ` : () => '- ';
  return block.items
    .map((item, index) =>
      item.children
        .map((child) => markdownBlock(child, depth + 1))
        .join('\n')
        .split('\n')
        .map((line, lineIndex) => `${lineIndex === 0 ? marker(index) : '  '}${line}`)
        .join('\n'),
    )
    .join('\n');
}

export const toMarkdown: ContentBuilder<string> = (document) =>
  normalizeDocument(document)
    .children.map((block) => markdownBlock(block))
    .join('\n\n');

function htmlInline(inline: ContentInline): string {
  if (inline.type === 'text') {
    let value = escapeHtml(inline.value);
    for (const mark of inline.marks ?? []) {
      if (mark.type === 'strong') value = `<strong>${value}</strong>`;
      if (mark.type === 'emphasis') value = `<em>${value}</em>`;
      if (mark.type === 'underline') value = `<u>${value}</u>`;
      if (mark.type === 'strikethrough') value = `<del>${value}</del>`;
    }
    return value;
  }
  if (inline.type === 'inline-code') return `<code>${escapeHtml(inline.value)}</code>`;
  if (inline.type === 'raw-html') return inline.value;
  if (inline.type === 'image')
    return `<img src="${escapeHtml(inline.src)}" alt="${escapeHtml(inline.alt)}"${inline.title ? ` title="${escapeHtml(inline.title)}"` : ''}>`;
  return `<a href="${escapeHtml(inline.url)}"${inline.title ? ` title="${escapeHtml(inline.title)}"` : ''}>${inline.children.map((child) => htmlInline(child)).join('')}</a>`;
}

function htmlBlock(block: ContentBlock): string {
  if (block.type === 'paragraph')
    return `<p${style(block.align)}>${block.children.map((child) => htmlInline(child)).join('')}</p>`;
  if (block.type === 'heading')
    return `<h${block.level}${style(block.align)}>${block.children.map((child) => htmlInline(child)).join('')}</h${block.level}>`;
  if (block.type === 'image')
    return `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}"${block.title ? ` title="${escapeHtml(block.title)}"` : ''}${style(block.align)}>`;
  if (block.type === 'raw-html') return block.value;
  if (block.type === 'code')
    return `<pre${style(block.align)}><code${block.language ? ` class="language-${escapeHtml(block.language)}"` : ''}>${escapeHtml(block.value)}</code></pre>`;
  if (block.type === 'quote')
    return `<blockquote${style(block.align)}>${block.children.map((child) => htmlBlock(child)).join('')}</blockquote>`;
  const tag = block.ordered ? 'ol' : 'ul';
  const start = block.ordered && block.start !== undefined ? ` start="${block.start}"` : '';
  return `<${tag}${start}${style(block.align)}>${block.items.map((item) => `<li>${item.children.map((child) => htmlBlock(child)).join('')}</li>`).join('')}</${tag}>`;
}

export const toHtml: ContentBuilder<string> = (document) =>
  normalizeDocument(document)
    .children.map((block) => htmlBlock(block))
    .join('');
