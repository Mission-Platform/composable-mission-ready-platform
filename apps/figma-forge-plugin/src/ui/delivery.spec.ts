import { describe, expect, it, vi } from 'vitest';

import { copyForgeFile, downloadForgeFile, fileNameFromPath, sendBundleToBridge } from './delivery';
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
        { bridgeUrl: 'https://example.test/export', repositoryRootId: 'repo', targetDirectory: 'components' },
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
});
