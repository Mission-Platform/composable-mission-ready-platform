'use client';

import { ForgeBadge } from '@mission-platform/components';
import { useI18n } from '@mission-platform/i18n';

import { formatMs, formatPercent } from '../utils/format';

import type { HealthState, ServiceStatus } from '@/monitoring/types';

/** Map a health state onto the design-system tone used for badges. */
const STATE_VARIANT: Record<HealthState, 'success' | 'warning' | 'error'> = {
  // i18next-instrument-ignore
  up: 'success',
  degraded: 'warning',
  down: 'error',
};

interface ServiceCardProperties {
  service: ServiceStatus;
  selected: boolean;
  onSelect: () => void;
}

/** A single selectable service card in the dashboard overview grid. */
export function ServiceCard({ service, selected, onSelect }: ServiceCardProperties) {
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
