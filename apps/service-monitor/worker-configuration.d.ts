// Ambient types for the Cloudflare Worker environment bindings.
//
// In a deployed project these are generated with `wrangler types`. They are
// checked in here so the app type-checks without a network round-trip; keep
// them in sync with `wrangler.jsonc`.
declare namespace Cloudflare {
  interface Env {
    /** Static asset binding serving the built client bundle. */
    ASSETS: Fetcher;
    /** Durable Object that performs server-side monitoring and stores the time series. */
    MONITOR: DurableObjectNamespace<import('./src/monitoring/MonitorDurableObject').MonitorDurableObject>;
    /** JSON array of monitoring targets; empty string falls back to built-in defaults. */
    MONITOR_TARGETS: string;
    /** Interval between server-side health checks, in seconds. */
    MONITOR_INTERVAL_SECONDS: string;
    /** Retention window for individual samples, in hours. */
    MONITOR_RETENTION_HOURS: string;
    /** Set to "false" to disable scheduled speed testing. */
    SPEED_TEST_ENABLED: string;
    /** Interval between scheduled speed tests, in seconds. */
    SPEED_TEST_INTERVAL_SECONDS: string;
    /** Payload size for each download measurement, in bytes. */
    SPEED_TEST_BYTES: string;
  }
}

interface Env extends Cloudflare.Env {}
