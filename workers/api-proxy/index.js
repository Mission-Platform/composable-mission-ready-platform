/**;
 * @mission-platform/workers/api-proxy
 *
 * A Cloudflare Worker that proxies requests to another service.
 * This is an example worker implementation for the Mission Platform.
 */

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      
      // Change hostname to target service
      url.hostname = 'api.example.com';
      
      // Create new request with same method and headers
      constnewRequest = new Request(url.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
      });
      
      // Fetch from target service
      const response = await fetch(newRequest);
      
      // Return the response
      return response;
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response('Proxy error: ' + error.message, { status: 500 });
    }
  }
};