import { withSecurityHeaders } from '@mission-platform/edge-security';

/**
 * @mission-platform/api-proxy
 *
 * A Cloudflare Worker that proxies requests to another service.
 * This is an example worker implementation for the Mission Platform.
 */

/** The only upstream origin that this worker can contact. */
const TARGET_ORIGIN = 'https://api.example.com';
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Keep the proxy read-only and limited to the documented API routes. */
export const ALLOWED_METHODS = new Set(['GET', 'HEAD']);
export const ALLOWED_ROUTE_PREFIXES = ['/users/', '/v1/'];

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'cookie',
  'authorization',
  'host',
]);

/**
 * Safely decodes a URL pathname, rejecting malformed URI encodings and traversal attempts.
 *
 * @param pathname - Raw encoded pathname from incoming request URL.
 * @returns Decoded pathname string or undefined if malformed or containing traversal patterns.
 */
function getDecodedPathname(pathname: string): string | undefined {
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  if (/(?:^|\/)\.\.(?:\/|$)/.test(decodedPathname) || decodedPathname.includes('\\')) return undefined;
  return decodedPathname;
}

/**
 * Checks whether a pathname matches allowed public route prefixes.
 *
 * @param pathname - The decoded URL pathname.
 * @returns True if the path is permitted for proxy forwarding.
 */
function isAllowedPath(pathname: string): boolean {
  const decodedPathname = getDecodedPathname(pathname);
  if (!decodedPathname) return false;

  return ALLOWED_ROUTE_PREFIXES.some(
    (prefix) => decodedPathname === prefix.slice(0, -1) || decodedPathname.startsWith(prefix),
  );
}

/**
 * Validates that a target URL originates from the trusted upstream origin and targets an allowed route.
 *
 * @param url - Destination URL to check.
 * @param method - The HTTP method to validate.
 * @returns True if target URL is within the allowed origin and routing whitelist.
 */
function isAllowedProxyTarget(url: URL, method: string): boolean {
  return url.origin === TARGET_ORIGIN && ALLOWED_METHODS.has(method) && isAllowedPath(url.pathname);
}

/**
 * Determines whether an incoming client request is permitted by proxy policy.
 *
 * @param request - Incoming HTTP Request.
 * @returns True if method and path are within the proxy allowlist.
 */
export function isAllowedProxyRequest(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return ALLOWED_METHODS.has(request.method) && isAllowedPath(pathname);
}

/**
 * Creates a sanitized copy of headers by stripping hop-by-hop and sensitive headers.
 *
 * @param headers - Original request headers.
 * @returns Sanitized Headers collection safe for forwarding.
 */
function createSanitizedHeaders(headers: Headers): Headers {
  const sanitized = new Headers();
  for (const [name, value] of headers) {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) sanitized.set(name, value);
  }
  return sanitized;
}

/**
 * Constructs a new Request directed at the fixed upstream origin.
 *
 * @param request - Original client request.
 * @param upstreamUrl - Optional explicit upstream URL for redirects.
 * @returns New Request instance configured for manual redirect handling.
 */
function createUpstreamRequest(request: Request, upstreamUrl?: URL): Request {
  const incomingUrl = new URL(request.url);
  const targetUrl = upstreamUrl ?? new URL(`${TARGET_ORIGIN}${incomingUrl.pathname}${incomingUrl.search}`);
  return new Request(targetUrl, {
    method: request.method,
    headers: createSanitizedHeaders(request.headers),
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  });
}

/**
 * Resolves and validates a redirect location header against allowed upstream policy.
 *
 * @param location - Location header value from redirect response.
 * @param currentUrl - Base URL for relative resolution.
 * @param method - HTTP request method.
 * @returns Resolved URL if valid and allowed, or undefined otherwise.
 */
function resolveRedirectTarget(location: string, currentUrl: string, method: string): URL | undefined {
  try {
    const redirectedUrl = new URL(location, currentUrl);
    if (redirectedUrl.username || redirectedUrl.password) return undefined;
    return isAllowedProxyTarget(redirectedUrl, method) ? redirectedUrl : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetches the upstream resource, following valid same-origin redirects up to the maximum redirect limit.
 *
 * @param request - Original client request.
 * @returns Upstream Response or 502 Bad Gateway response on invalid redirect or exhaustion.
 */
async function fetchUpstream(request: Request): Promise<Response> {
  let upstreamRequest = createUpstreamRequest(request);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(upstreamRequest);
    if (!REDIRECT_STATUSES.has(response.status)) return response;

    const location = response.headers.get('Location');
    if (!location || redirectCount === MAX_REDIRECTS) return new Response('Bad gateway', { status: 502 });

    const targetUrl = resolveRedirectTarget(location, upstreamRequest.url, request.method);
    if (!targetUrl) return new Response('Bad gateway', { status: 502 });

    upstreamRequest = createUpstreamRequest(request, targetUrl);
  }

  return new Response('Bad gateway', { status: 502 });
}

export default withSecurityHeaders({
  async fetch(request: Request, _environment: unknown, _context: ExecutionContext): Promise<Response> {
    if (!isAllowedProxyRequest(request)) {
      return new Response('Not found', { status: 404 });
    }

    try {
      return await fetchUpstream(request);
    } catch {
      console.error('Proxy upstream request failed');
      return new Response('Bad gateway', { status: 502 });
    }
  },
}) satisfies ExportedHandler;
