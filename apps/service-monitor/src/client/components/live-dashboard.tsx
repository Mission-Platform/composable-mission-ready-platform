'use client';

import { ForgeBadge, ForgeTypography } from '@mission-platform/components';
import { useI18n } from '@mission-platform/i18n';
import { ForgeIconClock, ForgeIconGlobe } from '@mission-platform/icons';
import { ForgeContainer } from '@mission-platform/layouts';
import { useObservable } from '@mission-platform/rxjs';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { EMPTY } from 'rxjs';

import { metricsStream, servicesStream, speedSeriesStream, speedStream, triggerSpeedRun } from '../hooks/streams';
import { ServiceMonitorShell } from '../layouts/service-monitor-shell';

import { SpeedPanel } from './speed-panel';
import { type ChartPoint, TimeSeriesChart } from './time-series-chart';

import type { SpeedProviderId, SpeedResponse, SpeedResult, SpeedStatus } from '@/monitoring/speed/types';
import type { HealthState, Incident, Sample, ServicesResponse, ServiceStatus } from '@/monitoring/types';

interface LiveDashboardProperties {
  readonly initialServices: ServiceStatus[];
  readonly initialIncidents: Incident[];
  readonly initialSpeed: SpeedStatus[];
  readonly intervalSeconds: number;
  readonly speedIntervalSeconds: number;
  readonly speedEnabled: boolean;
  readonly initialNow: number;
}

/** Map a health state onto the design-system tone used for badges. */
const STATE_VARIANT: Record<HealthState, 'success' | 'warning' | 'error'> = {
  // i18next-instrument-ignore
  up: 'success',
  degraded: 'warning',
  down: 'error',
};

/**
 * The interactive monitoring dashboard. All data is produced on the server;
 * this component only *reads* it, driving every live refresh through RxJS
 * streams bridged into React state via `@mission-platform/rxjs/react`'s
 * `useObservable`. Charts are rendered with `@mission-platform/d3`, and the UI
 * is built from `@mission-platform/components`, `icons`, `layout` and `i18n`.
 */
