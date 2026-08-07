// Cloudflare's generated handler contract is conventionally named `Env`.
// eslint-disable-next-line unicorn/prevent-abbreviations
export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, environment: Env): Promise<Response> {
    return environment.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
