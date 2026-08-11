import { Fragment, isMpElement, type MpChild, type MpElement, type MpPropertyBag } from '@mission-platform/forge';

import { serializeAttributes } from './attributes';
import { escapeHtml } from './escape';

import type { EmailNode, EmailProperties, RenderEmailOptions } from './types';

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function serializeChild(child: MpChild): string {
  if (typeof child === 'string' || typeof child === 'number') {
    return escapeHtml(String(child));
  }
  if (!isMpElement(child)) {
    return '';
  }
  return serializeNode(child);
}

function serializeNode(node: MpElement): string {
  if (node.type === Fragment) {
    return node.children.map((child) => serializeChild(child)).join('');
  }

  if (typeof node.type !== 'string') {
    const properties: MpPropertyBag = { ...node.properties, children: node.children };
    return serializeNode(node.type(properties));
  }

  const tagName = node.type.toLowerCase();
  if (!/^[a-z][a-z\d-]*$/.test(tagName)) {
    throw new Error(`Email element name "${node.type}" is invalid.`);
  }

  const attributes = serializeAttributes(node.properties as EmailProperties);
  if (VOID_ELEMENTS.has(tagName)) {
    if (node.children.length > 0) {
      throw new Error(`Email void element <${tagName}> cannot have children.`);
    }
    return `<${tagName}${attributes}>`;
  }

  return `<${tagName}${attributes}>${node.children.map((child) => serializeChild(child)).join('')}</${tagName}>`;
}

function renderPreviewText(previewText: string): string {
  return `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all;">${escapeHtml(previewText)}</div>`;
}

function renderResponsiveStyles(): string {
  return '<style type="text/css">@media only screen and (max-width: 600px) { .mp-email-container { width: 100% !important; } .mp-email-stack { display: block !important; width: 100% !important; } }</style>';
}

/** Render a Forge email tree into a complete, framework-free HTML document. */
export function renderEmail(node: EmailNode, options: RenderEmailOptions = {}): string {
  if (!isMpElement(node)) {
    throw new Error('renderEmail expects a Forge email element.');
  }

  const title = options.title?.trim() || 'Email';
  const preview = options.previewText?.trim();
  const enhancementStyles = options.responsive ? renderResponsiveStyles() : '';
  const content = `${preview ? renderPreviewText(preview) : ''}${serializeNode(node)}`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title>${enhancementStyles}</head><body style="margin: 0; padding: 0;">${content}</body></html>`;
}

/** Render a Forge tree as a safe HTML fragment for browser adapter hosts. */
export function renderEmailFragment(node: EmailNode): string {
  if (!isMpElement(node)) {
    throw new Error('renderEmailFragment expects a Forge email element.');
  }
  return serializeNode(node);
}
