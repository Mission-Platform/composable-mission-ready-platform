'use client';

import { ForgeBadge } from '@mission-platform/components';
import { useI18n } from '@mission-platform/i18n';
import { ForgeContainer } from '@mission-platform/layouts';
import { ForgeTypography } from '@mission-platform/typography';

import { maintenanceStatus } from '@/monitoring/incidents';

import { ServiceMonitorShell } from '../layouts/service-monitor-shell';
import { formatDateTime } from '../utils/format-date';

import type { Incident, MaintenanceWindow, ServiceStatus } from '@/monitoring/types';

export function StatusSummary({
  services,
  incidents,
  maintenance,
}: {
  services: ServiceStatus[];
  incidents: Incident[];
  maintenance: MaintenanceWindow[];
}) {
  const { t } = useI18n();
  const active = incidents.filter((incident) => incident.status !== 'resolved');
  const down = services.filter((service) => service.latest?.state === 'down');
  const degraded = services.filter((service) => service.latest?.state === 'degraded');
  const healthy = down.length === 0 && degraded.length === 0;
  const visibleMaintenance = maintenance.filter((window) =>
    ['scheduled', 'active'].includes(maintenanceStatus(window)),
  );
  return (
    <ServiceMonitorShell incidents={incidents}>
      <ForgeContainer
        variant="responsive"
        className="status-page"
      >
        <section className={`status-hero status-hero--${healthy ? 'up' : down.length > 0 ? 'down' : 'degraded'}`}>
          <ForgeTypography
            as="h1"
            variant="h1"
          >
            {healthy
              ? t(($) => $.summary.allOperational, {
                  ns: 'mp.service-monitor',
                  defaultValue: 'All systems operational',
                })
              : down.length > 0
                ? t(($) => $.summary.serviceDisruption, {
                    ns: 'mp.service-monitor',
                    defaultValue: 'Service disruption',
                  })
                : t(($) => $.summary.degradedPerformance, {
                    ns: 'mp.service-monitor',
                    defaultValue: 'Degraded performance',
                  })}
          </ForgeTypography>
          <p>
            {t(($) => $.summary.monitoredServicesAndIncidents, {
              ns: 'mp.service-monitor',
              defaultValue: '{servicesCount} monitored services · {incidentsCount} active incidents',
              servicesCount: services.length,
              incidentsCount: active.length,
            })}
          </p>
        </section>
        <section
          className="status-grid"
          aria-label={t(($) => $.summary.systemStatus, { ns: 'mp.service-monitor', defaultValue: 'System status' })}
        >
          {services.map((service) => (
            <article
              className="status-service"
              key={service.target.id}
            >
              <strong>{service.target.name}</strong>
              <ForgeBadge
                variant={
                  service.latest?.state === 'up'
                    ? 'success'
                    : service.latest?.state === 'degraded'
                      ? 'warning'
                      : 'error'
                }
              >
                {service.latest?.state ?? 'pending'}
              </ForgeBadge>
            </article>
          ))}
        </section>
        <section className="incident-summary">
          <ForgeTypography
            as="h2"
            variant="h3"
          >
            {t(($) => $.summary.activeIncidentsTitle, { ns: 'mp.service-monitor', defaultValue: 'Active incidents' })}
          </ForgeTypography>
          {active.length === 0 ? (
            <p>
              {t(($) => $.summary.noActiveIncidents, {
                ns: 'mp.service-monitor',
                defaultValue: 'No active incidents.',
              })}
            </p>
          ) : (
            active.map((incident) => (
              <article key={incident.id}>
                <strong>{incident.title}</strong>
                <p>{incident.description}</p>
              </article>
            ))
          )}
        </section>
        <section className="incident-summary">
          <ForgeTypography
            as="h2"
            variant="h3"
          >
            {t(($) => $.summary.plannedMaintenance, { ns: 'mp.service-monitor', defaultValue: 'Planned maintenance' })}
          </ForgeTypography>
          {visibleMaintenance.length === 0 ? (
            <p>
              {t(($) => $.summary.noUpcomingMaintenance, {
                ns: 'mp.service-monitor',
                defaultValue: 'No upcoming maintenance.',
              })}
            </p>
          ) : (
            visibleMaintenance.map((window) => (
              <article key={window.id}>
                <strong>{window.title}</strong>
                <p>{window.description}</p>
                <small>
                  {maintenanceStatus(window)} · {formatDateTime(window.startsAt)} – {formatDateTime(window.endsAt)}
                </small>
              </article>
            ))
          )}
        </section>
      </ForgeContainer>
    </ServiceMonitorShell>
  );
}
