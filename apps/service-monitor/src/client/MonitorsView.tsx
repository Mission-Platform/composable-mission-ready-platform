'use client';

import { useI18n } from '@mission-platform/i18n/react';
import { useObservable } from '@mission-platform/rxjs/react';
import { useCallback, useMemo, useState } from 'react';

import type { MonitorTarget, ServicesResponse } from '@/monitoring/types';

import { MonitorManager } from './MonitorManager';
import { Container, Typography } from './mp';
import { deleteMonitor, saveMonitor, servicesStream } from './streams';

interface MonitorsViewProps {
  readonly initialMonitors: MonitorTarget[];
  readonly intervalSeconds: number;
  readonly initialNow: number;
}

/**
 * The `/monitors` management page. Kept separate from the dashboard so runtime
 * monitor CRUD has its own route. The current monitor list stays live through
 * an RxJS `servicesStream` (bridged with `@mission-platform/rxjs/react`), and a
 * `reloadNonce` forces an immediate re-poll right after a create/delete.
 */
export function MonitorsView({ initialMonitors, intervalSeconds, initialNow }: MonitorsViewProps) {
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
    <Container
      variant="responsive"
      className="monitors-page"
    >
      <header className="monitors-page__header">
        <Typography
          as="h1"
          variant="h1"
          className="monitors-page__title"
        >
          {t('nav.monitors')}
        </Typography>
        <a
          className="dashboard__nav"
          href="/"
        >
          {t('monitors.backToDashboard')}
        </a>
      </header>

      <MonitorManager
        monitors={monitors}
        defaultIntervalSeconds={intervalSeconds}
        onSave={onSave}
        onDelete={onDelete}
      />
    </Container>
  );
}
