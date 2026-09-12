import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_BRIDGE_TIMEOUT_MS,
  copyForgeFile,
  downloadForgeFile,
  fileNameFromPath,
  sendBundleToBridge,
} from './delivery';
import { isAllowedForgeBridgeUrl } from './messages';

import type { ForgeExportBundle, ForgeExportFile } from '@mission-platform/forge-figma';

const files: readonly ForgeExportFile[] = [
  { path: 'checkout.tsx', kind: 'tsx', content: 'export const Checkout = {};' },
  { path: 'checkout.module.scss', kind: 'scss', content: '.checkout {}' },
  { path: 'assets/hero image.png', kind: 'asset', content: new Uint8Array([1, 2, 3]) },
];

const bundle: ForgeExportBundle = {
  componentName: 'Checkout',
  files,
  diagnostics: [],
};

describe('Forge artifact delivery', () => {
  it('only permits the local repository bridge endpoint', () => {
    expect(isAllowedForgeBridgeUrl('http://127.0.0.1:8787/export')).toBe(true);
    expect(isAllowedForgeBridgeUrl('http://localhost:8787/export?redirect=https://evil.test')).toBe(false);
    expect(isAllowedForgeBridgeUrl('https://example.test/export')).toBe(false);
    expect(isAllowedForgeBridgeUrl('http://127.0.0.1:8787/other')).toBe(false);
  });

  it('rejects an unsafe bridge configuration before making a request', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      sendBundleToBridge(
        {
          bridgeUrl: 'https://example.test/export',
          authToken: 'test-token',
          repositoryRootId: 'repo',
          targetDirectory: 'components',
        },
        bundle,
        false,
        fetcher,
      ),
    ).rejects.toThrow(/not allowed/);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses the authoritative bundle path for safe download names', () => {
    expect(fileNameFromPath('assets/hero image.png')).toBe('hero_image.png');

    const click = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:forge');
    const revokeObjectURL = vi.fn();
    downloadForgeFile(files[2], {
      document: {
        createElement: (() => ({ click, href: '', download: '' })) as unknown as Document['createElement'],
      },
      url: { createObjectURL, revokeObjectURL },
    });

    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:forge');
  });

  it('copies the exact displayed text and serializes the reviewed bundle', async () => {
    const writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue();
    await copyForgeFile(files[0], { writeText });
    expect(writeText).toHaveBeenCalledWith(files[0].content);

    let requestBody = '';
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      requestBody = String(init?.body);
      return Response.json({ protocolVersion: 1, ok: true, results: [] });
    });
    await sendBundleToBridge(
      {
        bridgeUrl: 'http://127.0.0.1:8787/export',
        authToken: 'test-token',
        repositoryRootId: 'repo',
        targetDirectory: 'components',
      },
      bundle,
      true,
      fetcher,
    );

    const request = JSON.parse(requestBody) as { bundle: ForgeExportBundle; overwrite: boolean };
    expect(request.bundle.files.map((file) => file.path)).toEqual(files.map((file) => file.path));
    expect(request.bundle.files[0]?.content).toBe(files[0].content);
    expect(request.bundle.files[2]?.content).toEqual([1, 2, 3]);
    expect(request.overwrite).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/export',
      expect.objectContaining({
        headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      }),
    );
  });

  it('returns structured per-file failures from the bridge without throwing', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(
        {
          protocolVersion: 1,
          ok: false,
          error: 'One or more artifacts were rejected.',
          results: [{ path: 'checkout.tsx', status: 'rejected', error: 'already exists' }],
        },
        { status: 409 },
      ),
    );

    await expect(
      sendBundleToBridge(
        {
          bridgeUrl: 'http://127.0.0.1:8787/export',
          authToken: 'test-token',
          repositoryRootId: 'repo',
          targetDirectory: 'components',
        },
        bundle,
        false,
        fetcher,
      ),
    ).resolves.toMatchObject({ ok: false, results: [{ path: 'checkout.tsx', status: 'rejected' }] });
  });

  it('exports DEFAULT_BRIDGE_TIMEOUT_MS configured to 30 seconds', () => {
    expect(DEFAULT_BRIDGE_TIMEOUT_MS).toBe(30_000);
  });

  it('aborts and throws a formatted timeout error when bridge request exceeds 30 seconds', async () => {
    vi.useFakeTimers();
    try {
      let capturedSignal: AbortSignal | undefined;
      const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
        capturedSignal = init?.signal as AbortSignal | undefined;
        return new Promise<Response>((_resolve, reject) => {
          capturedSignal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      });

      const promise = sendBundleToBridge(
        {
          bridgeUrl: 'http://127.0.0.1:8787/export',
          authToken: 'test-token',
          repositoryRootId: 'repo',
          targetDirectory: 'components',
        },
        bundle,
        false,
        fetcher,
      );

      expect(capturedSignal).toBeDefined();
      expect(capturedSignal?.aborted).toBe(false);

      vi.advanceTimersByTime(30_000);

      await expect(promise).rejects.toThrow('The repository bridge export timed out after 30 seconds.');
      expect(capturedSignal?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('supports configurable timeout duration', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn<typeof fetch>(() => new Promise<Response>(() => {}));
      const promise = sendBundleToBridge(
        {
          bridgeUrl: 'http://127.0.0.1:8787/export',
          authToken: 'test-token',
          repositoryRootId: 'repo',
          targetDirectory: 'components',
        },
        bundle,
        false,
        fetcher,
        5000,
      );

      vi.advanceTimersByTime(5000);
      await expect(promise).rejects.toThrow('The repository bridge export timed out after 5 seconds.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('propagates network rejections when the bridge is unreachable', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(
      sendBundleToBridge(
        {
          bridgeUrl: 'http://127.0.0.1:8787/export',
          authToken: 'test-token',
          repositoryRootId: 'repo',
          targetDirectory: 'components',
        },
        bundle,
        false,
        fetcher,
      ),
    ).rejects.toThrow('Failed to fetch');
  });

  it('handles bridge server 500 error response cleanly', async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
          headers: { 'content-type': 'text/plain' },
        }),
    );

    await expect(
      sendBundleToBridge(
        {
          bridgeUrl: 'http://127.0.0.1:8787/export',
          authToken: 'test-token',
          repositoryRootId: 'repo',
          targetDirectory: 'components',
        },
        bundle,
        false,
        fetcher,
      ),
    ).rejects.toThrow('The repository bridge returned HTTP 500 without a valid response.');
  });

  it('handles bridge server error response with JSON error message', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(
        {
          protocolVersion: 1,
          ok: false,
          error: 'Repository root "invalid-root" not configured on bridge.',
          results: [],
        },
        { status: 400 },
      ),
    );

    const result = await sendBundleToBridge(
      {
        bridgeUrl: 'http://127.0.0.1:8787/export',
        authToken: 'test-token',
        repositoryRootId: 'invalid-root',
        targetDirectory: 'components',
      },
      bundle,
      false,
      fetcher,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Repository root "invalid-root" not configured on bridge.');
    expect(result.results).toEqual([]);
  });

  it('handles aborted signal mid-request cleanly', async () => {
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });

    await expect(
      sendBundleToBridge(
        {
          bridgeUrl: 'http://127.0.0.1:8787/export',
          authToken: 'test-token',
          repositoryRootId: 'repo',
          targetDirectory: 'components',
        },
        bundle,
        false,
        fetcher,
        50,
      ),
    ).rejects.toThrow('The repository bridge export timed out after 50ms.');
  });
});
