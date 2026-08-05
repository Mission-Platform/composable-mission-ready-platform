'use client';

import { ForgeBadge, ForgeButton, ForgeDialog, ForgeSpinner, ForgeTypography } from '@mission-platform/components';
import { useI18n } from '@mission-platform/i18n';
import { ForgeIconLightning, ForgeIconRefresh } from '@mission-platform/icons';
import { useState } from 'react';

import { type ChartPoint, TimeSeriesChart } from './time-series-chart';

import type { SpeedProviderId, SpeedResult, SpeedStatus } from '@/monitoring/speed/types';

interface SpeedPanelProperties {
  readonly providers: SpeedStatus[];
  readonly enabled: boolean;
  readonly intervalSeconds: number;
  readonly running: boolean;
  readonly onRun: () => void;
  /** Provider whose time series is charted. */
  readonly selectedProvider: SpeedProviderId | undefined;
  readonly onSelectProvider: (provider: SpeedProviderId) => void;
  /** Ordered download-speed samples for the selected provider. */
  readonly series: SpeedResult[];
}

interface SpeedGraph {
  key: 'bandwidth' | 'download' | 'upload' | 'ping' | 'latency';
  points: ChartPoint[];
  unit: 'Mbps' | 'ms';
  color: string;
}

/**
 * Network speed section: one selectable card per provider (Cloudflare,
 * Fast.com, Speedtest) with the latest download/upload/latency figures, a
 * button to trigger an immediate server-side run, and `@mission-platform/d3`
 * charts of the selected provider's throughput and latency over time.
 */
export function SpeedPanel({
  providers,
  enabled,
  intervalSeconds,
  running,
  onRun,
  selectedProvider,
  onSelectProvider,
  series,
}: SpeedPanelProperties) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const selected = providers.find((provider) => provider.provider.id === selectedProvider);
  const successfulSamples = series.filter((sample) => sample.ok);
  const downloadPoints: ChartPoint[] = successfulSamples.map((sample) => ({
    ts: sample.ts,
    value: sample.downloadMbps,
  }));
  const latencyPoints: ChartPoint[] = successfulSamples.map((sample) => ({ ts: sample.ts, value: sample.latencyMs }));
  const graphs: SpeedGraph[] = [
    { key: 'bandwidth', points: downloadPoints, unit: 'Mbps', color: 'var(--accent)' },
    { key: 'download', points: downloadPoints, unit: 'Mbps', color: 'var(--up)' },
    {
      key: 'upload',
      points: successfulSamples
        .filter((sample) => sample.uploadMbps !== null)
        .map((sample) => ({ ts: sample.ts, value: sample.uploadMbps ?? 0 })),
      unit: 'Mbps',
      color: 'var(--accent)',
    },
    { key: 'ping', points: latencyPoints, unit: 'ms', color: 'var(--degraded)' },
    { key: 'latency', points: latencyPoints, unit: 'ms', color: 'var(--down)' },
  ];

  return (
    <section
      className="speed"
      aria-label={t(($) => $.speed.title, { ns: 'mp.service-monitor', defaultValue: 'Network speed' })}
    >
      <ForgeButton onClick={() => setOpen(true)}>
        <ForgeIconLightning aria-hidden="true" />{' '}
        {t(($) => $.speed.viewReports, { ns: 'mp.service-monitor', defaultValue: 'View speed-test reports' })}
      </ForgeButton>
      <ForgeDialog
        open={open}
        title={t(($) => $.speed.reportsTitle, { ns: 'mp.service-monitor', defaultValue: 'Network speed reports' })}
        size="2xl"
        onUpdateOpen={setOpen}
        onClose={() => setOpen(false)}
      >
        <div className="speed__head">
          <div>
            <ForgeTypography
              as="h2"
              variant="h3"
              className="speed__title"
            >
              <ForgeIconLightning
                className="speed__title-icon"
                aria-hidden="true"
              />{' '}
              {t(($) => $.speed.title, { ns: 'mp.service-monitor', defaultValue: 'Network speed' })}
            </ForgeTypography>
            <ForgeTypography
              as="p"
              variant="body-sm"
              className="speed__subtitle"
            >
              {enabled
                ? t(($) => $.speed.enabled, {
                    ns: 'mp.service-monitor',
                    defaultValue: 'Server-side speed tests every {interval}s (Cloudflare, Fast.com, Speedtest).',
                    interval: intervalSeconds,
                  })
                : t(($) => $.speed.disabled, {
                    ns: 'mp.service-monitor',
                    defaultValue: 'Scheduled speed tests are disabled — run one on demand.',
                  })}
            </ForgeTypography>
          </div>
          <ForgeButton
            variant="primary"
            onClick={onRun}
            disabled={running}
            loading={running}
            className="speed__run"
          >
            {running ? <ForgeSpinner size="sm" /> : <ForgeIconRefresh aria-hidden="true" />}{' '}
            {running
              ? t(($) => $.speed.running, { ns: 'mp.service-monitor', defaultValue: 'Running…' })
              : t(($) => $.speed.run, { ns: 'mp.service-monitor', defaultValue: 'Run test' })}
          </ForgeButton>
        </div>

        <div className="speed__grid">
          {providers.map((provider) => (
            <SpeedCard
              key={provider.provider.id}
              provider={provider}
              selected={provider.provider.id === selectedProvider}
              onSelect={() => onSelectProvider(provider.provider.id)}
            />
          ))}
        </div>

        {selected ? (
          <div className="speed__charts">
            {graphs.map((graph) => (
              <div
                className="speed__chart"
                key={graph.key}
              >
                <div className="speed__chart-head">
                  <ForgeTypography
                    as="h3"
                    variant="h4"
                    className="speed__chart-title"
                  >
                    {t(($) => $.speed.graphTitle, {
                      ns: 'mp.service-monitor',
                      defaultValue: '{name} · {metric} over time',
                      name: selected.provider.name,
                      metric: t(($) => $.speed.graphMetric[graph.key], {
                        ns: 'mp.service-monitor',
                        defaultValue: graph.key,
                      }),
                    })}
                  </ForgeTypography>
                  <span className="speed__chart-hint">{graph.unit}</span>
                </div>
                <TimeSeriesChart
                  points={graph.points}
                  color={graph.color}
                  format={(value) => (value >= 100 ? value.toFixed(0) : value.toFixed(1))}
                  emptyLabel={t(($) => $.speed.chartEmpty, {
                    ns: 'mp.service-monitor',
                    defaultValue: 'Run a few tests to chart this provider…',
                  })}
                />
              </div>
            ))}
          </div>
        ) : null}
      </ForgeDialog>
    </section>
  );
}

