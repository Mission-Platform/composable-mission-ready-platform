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

/**
 * Formats an individual CSP directive name and value.
 *
 * @param directive - The CSP directive header token (e.g. `default-src`).
 * @param value - Boolean flag or array of allowed source expressions.
 * @returns Formatted directive string or undefined if omitted.
 */
function formatCspDirective(directive: string, value: CspDirectives[keyof CspDirectives]): string | undefined {
  if (value === undefined || value === false) {
    return undefined;
  }
  if (value === true) {
    return directive;
  }
  return value.length > 0 ? `${directive} ${value.join(' ')}` : undefined;
}

/**
 * Serializes Content Security Policy directives into a standard header value string.
 *
 * @param customDirectives - Optional directives to merge with baseline defaults.
 * @returns Serialized Content-Security-Policy header string.
 */
export function createCspPolicy(customDirectives?: CspDirectives): string {
  const merged: CspDirectives = customDirectives
    ? { ...DEFAULT_CSP_DIRECTIVES, ...customDirectives }
    : DEFAULT_CSP_DIRECTIVES;

  return DIRECTIVE_MAP.map(([, directive], index) => formatCspDirective(directive, merged[DIRECTIVE_MAP[index]![0]]))
    .filter((part): part is string => part !== undefined)
    .join('; ');
}
