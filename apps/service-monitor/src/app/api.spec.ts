import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMonitor } from '@/monitoring/store';

import { handleServices, handleSpeedSeries } from './api';

vi.mock('cloudflare:workers', () => ({ env: {} }));
vi.mock('@/monitoring/store', () => ({ getMonitor: vi.fn() }));

describe('handleSpeedSeries', () => {
  const getSpeedSeries = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getSpeedSeries.mockResolvedValue([]);
    vi.mocked(getMonitor).mockReturnValue({ getSpeedSeries } as never);
  });

  it('returns the existing response shape for a supported provider', async () => {
    const response = await handleSpeedSeries(
      new Request('https://monitor.example.test/api/speed/series?provider=fast'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      provider: 'fast',
      now: expect.any(Number),
      since: expect.any(Number),
      samples: [],
    });
    expect(getSpeedSeries).toHaveBeenCalledWith('fast', expect.any(Number));
  });

  it.each(['unknown', 'javascript:cloudflare', ''])(
    'returns 400 for an unsupported provider (%s)',
    async (provider) => {
      const response = await handleSpeedSeries(
        new Request(`https://monitor.example.test/api/speed/series?provider=${encodeURIComponent(provider)}`),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: provider ? 'Invalid "provider" query parameter.' : 'Missing required "provider" query parameter.',
      });
      expect(getSpeedSeries).not.toHaveBeenCalled();
    },
  );
});

describe('handleServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the services payload', async () => {
    const getServices = vi.fn().mockResolvedValue([
      {
        target: { id: 'svc-1', name: 'Service 1', type: 'http' },
        latest: null,
        uptime: 1,
        avgLatencyMs: 0,
        sampleCount: 0,
      },
    ]);
    vi.mocked(getMonitor).mockReturnValue({ getServices } as never);

    const response = await handleServices();
    expect(response.status).toBe(200);

    const body = (await response.json()) as unknown;
    expect(body).toMatchObject({
      now: expect.any(Number),
      intervalSeconds: expect.any(Number),
      services: expect.arrayContaining([
        {
          target: { id: 'svc-1', name: 'Service 1', type: 'http' },
          latest: null,
          uptime: 1,
          avgLatencyMs: 0,
          sampleCount: 0,
        },
      ]),
    });
  });
});
