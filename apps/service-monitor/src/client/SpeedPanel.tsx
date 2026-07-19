import { useI18n } from '@mission-platform/i18n/react';

import type { SpeedProviderId, SpeedResult, SpeedStatus } from '@/monitoring/speed/types';

import { Badge, Button, IconLightning, IconRefresh, Spinner, Typography } from './mp';
import { TimeSeriesChart, type ChartPoint } from './TimeSeriesChart';

interface SpeedPanelProps {
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

/**
 * Network speed section: one selectable card per provider (Cloudflare,
 * Fast.com, Speedtest) with the latest download/upload/latency figures, a
 * button to trigger an immediate server-side run, and a `@mission-platform/d3`
 * chart of the selected provider's download throughput over time.
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
}: SpeedPanelProps) {
  const { t } = useI18n();
  const selected = providers.find((provider) => provider.provider.id === selectedProvider);
  const points: ChartPoint[] = series
    .filter((sample) => sample.ok)
    .map((sample) => ({ ts: sample.ts, value: sample.downloadMbps }));

  return (
    <section
      className="speed"
      aria-label={t('speed.title')}
    >
      <div className="speed__head">
        <div>
          <Typography
            as="h2"
            variant="h3"
            className="speed__title"
          >
            <IconLightning
              className="speed__title-icon"
              aria-hidden="true"
            />{' '}
            {t('speed.title')}
          </Typography>
          <Typography
            as="p"
            variant="body-sm"
            className="speed__subtitle"
          >
            {enabled ? t('speed.enabled', { interval: intervalSeconds }) : t('speed.disabled')}
          </Typography>
        </div>
        <Button
          variant="primary"
          onClick={onRun}
          disabled={running}
          loading={running}
          className="speed__run"
        >
          {running ? <Spinner size="sm" /> : <IconRefresh aria-hidden="true" />}{' '}
          {running ? t('speed.running') : t('speed.run')}
        </Button>
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
        <div className="speed__chart">
          <div className="speed__chart-head">
            <Typography
              as="h3"
              variant="h4"
              className="speed__chart-title"
            >
              {t('speed.chartTitle', { name: selected.provider.name })}
            </Typography>
            <span className="speed__chart-hint">{t('speed.chartHint')}</span>
          </div>
          <TimeSeriesChart
            points={points}
            color="var(--up)"
            format={(value) => (value >= 100 ? value.toFixed(0) : value.toFixed(1))}
            emptyLabel={t('speed.chartEmpty')}
          />
        </div>
      ) : null}
    </section>
  );
}

interface SpeedCardProps {
  provider: SpeedStatus;
  selected: boolean;
  onSelect: () => void;
}

function SpeedCard({ provider, selected, onSelect }: SpeedCardProps) {
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
          <span className="speed-card__download">
            {formatMbps(latest.downloadMbps)}
            <span className="speed-card__unit"> Mbps down</span>
          </span>
          <span className="speed-card__meta">
            {latest.uploadMbps !== null ? <span>{t('speed.up', { value: formatMbps(latest.uploadMbps) })}</span> : null}
            <span>{Math.round(latest.latencyMs)} ms</span>
          </span>
          <span className="speed-card__agg">
            avg {formatMbps(provider.avgDownloadMbps)} · max {formatMbps(provider.maxDownloadMbps)} · n=
            {provider.sampleCount}
          </span>
        </>
      ) : failed ? (
        <Badge
          variant="error"
          size="sm"
        >
          {latest?.error ?? t('speed.failed')}
        </Badge>
      ) : (
        <span className="speed-card__pending">{t('speed.pending')}</span>
      )}
    </button>
  );
}

function formatMbps(mbps: number): string {
  return mbps >= 100 ? mbps.toFixed(0) : mbps.toFixed(1);
}
