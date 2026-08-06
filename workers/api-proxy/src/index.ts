/**
 * @mission-platform/api-proxy
 *
 * A Cloudflare Worker that proxies requests to another service.
 * This is an example worker implementation for the Mission Platform.
 */

/** The upstream host that incoming requests are proxied to. */
const TARGET_HOSTNAME = 'api.example.com';

export default {
  async fetch(request: Request, _environment: unknown, _context: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Change hostname to target service
      url.hostname = TARGET_HOSTNAME;

      // Create new request with same method and headers
      const newRequest = new Request(url.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow',
      });

      // Fetch from target service and return the response
      return await fetch(newRequest);
    } catch (error) {
      console.error('Proxy error:', error);
      const message = error instanceof Error ? error.message : String(error);
      return new Response('Proxy error: ' + message, { status: 500 });
    }
  },
} satisfies ExportedHandler;