export function LiveDashboard({
  initialServices,
  initialIncidents,
  initialSpeed,
  intervalSeconds,
  speedIntervalSeconds,
  speedEnabled,
  initialNow,
}: LiveDashboardProperties) {
  const { t } = useI18n();
  const intervalMs = intervalSeconds * 1000;

  const initialResponse = useMemo<ServicesResponse>(
    () => ({ now: initialNow, intervalSeconds, services: initialServices }),
    [initialNow, intervalSeconds, initialServices],
  );

  // Overview stream: re-polls `/api/services` every interval.
  const services$ = useMemo(() => servicesStream(intervalMs), [intervalMs]);
  const streamValue = useObservable(services$, initialResponse);

  // Keep the last successful snapshot so a transient fetch failure does not
  // blank out the dashboard; `connected` reflects the latest tick.
  const [snapshot, setSnapshot] = useState<ServicesResponse>(initialResponse);
  useEffect(() => {
    if (streamValue) {
      setSnapshot(streamValue);
    }
  }, [streamValue]);
  const connected = streamValue !== null;

  const [selectedId, setSelectedId] = useState<string | undefined>(initialServices[0]?.target.id);

  // Detail stream: re-polls `/api/metrics` for the selected service only.
  const metrics$ = useMemo(
    () => (selectedId ? metricsStream(selectedId, intervalMs) : EMPTY),
    [selectedId, intervalMs],
  );
  const samples = useObservable<Sample[]>(metrics$, []);
  const latencyPoints: ChartPoint[] = useMemo(
    () => samples.map((sample) => ({ ts: sample.ts, value: sample.latencyMs })),
    [samples],
  );

  const selected = snapshot.services.find((service) => service.target.id === selectedId);

  // Speed stream: re-polls `/api/speed` so freshly scheduled or manually
  // triggered runs surface without a page reload.
  const initialSpeedResponse = useMemo<SpeedResponse>(
    () => ({ now: initialNow, intervalSeconds: speedIntervalSeconds, enabled: speedEnabled, providers: initialSpeed }),
    [initialNow, speedIntervalSeconds, speedEnabled, initialSpeed],
  );
  const speed$ = useMemo(() => speedStream(intervalMs), [intervalMs]);
  const speedValue = useObservable(speed$, initialSpeedResponse);
  const [speedSnapshot, setSpeedSnapshot] = useState<SpeedResponse>(initialSpeedResponse);
  useEffect(() => {
    if (speedValue) {
      setSpeedSnapshot(speedValue);
    }
  }, [speedValue]);

  const [selectedProvider, setSelectedProvider] = useState<SpeedProviderId | undefined>(initialSpeed[0]?.provider.id);

  // Speed detail stream: re-polls `/api/speed/series` for the selected provider
  // so its download-over-time chart stays live.
  const speedSeries$ = useMemo(
    () => (selectedProvider ? speedSeriesStream(selectedProvider, intervalMs) : EMPTY),
    [selectedProvider, intervalMs],
  );
  const speedSeries = useObservable<SpeedResult[]>(speedSeries$, []);

  const [running, setRunning] = useState(false);
  const runSpeedTest = (): void => {
    setRunning(true);
    void triggerSpeedRun().finally(() => setRunning(false));
  };

  return (
    <ServiceMonitorShell incidents={initialIncidents}>
      <ForgeContainer
        variant="responsive"
        className="dashboard"
      >
        <header className="dashboard__header">
          <div>
            <ForgeTypography
              as="h1"
              variant="h1"
              className="dashboard__title"
            >
              <ForgeIconGlobe
                className="dashboard__title-icon"
                aria-hidden="true"
              />
              {t(($) => $.dashboard.title, { ns: 'mp.service-monitor', defaultValue: 'Service Monitor' })}
            </ForgeTypography>
            <ForgeTypography
              as="p"
              variant="body-sm"
              className="dashboard__subtitle"
            >
              {t(($) => $.dashboard.subtitle, {
                ns: 'mp.service-monitor',
                defaultValue:
                  'Server-side health checks (default every {interval}s, per-monitor overrides), stored as a time series on the edge.',
                interval: intervalSeconds,
              })}
            </ForgeTypography>
          </div>
          <div className="dashboard__actions">
            <ForgeBadge
              variant={connected ? 'success' : 'warning'}
              pill
            >
              {connected
                ? t(($) => $.dashboard.live, { ns: 'mp.service-monitor', defaultValue: 'Live' })
                : t(($) => $.dashboard.reconnecting, {
                    ns: 'mp.service-monitor',
                    defaultValue: 'Reconnecting…',
                  })}
            </ForgeBadge>
          </div>
        </header>

        <section
          className="cards"
          aria-label={t(($) => $.dashboard.servicesLabel, {
            ns: 'mp.service-monitor',
            defaultValue: 'Monitored services',
          })}
        >
          {snapshot.services.map((service) => (
            <ServiceCard
              key={service.target.id}
              service={service}
              selected={service.target.id === selectedId}
              onSelect={() => setSelectedId(service.target.id)}
            />
          ))}
        </section>

        {selected ? (
          <section
            className="detail"
            aria-live="polite"
          >
            <div className="detail__head">
              <ForgeTypography
                as="h2"
                variant="h3"
                className="detail__title"
              >
                {t(($) => $.dashboard.latency, {
                  ns: 'mp.service-monitor',
                  defaultValue: '{name} · latency',
                  name: selected.target.name,
                })}
              </ForgeTypography>
              {selected.target.url ? (
                <a
                  className="detail__link"
                  href={selected.target.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {selected.target.url}
                </a>
              ) : (
                <span className="detail__link">{selected.target.host}</span>
              )}
            </div>
            <TimeSeriesChart
              points={latencyPoints}
              format={(value) => `${Math.round(value)}`}
            />
            <dl className="detail__stats">
              <Stat
                label={t(($) => $.dashboard.stat.type, { ns: 'mp.service-monitor', defaultValue: 'Type' })}
                value={(selected.target.type ?? 'http').toUpperCase()}
              />
              <Stat
                label={t(($) => $.dashboard.stat.interval, {
                  ns: 'mp.service-monitor',
                  defaultValue: 'Interval',
                })}
                value={`${selected.target.intervalSeconds ?? intervalSeconds}s`}
                icon={<ForgeIconClock aria-hidden="true" />}
              />
              <Stat
                label={t(($) => $.dashboard.stat.uptime, {
                  ns: 'mp.service-monitor',
                  defaultValue: 'Uptime',
                })}
                value={formatPercent(selected.uptime)}
              />
              <Stat
                label={t(($) => $.dashboard.stat.avgLatency, {
                  ns: 'mp.service-monitor',
                  defaultValue: 'Avg latency',
                })}
                value={formatMs(selected.avgLatencyMs)}
              />
              <Stat
                label={t(($) => $.dashboard.stat.samples, {
                  ns: 'mp.service-monitor',
                  defaultValue: 'Samples',
                })}
                value={String(selected.sampleCount)}
              />
              <Stat
                label={t(($) => $.dashboard.stat.lastStatus, {
                  ns: 'mp.service-monitor',
                  defaultValue: 'Last status',
                })}
                value={selected.latest ? String(selected.latest.status || '—') : '—'}
              />
            </dl>
          </section>
        ) : undefined}

        <SpeedPanel
          providers={speedSnapshot.providers}
          enabled={speedSnapshot.enabled}
          intervalSeconds={speedSnapshot.intervalSeconds}
          running={running}
          onRun={runSpeedTest}
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
          series={speedSeries}
        />
      </ForgeContainer>
    </ServiceMonitorShell>
  );
}

interface ServiceCardProperties {
  service: ServiceStatus;
  selected: boolean;
  onSelect: () => void;
}

function ServiceCard({ service, selected, onSelect }: ServiceCardProperties) {
  const { t } = useI18n();
  const state = service.latest?.state ?? 'down';
  return (
    <button
      type="button"
      className={`card card--${state} ${selected ? 'card--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="card__top">
        <span className="card__name">{service.target.name}</span>
        <ForgeBadge
          variant={STATE_VARIANT[state]}
          size="sm"
        >
          {t(($) => $.state[state], {
            ns: 'mp.service-monitor',
            defaultValue: state === 'up' ? 'Operational' : state === 'degraded' ? 'Degraded' : 'Down',
          })}
        </ForgeBadge>
      </span>
      <span className="card__type">{(service.target.type ?? 'http').toUpperCase()}</span>
      <span className="card__metrics">
        <span>{service.latest ? formatMs(service.latest.latencyMs) : '—'}</span>
        <span className="card__uptime">{formatPercent(service.uptime)} up</span>
      </span>
      {service.latest?.error ? <span className="card__error">{service.latest.error}</span> : undefined}
    </button>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="stat">
      <dt className="stat__label">{label}</dt>
      <dd className="stat__value">
        {icon} {value}
      </dd>
    </div>
  );
}

function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

function formatMs(ms: number): string {
  return `${Math.round(ms)} ms`;
}
