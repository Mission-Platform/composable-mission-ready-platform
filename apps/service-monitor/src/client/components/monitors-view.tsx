'use client';

import { useI18n } from '@mission-platform/i18n';
import { ForgeContainer } from '@mission-platform/layouts';
import { ForgeTypography } from '@mission-platform/typography';
import { useCallback, useEffect, useState } from 'react';

import { createMonitorSession, deleteMonitor, hasMonitorSession, loadMonitors, saveMonitor } from '../hooks/streams';
import { ServiceMonitorShell } from '../layouts/service-monitor-shell';

import { MonitorManager } from './monitor-manager';

import type { MonitorTarget } from '@/monitoring/types';
import type { FormEvent } from 'react';

interface MonitorsViewProperties {
  readonly intervalSeconds: number;
}

/**
 * The `/monitors` management page. Kept separate from the dashboard so runtime
 * monitor CRUD has its own route. Private monitor configuration is fetched only
 * after the browser has established an authenticated monitor session.
 */
export function MonitorsView({ intervalSeconds }: MonitorsViewProperties) {
  const { t } = useI18n();

  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [privateMonitors, setPrivateMonitors] = useState<MonitorTarget[]>([]);

  useEffect(() => {
    let active = true;
    void hasMonitorSession()
      .then((value) => {
        if (active) setAuthenticated(value);
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authenticated !== true) return;
    let active = true;
    void loadMonitors()
      .then((value) => {
        if (active) setPrivateMonitors(value);
      })
      .catch(() => {
        if (active) setPrivateMonitors([]);
      });
    return () => {
      active = false;
    };
  }, [authenticated, reloadNonce]);

  const signIn = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSessionError(null);
    try {
      const ok = await createMonitorSession(sessionToken);
      if (ok) {
        setSessionToken('');
        setAuthenticated(true);
      } else {
        setSessionError('The monitor token was rejected.');
      }
    } catch {
      setSessionError('The monitor session could not be created.');
    }
  };

  const monitors = privateMonitors;

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
    <ServiceMonitorShell incidents={[]}>
      <ForgeContainer
        variant="responsive"
        className="monitors-page"
      >
        {authenticated === true ? (
          <>
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
          </>
        ) : authenticated === false ? (
          <form onSubmit={signIn}>
            <ForgeTypography
              as="h1"
              variant="h1"
            >
              Monitor access
            </ForgeTypography>
            <label>
              API token
              <input
                autoComplete="current-password"
                name="token"
                onChange={(event) => setSessionToken(event.target.value)}
                type="password"
                value={sessionToken}
              />
            </label>
            <button type="submit">Sign in</button>
            {sessionError ? <p role="alert">{sessionError}</p> : null}
          </form>
        ) : (
          <p>Checking monitor access…</p>
        )}
      </ForgeContainer>
    </ServiceMonitorShell>
  );
}
