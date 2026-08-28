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

function isAllowedPath(pathname: string): boolean {
  const decodedPathname = getDecodedPathname(pathname);
  if (!decodedPathname) return false;

  return ALLOWED_ROUTE_PREFIXES.some(
    (prefix) => decodedPathname === prefix.slice(0, -1) || decodedPathname.startsWith(prefix),
  );
}

function isAllowedProxyTarget(url: URL, method: string): boolean {
  return url.origin === TARGET_ORIGIN && ALLOWED_METHODS.has(method) && isAllowedPath(url.pathname);
}

export function isAllowedProxyRequest(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return ALLOWED_METHODS.has(request.method) && isAllowedPath(pathname);
}

function createSanitizedHeaders(headers: Headers): Headers {
  const sanitized = new Headers();
  for (const [name, value] of headers) {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) sanitized.set(name, value);
  }
  return sanitized;
}

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

async function fetchUpstream(request: Request): Promise<Response> {
  let upstreamRequest = createUpstreamRequest(request);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(upstreamRequest);
    if (!REDIRECT_STATUSES.has(response.status)) return response;

    const location = response.headers.get('Location');
    if (!location || redirectCount === MAX_REDIRECTS) return new Response('Bad gateway', { status: 502 });

    let redirectedUrl: URL;
    try {
      redirectedUrl = new URL(location, upstreamRequest.url);
    } catch {
      return new Response('Bad gateway', { status: 502 });
    }
    if (redirectedUrl.username || redirectedUrl.password || !isAllowedProxyTarget(redirectedUrl, request.method)) {
      return new Response('Bad gateway', { status: 502 });
    }

    upstreamRequest = createUpstreamRequest(request, redirectedUrl);
  }

  return new Response('Bad gateway', { status: 502 });
}

export default {
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
} satisfies ExportedHandler;
