import type { CspDirectives } from './types';

export const DEFAULT_CSP_DIRECTIVES: CspDirectives = Object.freeze({
  defaultSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  frameAncestors: ["'none'"],
});

const DIRECTIVE_MAP: readonly (readonly [keyof CspDirectives, string])[] = [
  ['defaultSrc', 'default-src'],
  ['scriptSrc', 'script-src'],
  ['scriptSrcElem', 'script-src-elem'],
  ['scriptSrcAttr', 'script-src-attr'],
  ['styleSrc', 'style-src'],
  ['styleSrcElem', 'style-src-elem'],
  ['styleSrcAttr', 'style-src-attr'],
  ['imgSrc', 'img-src'],
  ['connectSrc', 'connect-src'],
  ['fontSrc', 'font-src'],
  ['objectSrc', 'object-src'],
  ['mediaSrc', 'media-src'],
  ['frameSrc', 'frame-src'],
  ['childSrc', 'child-src'],
  ['workerSrc', 'worker-src'],
  ['manifestSrc', 'manifest-src'],
  ['baseUri', 'base-uri'],
  ['formAction', 'form-action'],
  ['frameAncestors', 'frame-ancestors'],
  ['upgradeInsecureRequests', 'upgrade-insecure-requests'],
  ['blockAllMixedContent', 'block-all-mixed-content'],
] as const;

export function createCspPolicy(customDirectives?: CspDirectives): string {
  const merged: CspDirectives = customDirectives
    ? { ...DEFAULT_CSP_DIRECTIVES, ...customDirectives }
    : DEFAULT_CSP_DIRECTIVES;

  const parts: string[] = [];

  for (const [key, directive] of DIRECTIVE_MAP) {
    const value = merged[key];
    if (value === undefined || value === false) {
      continue;
    }
    if (value === true) {
      parts.push(directive);
      continue;
    }
    if (Array.isArray(value) && value.length > 0) {
      parts.push(`${directive} ${value.join(' ')}`);
    }
  }

  return parts.join('; ');
}
