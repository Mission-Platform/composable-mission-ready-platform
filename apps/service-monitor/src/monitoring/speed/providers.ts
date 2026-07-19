import type { SpeedProviderId, SpeedProviderMeta, SpeedResult } from './types';

/** Abort any single network operation that exceeds this budget. */
const OP_TIMEOUT_MS = 20_000;

/** A server-side speed-test integration. */
export interface SpeedProvider {
  meta: SpeedProviderMeta;
  /**
   * Run a measurement. Implementations must never throw — a failed test is
   * reported as a {@link SpeedResult} with `ok: false` and a populated `error`
   * so that scheduling and storage keep working.
   */
  run(bytes: number): Promise<SpeedResult>;
}

/** Convert a byte count observed over a duration into megabits per second. */
function toMbps(bytes: number, ms: number): number {
  return (bytes * 8) / (Math.max(ms, 1) / 1000) / 1_000_000;
}

/** Download a URL and report the number of bytes read and elapsed time. */
async function timedDownload(url: string, init?: RequestInit): Promise<{ bytes: number; ms: number }> {
  const start = Date.now();
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(OP_TIMEOUT_MS),
    headers: { 'user-agent': 'mission-platform-service-monitor/1.0', ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return { bytes: buffer.byteLength, ms: Date.now() - start };
}

/** Upload a zero-filled body of `bytes` and report the throughput. */
async function timedUpload(url: string, bytes: number): Promise<number> {
  const body = new Uint8Array(bytes);
  const start = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(OP_TIMEOUT_MS),
    headers: { 'content-type': 'application/octet-stream' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  await response.arrayBuffer();
  return toMbps(bytes, Date.now() - start);
}

/** Best-effort latency probe; returns `0` if it cannot be measured. */
async function safeLatency(url: string): Promise<number> {
  try {
    const start = Date.now();
    const response = await fetch(url, { signal: AbortSignal.timeout(OP_TIMEOUT_MS), cache: 'no-store' });
    await response.arrayBuffer();
    return Date.now() - start;
  } catch {
    return 0;
  }
}

/** Build a failed {@link SpeedResult} from a caught error. */
function failure(provider: SpeedProviderId, ts: number, error: unknown): SpeedResult {
  return {
    provider,
    ts,
    downloadMbps: 0,
    uploadMbps: null,
    latencyMs: 0,
    bytes: 0,
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Cloudflare speed test via `speed.cloudflare.com`. The `__down` endpoint
 * streams an arbitrary number of bytes and `__up` accepts an upload body, which
 * makes it the most reliable of the three to run from a Worker.
 */
const cloudflareProvider: SpeedProvider = {
  meta: {
    id: 'cloudflare',
    name: 'Cloudflare',
    description: 'speed.cloudflare.com __down/__up endpoints',
  },
  async run(bytes: number): Promise<SpeedResult> {
    const ts = Date.now();
    try {
      const latencyMs = await safeLatency('https://speed.cloudflare.com/__down?bytes=0');
      const { bytes: downloaded, ms } = await timedDownload(`https://speed.cloudflare.com/__down?bytes=${bytes}`);

      let uploadMbps: number | null = null;
      try {
        uploadMbps = await timedUpload('https://speed.cloudflare.com/__up', Math.min(bytes, 5_000_000));
      } catch {
        uploadMbps = null;
      }

      return {
        provider: 'cloudflare',
        ts,
        downloadMbps: toMbps(downloaded, ms),
        uploadMbps,
        latencyMs,
        bytes: downloaded,
        ok: downloaded > 0,
        error: null,
      };
    } catch (error) {
      return failure('cloudflare', ts, error);
    }
  },
};

/**
 * Netflix Fast.com. The public API is token-gated: the token is embedded in the
 * site's app bundle, so we scrape it, ask the API for a measurement target, and
 * download a bounded range from it.
 */
const fastProvider: SpeedProvider = {
  meta: {
    id: 'fast',
    name: 'Fast.com',
    description: 'Netflix api.fast.com measurement targets',
  },
  async run(bytes: number): Promise<SpeedResult> {
    const ts = Date.now();
    try {
      const token = await fetchFastToken();
      const apiUrl = `https://api.fast.com/netflix/speedtest/v2?https=true&token=${token}&urlCount=1`;
      const api = (await fetchJson<{ targets?: { url: string }[] }>(apiUrl)).targets ?? [];
      const target = api[0]?.url;
      if (!target) {
        throw new Error('no measurement targets returned');
      }

      const rangedUrl = (limit: number) => target.replace('/speedtest?', `/speedtest/range/0-${limit}?`);
      const latencyMs = (await safeLatency(rangedUrl(1))) || 0;
      const { bytes: downloaded, ms } = await timedDownload(rangedUrl(bytes));

      return {
        provider: 'fast',
        ts,
        downloadMbps: toMbps(downloaded, ms),
        uploadMbps: null,
        latencyMs,
        bytes: downloaded,
        ok: downloaded > 0,
        error: null,
      };
    } catch (error) {
      return failure('fast', ts, error);
    }
  },
};

/**
 * Ookla Speedtest. Their JS API exposes a list of nearby servers; we pick one
 * and pull a sized payload from its download endpoint. Public Ookla servers are
 * heterogeneous, so this path is the most likely to occasionally fail — which
 * is surfaced as an error result rather than throwing.
 */
const speedtestProvider: SpeedProvider = {
  meta: {
    id: 'speedtest',
    name: 'Speedtest',
    description: 'Ookla speedtest.net server download endpoint',
  },
  async run(bytes: number): Promise<SpeedResult> {
    const ts = Date.now();
    try {
      const servers = await fetchJson<Array<{ host: string; url: string; name: string }>>(
        'https://www.speedtest.net/api/js/servers?engine=js&https_functional=true&limit=1',
      );
      const server = servers[0];
      if (!server?.host) {
        throw new Error('no servers returned');
      }

      const base = `https://${server.host}`;
      const latencyMs = await safeLatency(`${base}/download?size=1&nocache=${Date.now()}`);
      const { bytes: downloaded, ms } = await timedDownload(`${base}/download?size=${bytes}&nocache=${Date.now()}`);

      return {
        provider: 'speedtest',
        ts,
        downloadMbps: toMbps(downloaded, ms),
        uploadMbps: null,
        latencyMs,
        bytes: downloaded,
        ok: downloaded > 0,
        error: null,
      };
    } catch (error) {
      return failure('speedtest', ts, error);
    }
  },
};

/** Fetch JSON with a shared timeout and non-2xx guard. */
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(OP_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

/** Scrape the current Fast.com API token from the site's app bundle. */
async function fetchFastToken(): Promise<string> {
  const homeResponse = await fetch('https://fast.com/', { signal: AbortSignal.timeout(OP_TIMEOUT_MS) });
  const html = await homeResponse.text();
  const scriptName = html.match(/app-[^"']+\.js/)?.[0];
  if (!scriptName) {
    throw new Error('could not locate app bundle');
  }

  const scriptResponse = await fetch(`https://fast.com/${scriptName}`, {
    signal: AbortSignal.timeout(OP_TIMEOUT_MS),
  });
  const script = await scriptResponse.text();
  const token = script.match(/token:"([^"]+)"/)?.[1];
  if (!token) {
    throw new Error('could not locate API token');
  }
  return token;
}

/** All providers, in display order. */
export const SPEED_PROVIDERS: readonly SpeedProvider[] = [cloudflareProvider, fastProvider, speedtestProvider];

/** Provider metadata, in display order. */
export const SPEED_PROVIDER_META: readonly SpeedProviderMeta[] = SPEED_PROVIDERS.map((provider) => provider.meta);
