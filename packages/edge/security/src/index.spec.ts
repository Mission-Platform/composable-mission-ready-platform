import { describe, expect, it, vi } from 'vitest';

import {
  applySecurityHeaders,
  createCspPolicy,
  createSecurityHeaders,
  formatHsts,
  formatPermissionsPolicy,
  withSecurityHeaders,
} from '.';

const mockExecutionContext = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
} satisfies ExecutionContext;

function okHandler(): Response {
  return new Response('ok');
}

function forbiddenHandler(): Response {
  return new Response('Forbidden', { status: 403 });
}

function crashHandler(): Response {
  throw new Error('Unexpected crash');
}

function propagateHandler(): Response {
  throw new Error('Propagate me');
}

describe('@mission-platform/edge-security', () => {
  describe('createCspPolicy', () => {
    it('produces strict default CSP directives when called with no arguments', () => {
      const policy = createCspPolicy();
      expect(policy).toBe("default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    });

    it('merges custom directives with default directives', () => {
      const policy = createCspPolicy({
        scriptSrc: ["'self'", 'https://static.example.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
      });

      expect(policy).toContain("default-src 'self'");
      expect(policy).toContain("object-src 'none'");
      expect(policy).toContain("base-uri 'self'");
      expect(policy).toContain("frame-ancestors 'none'");
      expect(policy).toContain("script-src 'self' https://static.example.com");
      expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    });

    it('supports boolean flag directives', () => {
      const policy = createCspPolicy({
        upgradeInsecureRequests: true,
        blockAllMixedContent: true,
      });

      expect(policy).toContain('upgrade-insecure-requests');
      expect(policy).toContain('block-all-mixed-content');
    });

    it('omits directives with empty arrays or false flags', () => {
      const policy = createCspPolicy({
        imgSrc: [],
        upgradeInsecureRequests: false,
      });

      expect(policy).not.toContain('img-src');
      expect(policy).not.toContain('upgrade-insecure-requests');
    });

    it('allows overriding default directives', () => {
      const policy = createCspPolicy({
        defaultSrc: ["'none'"],
        frameAncestors: ["'self'", 'https://partner.example.com'],
      });

      expect(policy).toContain("default-src 'none'");
      expect(policy).not.toContain("default-src 'self'");
      expect(policy).toContain("frame-ancestors 'self' https://partner.example.com");
    });
  });

  describe('formatHsts', () => {
    it('formats default HSTS parameters', () => {
      const hsts = formatHsts();
      expect(hsts).toBe('max-age=31536000; includeSubDomains; preload');
    });

    it('supports parameterized HSTS configurations', () => {
      const hsts = formatHsts({
        maxAge: 86_400,
        includeSubDomains: false,
        preload: false,
      });
      expect(hsts).toBe('max-age=86400');
    });
  });

  describe('formatPermissionsPolicy', () => {
    it('formats empty and parameterized feature directives', () => {
      const policy = formatPermissionsPolicy({
        camera: [],
        microphone: [],
        geolocation: ['self', 'https://example.com'],
      });

      expect(policy).toBe('camera=(), microphone=(), geolocation=(self "https://example.com")');
    });
  });

  describe('createSecurityHeaders', () => {
    it('creates full defensive default security headers', () => {
      const headers = createSecurityHeaders();

      expect(headers.get('Content-Security-Policy')).toBe(
        "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      );
      expect(headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains; preload');
      expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(headers.get('X-Frame-Options')).toBe('DENY');
      expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(headers.get('X-XSS-Protection')).toBe('0');
    });

    it('allows selectively disabling headers with false', () => {
      const headers = createSecurityHeaders({
        csp: false,
        hsts: false,
        contentTypeOptions: false,
        frameOptions: false,
        referrerPolicy: false,
        xssProtection: false,
      });

      expect(headers.get('Content-Security-Policy')).toBeNull();
      expect(headers.get('Strict-Transport-Security')).toBeNull();
      expect(headers.get('X-Content-Type-Options')).toBeNull();
      expect(headers.get('X-Frame-Options')).toBeNull();
      expect(headers.get('Referrer-Policy')).toBeNull();
      expect(headers.get('X-XSS-Protection')).toBeNull();
    });

    it('sets optional cross-origin and permissions headers when provided', () => {
      const headers = createSecurityHeaders({
        permissionsPolicy: { camera: [] },
        crossOriginOpenerPolicy: 'same-origin',
        crossOriginResourcePolicy: 'same-origin',
      });

      expect(headers.get('Permissions-Policy')).toBe('camera=()');
      expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
      expect(headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
    });
  });

  describe('applySecurityHeaders', () => {
    it('mutates mutable responses in place while preserving reference equality', () => {
      const original = new Response('ok', {
        status: 200,
        headers: { 'X-Custom-Header': 'preserve-me' },
      });

      const applied = applySecurityHeaders(original);

      expect(applied).toBe(original);
      expect(applied.headers.get('X-Custom-Header')).toBe('preserve-me');
      expect(applied.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(applied.headers.get('X-Frame-Options')).toBe('DENY');
      expect(applied.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });

    it('handles immutable headers gracefully by reconstructing a new Response', () => {
      const mockImmutableHeaders = new Headers({ 'Content-Type': 'text/plain' });
      vi.spyOn(mockImmutableHeaders, 'set').mockImplementation(() => {
        throw new TypeError("Can't modify immutable headers");
      });

      const original = new Response('immutable-body', {
        status: 201,
        statusText: 'Created',
        headers: { 'Content-Type': 'text/plain' },
      });
      Object.defineProperty(original, 'headers', {
        value: mockImmutableHeaders,
        configurable: true,
      });

      const applied = applySecurityHeaders(original);

      expect(applied).not.toBe(original);
      expect(applied.status).toBe(201);
      expect(applied.statusText).toBe('Created');
      expect(applied.headers.get('Content-Type')).toBe('text/plain');
      expect(applied.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('handles 204 No Content and 304 Not Modified status codes properly', () => {
      const response204 = new Response(undefined, { status: 204 });
      const applied204 = applySecurityHeaders(response204);
      expect(applied204.status).toBe(204);
      expect(applied204.headers.get('X-Content-Type-Options')).toBe('nosniff');

      const response304 = new Response(undefined, { status: 304 });
      const applied304 = applySecurityHeaders(response304);
      expect(applied304.status).toBe(304);
      expect(applied304.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('withSecurityHeaders', () => {
    it('wraps a fetch function and decorates response with security headers', async () => {
      const handler = vi.fn((_request: Request) => new Response('data', { status: 200 }));
      const wrapped = withSecurityHeaders(handler);

      const request = new Request('https://example.test/api');
      const response = await wrapped(request, {}, mockExecutionContext);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });

    it('wraps an ExportedHandler object and preserves additional properties', async () => {
      const worker = {
        customProp: 'platform-value',
        fetch(_request: Request) {
          return new Response('object-response');
        },
      };

      const secured = withSecurityHeaders(worker);

      expect(secured.customProp).toBe('platform-value');
      const response = await secured.fetch(new Request('https://example.test/'), {}, mockExecutionContext);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('supports dynamic options provider based on request/env', async () => {
      const wrapped = withSecurityHeaders(okHandler, (request) => {
        const isEmbed = new URL(request.url).searchParams.has('embed');
        return isEmbed ? { frameOptions: 'SAMEORIGIN', csp: { frameAncestors: ["'self'"] } } : { frameOptions: 'DENY' };
      });

      const normalResponse = await wrapped(new Request('https://example.test/'), {}, mockExecutionContext);
      expect(normalResponse.headers.get('X-Frame-Options')).toBe('DENY');

      const embedResponse = await wrapped(new Request('https://example.test/?embed=true'), {}, mockExecutionContext);
      expect(embedResponse.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
      expect(embedResponse.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'self'");
    });

    it('decorates error responses with security headers', async () => {
      const wrapped = withSecurityHeaders(forbiddenHandler);

      const response = await wrapped(new Request('https://example.test/'), {}, mockExecutionContext);
      expect(response.status).toBe(403);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('catches unhandled exceptions and returns 500 with security headers when catchErrors is true', async () => {
      const wrapped = withSecurityHeaders(crashHandler, { catchErrors: true });

      const response = await wrapped(new Request('https://example.test/'), {}, mockExecutionContext);
      expect(response.status).toBe(500);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });

    it('propagates unhandled exceptions when catchErrors is omitted or false', async () => {
      const wrapped = withSecurityHeaders(propagateHandler);

      await expect(wrapped(new Request('https://example.test/'), {}, mockExecutionContext)).rejects.toThrow(
        'Propagate me',
      );
    });

    it('throws TypeError if argument is neither a function nor an object with fetch', () => {
      // eslint-disable-next-line @typescript-eslint/prefer-satisfies
      expect(() => withSecurityHeaders(undefined as unknown as () => Response)).toThrow(TypeError);
      // eslint-disable-next-line @typescript-eslint/prefer-satisfies
      expect(() => withSecurityHeaders({} as unknown as () => Response)).toThrow(TypeError);
    });
  });

  describe('performance', () => {
    it('applies security headers in < 0.2 ms per request', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let index = 0; index < iterations; index += 1) {
        const testResponse = new Response('bench');
        applySecurityHeaders(testResponse);
      }

      const totalMs = performance.now() - start;
      const perRequestMs = totalMs / iterations;

      expect(perRequestMs).toBeLessThan(0.2);
    });
  });
});
