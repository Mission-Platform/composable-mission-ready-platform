import { withSecurityHeaders } from '@mission-platform/edge-security';

// Cloudflare's generated handler contract is conventionally named `Env`.
export interface Env {
  ASSETS: Fetcher;
}

const handler: ExportedHandler<Env> = withSecurityHeaders({
  fetch(request: Request, environment: Env): Promise<Response> {
    return environment.ASSETS.fetch(request);
  },
});

export default handler;
