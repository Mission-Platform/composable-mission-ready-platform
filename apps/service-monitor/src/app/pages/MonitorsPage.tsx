import { AppProviders } from '@/client/AppProviders';
import { MonitorsView } from '@/client/components/monitors-view';
import { resolveIntervalSeconds } from '@/monitoring/config';
import { getMonitor } from '@/monitoring/store';

/**
 * Server component for `/monitors`. Reads the configured monitors from the
 * monitoring Durable Object and hands them to the client management view, which
 * performs runtime create/update/delete against the JSON API.
 */
export async function MonitorsPage() {
  const monitor = getMonitor();
  const services = await monitor.getServices();
  const monitors = services.map((service) => service.target);

  return (
    <AppProviders>
      <MonitorsView
        initialMonitors={monitors}
        initialIncidents={await monitor.listIncidents()}
        intervalSeconds={resolveIntervalSeconds()}
        initialNow={Date.now()}
      />
    </AppProviders>
  );
}
