import { createCspPolicy } from './csp';

import type { HstsOptions, PermissionsPolicyDirectives, SecurityHeaderOptions } from './types';

export const DEFAULT_HSTS_OPTIONS: HstsOptions = Object.freeze({
  maxAge: 31_536_000,
  includeSubDomains: true,
  preload: true,
});

export function formatHsts(options: HstsOptions = DEFAULT_HSTS_OPTIONS): string {
  const maxAge = options.maxAge ?? DEFAULT_HSTS_OPTIONS.maxAge;
  const parts = [`max-age=${maxAge}`];
  if (options.includeSubDomains ?? true) {
    parts.push('includeSubDomains');
  }
  if (options.preload ?? true) {
    parts.push('preload');
  }
  return parts.join('; ');
}

export function formatPermissionsPolicy(directives: PermissionsPolicyDirectives): string {
  const parts: string[] = [];
  for (const [feature, allowlist] of Object.entries(directives)) {
    if (allowlist.length === 0) {
      parts.push(`${feature}=()`);
    } else {
      const formatted = allowlist
        .map((item) => (item === 'self' || item === '*' || item === 'none' ? item : `"${item}"`))
        .join(' ');
      parts.push(`${feature}=(${formatted})`);
    }
  }
  return parts.join(', ');
}

export function createSecurityHeaders(options?: SecurityHeaderOptions): Headers {
  const headers = new Headers();

  // 1. Content-Security-Policy
  if (options?.csp !== false) {
    const cspValue = typeof options?.csp === 'object' ? createCspPolicy(options.csp) : createCspPolicy();
    if (cspValue.length > 0) {
      headers.set('Content-Security-Policy', cspValue);
    }
  }

  // 2. Strict-Transport-Security
  if (options?.hsts !== false) {
    const hstsValue = typeof options?.hsts === 'object' ? formatHsts(options.hsts) : formatHsts();
    headers.set('Strict-Transport-Security', hstsValue);
  }

  // 3. X-Content-Type-Options
  if (options?.contentTypeOptions !== false) {
    headers.set('X-Content-Type-Options', 'nosniff');
  }

  // 4. X-Frame-Options
  if (options?.frameOptions !== false) {
    headers.set('X-Frame-Options', options?.frameOptions ?? 'DENY');
  }

  // 5. Referrer-Policy
  if (options?.referrerPolicy !== false) {
    headers.set('Referrer-Policy', options?.referrerPolicy ?? 'strict-origin-when-cross-origin');
  }

  // 6. X-XSS-Protection
  if (options?.xssProtection !== false) {
    headers.set('X-XSS-Protection', typeof options?.xssProtection === 'string' ? options.xssProtection : '0');
  }

  // 7. Permissions-Policy
  if (options?.permissionsPolicy && typeof options.permissionsPolicy === 'object') {
    headers.set('Permissions-Policy', formatPermissionsPolicy(options.permissionsPolicy));
  }

  // 8. COOP / CORP
  if (options?.crossOriginOpenerPolicy) {
    headers.set('Cross-Origin-Opener-Policy', options.crossOriginOpenerPolicy);
  }
  if (options?.crossOriginResourcePolicy) {
    headers.set('Cross-Origin-Resource-Policy', options.crossOriginResourcePolicy);
  }

  return headers;
}

export function applySecurityHeaders(response: Response, options?: SecurityHeaderOptions): Response {
  const securityHeaders = createSecurityHeaders(options);

  // Attempt in-place mutation first (zero allocations, supports existing reference assertions)
  try {
    for (const [key, value] of securityHeaders.entries()) {
      response.headers.set(key, value);
    }
    return response;
  } catch {
    // Immutable response headers (e.g. from real fetch): reconstruct response
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of securityHeaders.entries()) {
      newHeaders.set(key, value);
    }
    const body = response.status === 204 || response.status === 304 ? undefined : response.body;
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
}
