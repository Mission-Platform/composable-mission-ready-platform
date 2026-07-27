import { AppProviders } from '@/client/AppProviders';
import { StatusSummary } from '@/client/components/status-summary';
import { getMonitor } from '@/monitoring/store';

export async function SummaryPage() {
  const monitor = getMonitor();
  return (
    <AppProviders>
      <StatusSummary
        services={await monitor.getServices()}
        incidents={await monitor.listIncidents()}
        maintenance={await monitor.listMaintenance()}
      />
    </AppProviders>
  );
}
