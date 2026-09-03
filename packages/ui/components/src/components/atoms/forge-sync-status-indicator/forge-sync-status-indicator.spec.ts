import { describe, expect, it } from 'vitest';

import { expectSsrParity } from '@/test-utils/ssr-parity';

import { ForgeSyncStatusIndicator } from './forge-sync-status-indicator';

describe('ForgeSyncStatusIndicator', () => {
  it('renders a live, labelled syncing state', async () => {
    const { html } = await expectSsrParity(ForgeSyncStatusIndicator, {
      status: 'syncing',
      label: 'Uploading changes',
    });

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Uploading changes"');
    expect(html).toContain('forge-sync-status-indicator--syncing');
  });

  it('can hide the visible label while retaining status semantics', async () => {
    const { html } = await expectSsrParity(ForgeSyncStatusIndicator, {
      status: 'offline',
      label: 'Disconnected',
      showLabel: false,
    });

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Disconnected"');
    expect(html).not.toContain('forge-sync-status-indicator__label">Disconnected');
  });
});
