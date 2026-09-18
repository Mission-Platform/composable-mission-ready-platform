import { createCspPolicy } from './csp';

import type { HstsOptions, PermissionsPolicyDirectives, SecurityHeaderOptions } from './types';

export const DEFAULT_HSTS_OPTIONS: HstsOptions = Object.freeze({
  maxAge: 31_536_000,
  includeSubDomains: true,
  preload: true,
});

/**
 * Formats Strict-Transport-Security header options into a standard HSTS header value.
 *
 * @param options - Configuration options for HSTS directives.
 * @returns The serialized Strict-Transport-Security header value.
 */
export function formatHsts(options: HstsOptions = DEFAULT_HSTS_OPTIONS): string {
  const { maxAge = DEFAULT_HSTS_OPTIONS.maxAge, includeSubDomains = true, preload = true } = options;
  const parts = [`max-age=${maxAge}`];
  if (includeSubDomains) {
    parts.push('includeSubDomains');
  }
  if (preload) {
    parts.push('preload');
  }
  return parts.join('; ');
}

/**
 * Formats an individual Permissions Policy feature directive.
 *
 * @param feature - The Permissions Policy feature name.
 * @param allowlist - List of allowed origins or keywords.
 * @returns Formatted directive string.
 */
function formatPermissionsFeature(feature: string, allowlist: readonly string[]): string {
  if (allowlist.length === 0) {
    return `${feature}=()`;
  }
  const formatted = allowlist
    .map((item) => (item === 'self' || item === '*' || item === 'none' ? item : `"${item}"`))
    .join(' ');
  return `${feature}=(${formatted})`;
}

/**
 * Serializes Permissions Policy directives into a standard header string.
 *
 * @param directives - Dictionary mapping feature names to origin allowlists.
 * @returns The serialized Permissions-Policy header value.
 */
export function formatPermissionsPolicy(directives: PermissionsPolicyDirectives): string {
  return Object.entries(directives)
    .map(([feature, allowlist]) => formatPermissionsFeature(feature, allowlist))
    .join(', ');
}

/**
 * Injects Content-Security-Policy into the target Headers collection.
 *
 * @param headers - Target Headers instance.
 * @param csp - CSP configuration options or false to disable.
 */
function applyCspHeader(headers: Headers, csp: SecurityHeaderOptions['csp']): void {
  if (csp === false) return;
  const cspValue = typeof csp === 'object' ? createCspPolicy(csp) : createCspPolicy();
  if (cspValue.length > 0) {
    headers.set('Content-Security-Policy', cspValue);
  }
}

/**
 * Injects Strict-Transport-Security into the target Headers collection.
 *
 * @param headers - Target Headers instance.
 * @param hsts - HSTS configuration options or false to disable.
 */
function applyHstsHeader(headers: Headers, hsts: SecurityHeaderOptions['hsts']): void {
  if (hsts === false) return;
  const hstsValue = typeof hsts === 'object' ? formatHsts(hsts) : formatHsts();
  headers.set('Strict-Transport-Security', hstsValue);
}

/**
 * Injects browser protection headers (nosniff, frame protection, referrer policy, XSS).
 *
 * @param headers - Target Headers instance.
 * @param options - Security header configuration options.
 */
function applyProtectionHeaders(headers: Headers, options?: SecurityHeaderOptions): void {
  if (options?.contentTypeOptions !== false) {
    headers.set('X-Content-Type-Options', 'nosniff');
  }
  if (options?.frameOptions !== false) {
    headers.set('X-Frame-Options', options?.frameOptions ?? 'DENY');
  }
  if (options?.referrerPolicy !== false) {
    headers.set('Referrer-Policy', options?.referrerPolicy ?? 'strict-origin-when-cross-origin');
  }
  if (options?.xssProtection !== false) {
    headers.set('X-XSS-Protection', typeof options?.xssProtection === 'string' ? options.xssProtection : '0');
  }
}

/**
 * Injects origin policy headers (Permissions-Policy, COOP, CORP).
 *
 * @param headers - Target Headers instance.
 * @param options - Security header configuration options.
 */
function applyPolicyHeaders(headers: Headers, options?: SecurityHeaderOptions): void {
  if (options?.permissionsPolicy && typeof options.permissionsPolicy === 'object') {
    headers.set('Permissions-Policy', formatPermissionsPolicy(options.permissionsPolicy));
  }
  if (options?.crossOriginOpenerPolicy) {
    headers.set('Cross-Origin-Opener-Policy', options.crossOriginOpenerPolicy);
  }
  if (options?.crossOriginResourcePolicy) {
    headers.set('Cross-Origin-Resource-Policy', options.crossOriginResourcePolicy);
  }
}

/**
 * Injects standard defense-in-depth headers into the target Headers collection.
 *
 * @param headers - Target Headers instance.
 * @param options - Security header configuration options.
 */
function applyStandardHeaders(headers: Headers, options?: SecurityHeaderOptions): void {
  applyProtectionHeaders(headers, options);
  applyPolicyHeaders(headers, options);
}

/**
 * Constructs a Headers collection populated with hardened defense-in-depth security headers.
 *
 * @param options - Configuration options for individual security headers.
 * @returns A Headers instance containing the configured security headers.
 */
export function createSecurityHeaders(options?: SecurityHeaderOptions): Headers {
  const headers = new Headers();
  applyCspHeader(headers, options?.csp);
  applyHstsHeader(headers, options?.hsts);
  applyStandardHeaders(headers, options);
  return headers;
}

/**
 * Reconstructs an HTTP Response with merged security headers when the original headers are immutable.
 *
 * @param response - Original immutable Response.
 * @param securityHeaders - Headers collection to merge.
 * @returns Reconstructed Response.
 */
function cloneResponseWithHeaders(response: Response, securityHeaders: Headers): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of securityHeaders.entries()) {
    newHeaders.set(key, value);
  }
  const isBodyless = response.status === 204 || response.status === 304;
  return new Response(isBodyless ? undefined : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Applies security headers to an HTTP Response, attempting in-place mutation first.
 *
 * @param response - The outgoing HTTP Response object.
 * @param options - Configuration options for the applied security headers.
 * @returns The response decorated with security headers.
 */
export function applySecurityHeaders(response: Response, options?: SecurityHeaderOptions): Response {
  const securityHeaders = createSecurityHeaders(options);

  // Attempt in-place mutation first (zero allocations, supports existing reference assertions)
  try {
    for (const [key, value] of securityHeaders.entries()) {
      response.headers.set(key, value);
    }
    return response;
  } catch {
    return cloneResponseWithHeaders(response, securityHeaders);
  }
}
