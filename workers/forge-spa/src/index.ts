// Cloudflare's generated handler contract is conventionally named `Env`.
export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, environment: Env): Promise<Response> {
    return environment.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
