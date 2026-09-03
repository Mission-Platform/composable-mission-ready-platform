import { AppProviders } from '@/client/AppProviders';
import { IncidentsView } from '@/client/components/incidents-view';
import { getMonitor } from '@/monitoring/store';

export async function IncidentsPage() {
  const monitor = getMonitor();
  return (
    <AppProviders>
      <IncidentsView
        initialIncidents={[]}
        initialMaintenance={[]}
        monitors={(await monitor.getServices()).map((service) => service.target)}
      />
    </AppProviders>
  );
}
