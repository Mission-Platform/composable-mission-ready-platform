import { AppProviders } from '@/client/AppProviders';
import { IncidentsView } from '@/client/components/incidents-view';
import { getMonitor } from '@/monitoring/store';

export async function IncidentsPage() {
  const monitor = getMonitor();
  return (
    <AppProviders>
      <IncidentsView
        initialIncidents={await monitor.listIncidents()}
        initialMaintenance={await monitor.listMaintenance()}
        monitors={await monitor.listMonitors()}
      />
    </AppProviders>
  );
}