interface SpeedCardProperties {
  provider: SpeedStatus;
  selected: boolean;
  onSelect: () => void;
}

function SpeedCard({ provider, selected, onSelect }: SpeedCardProperties) {
  const { t } = useI18n();
  const { latest } = provider;
  const failed = latest !== null && !latest.ok;

  return (
    <button
      type="button"
      className={`speed-card ${failed ? 'speed-card--failed' : ''} ${selected ? 'speed-card--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="speed-card__top">
        <span className="speed-card__name">{provider.provider.name}</span>
        <span className="speed-card__hint">{provider.provider.description}</span>
      </div>

      {latest && latest.ok ? (
        <>
          <span className="speed-card__bandwidth">
            {t(($) => $.speed.bandwidth, {
              ns: 'mp.service-monitor',
              defaultValue: 'Bandwidth {value} Mbps',
              value: formatMbps(latest.downloadMbps),
            })}
          </span>
          <span className="speed-card__metrics">
            <span>
              {t(($) => $.speed.down, {
                ns: 'mp.service-monitor',
                defaultValue: 'Download {value} Mbps',
                value: formatMbps(latest.downloadMbps),
              })}
            </span>
            <span>
              {latest.uploadMbps === null
                ? t(($) => $.speed.uploadUnavailable, {
                    ns: 'mp.service-monitor',
                    defaultValue: 'Upload unavailable',
                  })
                : t(($) => $.speed.up, {
                    ns: 'mp.service-monitor',
                    defaultValue: 'Upload {value} Mbps',
                    value: formatMbps(latest.uploadMbps),
                  })}
            </span>
            <span>
              {t(($) => $.speed.ping, {
                ns: 'mp.service-monitor',
                defaultValue: 'Ping {value} ms',
                value: Math.round(latest.latencyMs),
              })}
            </span>
            <span>
              {t(($) => $.speed.latency, {
                ns: 'mp.service-monitor',
                defaultValue: 'Latency {value} ms',
                value: Math.round(latest.latencyMs),
              })}
            </span>
          </span>
          <span className="speed-card__agg">
            {t(($) => $.speed.summary, {
              ns: 'mp.service-monitor',
              defaultValue: 'avg {average} · max {maximum} · n={count}',
              average: formatMbps(provider.avgDownloadMbps),
              maximum: formatMbps(provider.maxDownloadMbps),
              count: provider.sampleCount,
            })}
          </span>
        </>
      ) : failed ? (
        <ForgeBadge
          variant="error"
          size="sm"
        >
          {latest?.error ?? t(($) => $.speed.failed, { ns: 'mp.service-monitor', defaultValue: 'Failed' })}
        </ForgeBadge>
      ) : (
        <span className="speed-card__pending">
          {t(($) => $.speed.pending, { ns: 'mp.service-monitor', defaultValue: 'No measurement yet' })}
        </span>
      )}
    </button>
  );
}

function formatMbps(mbps: number): string {
  return mbps >= 100 ? mbps.toFixed(0) : mbps.toFixed(1);
}
