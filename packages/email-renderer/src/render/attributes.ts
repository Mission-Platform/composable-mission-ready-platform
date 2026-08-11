import { escapeHtml, isUrlAttribute, validateUrl } from './escape';
import { serializeStyle } from './style';

import type { EmailProperties, EmailStyle } from './types';

const ALLOWED_ATTRIBUTES = new Set([
  'alt',
  'align',
  'aria-label',
  'aria-hidden',
  'background',
  'bgcolor',
  'border',
  'cellpadding',
  'cellspacing',
  'charset',
  'class',
  'colspan',
  'dir',
  'height',
  'href',
  'id',
  'lang',
  'name',
  'rel',
  'role',
  'rowspan',
  'size',
  'src',
  'style',
  'tabindex',
  'target',
  'title',
  'valign',
  'width',
]);
const FORGE_COMPILER_ATTRIBUTES = new Set(['__self', '__source']);

function normalizeAttributeName(name: string): string {
  return name.toLowerCase();
}

function isAllowedAttribute(name: string): boolean {
  return ALLOWED_ATTRIBUTES.has(name) || name.startsWith('aria-') || name.startsWith('data-');
}

/** Serialize an allowlisted set of Forge properties in deterministic order. */
export function serializeAttributes(properties: EmailProperties): string {
  return Object.entries(properties)
    .filter(([name]) => name !== 'children' && !FORGE_COMPILER_ATTRIBUTES.has(name))
    .map(([rawName, value]) => {
      const name = normalizeAttributeName(rawName);
      if (!isAllowedAttribute(name)) {
        throw new Error(`Email attribute "${rawName}" is not allowed.`);
      }
      if (name.startsWith('on')) {
        throw new Error(`Email event attribute "${rawName}" is not allowed.`);
      }
      if (value === null || value === undefined || value === false) {
        return;
      }

      if (name === 'style') {
        return [name, serializeStyle(value as EmailStyle | string)] as const;
      }

      const stringValue = String(value);
      return [name, isUrlAttribute(name) ? validateUrl(stringValue, name) : stringValue] as const;
    })
    .filter((attribute): attribute is readonly [string, string] => attribute !== undefined && attribute[1] !== '')
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join('');
}
