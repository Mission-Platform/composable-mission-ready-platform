export default {
  async fetch(request: Request, environment: Record<string, { fetch: typeof fetch }>): Promise<Response> {
    console.log('Base SPA worker fetching request:', request.url, environment);
    return environment.ASSETS.fetch(request);
  },
};
