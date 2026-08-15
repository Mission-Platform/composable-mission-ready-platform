// Domain types for server-side network speed testing. Kept free of any Worker
// runtime dependency so they can be shared with the React client.

/** Supported speed-test providers. */
export type SpeedProviderId = 'cloudflare' | 'fast' | 'speedtest';

/** Runtime list of supported speed-test provider identifiers. */
export const SPEED_PROVIDER_IDS = ['cloudflare', 'fast', 'speedtest'] as const satisfies readonly SpeedProviderId[];

/** Narrow an unknown value to a supported speed-test provider identifier. */
export function isSpeedProviderId(value: unknown): value is SpeedProviderId {
  return typeof value === 'string' && (SPEED_PROVIDER_IDS as readonly string[]).includes(value);
}

/** Static description of a provider. */
export interface SpeedProviderMeta {
  id: SpeedProviderId;
  name: string;
  /** Human-friendly note about how the measurement is taken. */
  description: string;
}

/** A single speed-test measurement (one point in the speed time series). */
export interface SpeedResult {
  provider: SpeedProviderId;
  /** Unix epoch milliseconds when the test completed. */
  ts: number;
  /** Measured download throughput in megabits per second. */
  downloadMbps: number;
  /** Measured upload throughput in Mbps, or `null` when not supported. */
  uploadMbps: number | null;
  /** Unloaded latency estimate in milliseconds. */
  latencyMs: number;
  /** Number of bytes transferred for the download measurement. */
  bytes: number;
  /** Whether the test produced a usable download figure. */
  ok: boolean;
  /** Error message when the test failed, otherwise `null`. */
  error: string | null;
}

/** Rolled-up view of a provider across the retained window. */
export interface SpeedStatus {
  provider: SpeedProviderMeta;
  latest: SpeedResult | null;
  avgDownloadMbps: number;
  maxDownloadMbps: number;
  sampleCount: number;
}

/** Payload returned by `GET /api/speed`. */
export interface SpeedResponse {
  now: number;
  /** Interval between scheduled speed tests, in seconds. */
  intervalSeconds: number;
  /** Whether scheduled speed testing is enabled. */
  enabled: boolean;
  providers: SpeedStatus[];
}

/** Payload returned by `GET /api/speed/series`. */
export interface SpeedSeriesResponse {
  provider: SpeedProviderId;
  now: number;
  since: number;
  samples: SpeedResult[];
}
