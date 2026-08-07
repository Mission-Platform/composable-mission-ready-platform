'use client';

import { ForgeTypography } from '@mission-platform/components';
import { useI18n } from '@mission-platform/i18n';
import { ForgeContainer } from '@mission-platform/layouts';
import { useObservable } from '@mission-platform/rxjs';
import { useCallback, useMemo, useState } from 'react';

import { deleteMonitor, saveMonitor, servicesStream } from '../hooks/streams';
import { ServiceMonitorShell } from '../layouts/service-monitor-shell';

import { MonitorManager } from './monitor-manager';

import type { Incident, MonitorTarget, ServicesResponse } from '@/monitoring/types';

interface MonitorsViewProperties {
  readonly initialMonitors: MonitorTarget[];
  readonly initialIncidents: Incident[];
  readonly intervalSeconds: number;
  readonly initialNow: number;
}

/**
 * The `/monitors` management page. Kept separate from the dashboard so runtime
 * monitor CRUD has its own route. The current monitor list stays live through
 * an RxJS `servicesStream` (bridged with `@mission-platform/rxjs`), and a
 * `reloadNonce` forces an immediate re-poll right after a create/update/delete.
 */
export function MonitorsView({
  initialMonitors,
  initialIncidents,
  intervalSeconds,
  initialNow,
}: MonitorsViewProperties) {
  const { t } = useI18n();
  const intervalMs = intervalSeconds * 1000;

  const [reloadNonce, setReloadNonce] = useState(0);

  const initialResponse = useMemo<ServicesResponse>(
    () => ({
      now: initialNow,
      intervalSeconds,
      services: initialMonitors.map((target) => ({
        target,
        latest: null,
        uptime: 0,
        avgLatencyMs: 0,
        sampleCount: 0,
      })),
    }),
    [initialNow, intervalSeconds, initialMonitors],
  );

  const services$ = useMemo(() => servicesStream(intervalMs), [intervalMs, reloadNonce]);
  const snapshot = useObservable(services$, initialResponse);
  const monitors: MonitorTarget[] = (snapshot ?? initialResponse).services.map((service) => service.target);

  const onSave = useCallback(async (monitor: MonitorTarget) => {
    const ok = await saveMonitor(monitor);
    if (ok) {
      setReloadNonce((value) => value + 1);
    }
    return ok;
  }, []);

  const onDelete = useCallback(async (id: string) => {
    const ok = await deleteMonitor(id);
    if (ok) {
      setReloadNonce((value) => value + 1);
    }
    return ok;
  }, []);

  return (
    <ServiceMonitorShell incidents={initialIncidents}>
      <ForgeContainer
        variant="responsive"
        className="monitors-page"
      >
        <header className="monitors-page__header">
          <ForgeTypography
            as="h1"
            variant="h1"
            className="monitors-page__title"
          >
            {t(($) => $.nav.monitors, { ns: 'mp.service-monitor', defaultValue: 'Monitors' })}
          </ForgeTypography>
        </header>

        <MonitorManager
          monitors={monitors}
          defaultIntervalSeconds={intervalSeconds}
          onSave={onSave}
          onDelete={onDelete}
        />
      </ForgeContainer>
    </ServiceMonitorShell>
  );
}
