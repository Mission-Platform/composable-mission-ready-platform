/**
 * @mission-platform/api-proxy
 *
 * A Cloudflare Worker that proxies requests to another service.
 * This is an example worker implementation for the Mission Platform.
 */

/** The only upstream origin that this worker can contact. */
const TARGET_ORIGIN = 'https://api.example.com';

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

export function isAllowedProxyRequest(request: Request): boolean {
  const { pathname } = new URL(request.url);
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  if (/(?:^|\/)\.\.(?:\/|$)/.test(decodedPathname)) return false;

  return (
    ALLOWED_METHODS.has(request.method) &&
    ALLOWED_ROUTE_PREFIXES.some((prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix))
  );
}

function createSanitizedHeaders(headers: Headers): Headers {
  const sanitized = new Headers();
  for (const [name, value] of headers) {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) sanitized.set(name, value);
  }
  return sanitized;
}

function createUpstreamRequest(request: Request): Request {
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(`${TARGET_ORIGIN}${incomingUrl.pathname}${incomingUrl.search}`);
  return new Request(upstreamUrl, {
    method: request.method,
    headers: createSanitizedHeaders(request.headers),
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'follow',
  });
}

export default {
  async fetch(request: Request, _environment: unknown, _context: ExecutionContext): Promise<Response> {
    if (!isAllowedProxyRequest(request)) {
      return new Response('Not found', { status: 404 });
    }

    try {
      return await fetch(createUpstreamRequest(request));
    } catch {
      console.error('Proxy upstream request failed');
      return new Response('Bad gateway', { status: 502 });
    }
  },
} satisfies ExportedHandler;
