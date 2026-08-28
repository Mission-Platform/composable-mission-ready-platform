import { AppProviders } from '@/client/AppProviders';
import { MonitorsView } from '@/client/components/monitors-view';
import { resolveIntervalSeconds } from '@/monitoring/config';

/**
 * Server component for `/monitors`. It deliberately does not read monitor
 * configuration: the client loads it only after establishing a session.
 */
export async function MonitorsPage() {
  return (
    <AppProviders>
      <MonitorsView intervalSeconds={resolveIntervalSeconds()} />
    </AppProviders>
  );
}
