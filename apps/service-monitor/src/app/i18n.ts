import { createMpI18n, mpNamespace } from '@mission-platform/i18n';

import type { MpI18n } from '@mission-platform/i18n';

/** The app's own i18n namespace (`mp.service-monitor`). */
export const APP_NAMESPACE = mpNamespace('service-monitor');

/**
 * The app's English source strings, keyed under its own `mp.service-monitor`
 * namespace. The client bundles these directly (the app is single-locale for
 * now); additional locales can be merged in later via `deepMergeLocales`.
 */
export const messages = {
  en: {
    nav: {
      dashboard: 'Dashboard',
      monitors: 'Monitors',
    },
    dashboard: {
      title: 'Service Monitor',
      subtitle:
        'Server-side health checks (default every {interval}s, per-monitor overrides), stored as a time series on the edge.',
      live: 'Live',
      reconnecting: 'Reconnecting…',
      servicesLabel: 'Monitored services',
      latency: '{name} · latency',
      manageMonitors: 'Manage monitors',
      stat: {
        type: 'Type',
        interval: 'Interval',
        uptime: 'Uptime',
        avgLatency: 'Avg latency',
        samples: 'Samples',
        lastStatus: 'Last status',
      },
    },
    state: {
      up: 'Operational',
      degraded: 'Degraded',
      down: 'Down',
    },
    speed: {
      title: 'Network speed',
      enabled: 'Server-side speed tests every {interval}s (Cloudflare, Fast.com, Speedtest).',
      disabled: 'Scheduled speed tests are disabled — run one on demand.',
      run: 'Run test',
      running: 'Running…',
      chartTitle: '{name} · download over time',
      chartHint: 'Mbps',
      chartEmpty: 'Run a few tests to chart this provider…',
      down: '{value} Mbps down',
      up: '{value} Mbps up',
      pending: 'No measurement yet',
      failed: 'Failed',
    },
    monitors: {
      title: 'Monitors',
      subtitle: 'Configured at runtime · default interval {interval}s.',
      backToDashboard: 'Back to dashboard',
      remove: 'Remove',
      removeAria: 'Remove {name}',
      add: 'Add monitor',
      saving: 'Saving…',
      field: {
        id: 'id',
        name: 'Name',
        type: 'Probe type',
        interval: 'Interval in seconds',
        port: 'Port',
        dnsRecord: 'DNS record type',
        graphqlQuery: 'GraphQL query',
        jsonPath: 'JSON path',
        expected: 'Expected value',
      },
      error: {
        required: 'Provide an id, a name, and a URL (HTTP/JSON/GraphQL) or host.',
        rejected: 'The server rejected this monitor. Check the fields and try again.',
      },
    },
  },
};

/**
 * The app's i18next instance. Created once per environment (server render and
 * client hydration each build their own) and provided to the interactive tree
 * through `MpI18nProvider` in {@link AppProviders}.
 */
export function createAppI18n(): MpI18n {
  return createMpI18n({ namespace: APP_NAMESPACE, messages });
}
