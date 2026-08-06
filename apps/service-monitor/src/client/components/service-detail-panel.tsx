'use client';

import { ForgeTypography } from '@mission-platform/components';
import { useI18n } from '@mission-platform/i18n';
import { ForgeIconClock } from '@mission-platform/icons';
import { type ReactNode } from 'react';

import { formatMs, formatPercent } from '../utils/format';

import { type ChartPoint, TimeSeriesChart } from './time-series-chart';

import type { ServiceStatus } from '@/monitoring/types';

interface ServiceDetailPanelProperties {
  readonly selected: ServiceStatus;
  readonly latencyPoints: ChartPoint[];
  readonly intervalSeconds: number;
}

/**
 * The detail section for the currently selected service: its header, a latency
 * time-series chart, and a stats list summarising the monitor's configuration
 * and latest health figures.
 */
export function ServiceDetailPanel({ selected, latencyPoints, intervalSeconds }: ServiceDetailPanelProperties) {
  const { t } = useI18n();
  return (
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
