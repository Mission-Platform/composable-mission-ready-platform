import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createForgeBridgeServer,
  DEFAULT_ALLOWED_ORIGIN,
  exportForgeRepositoryBundle,
  startForgeBridgeServer,
} from './bridge.js';

import type { ForgeRepositoryExportRequest } from '@mission-platform/forge-figma';

const temporaryDirectories: string[] = [];

async function repositoryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'forge-figma-bridge-'));
  temporaryDirectories.push(root);
  return root;
}

function request(overrides: Partial<ForgeRepositoryExportRequest> = {}): ForgeRepositoryExportRequest {
  return {
    protocolVersion: 1,
    repositoryRootId: 'mission',
    targetDirectory: 'components/checkout',
    overwrite: false,
    bundle: {
      componentName: 'Checkout',
      files: [
        { path: 'Checkout.tsx', kind: 'tsx', content: 'export const Checkout = {};' },
        { path: 'Checkout.module.scss', kind: 'scss', content: '.checkout {}' },
      ],
      diagnostics: [],
    },
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('Forge repository export', () => {
  it('writes a valid bundle below the configured repository root', async () => {
    const root = await repositoryRoot();
    const response = await exportForgeRepositoryBundle(request(), { repositoryRoots: { mission: root } });

    expect(response).toMatchObject({ ok: true, protocolVersion: 1 });
    expect(response.results.map((result) => result.status)).toEqual(['written', 'written']);
    await expect(readFile(path.join(root, 'components/checkout/Checkout.tsx'), 'utf8')).resolves.toBe(
      'export const Checkout = {};',
    );
  });

  it('rejects traversal in target and file paths', async () => {
    const root = await repositoryRoot();
    const response = await exportForgeRepositoryBundle(request({ targetDirectory: '../outside' }), {
      repositoryRoots: { mission: root },
    });

    expect(response.ok).toBe(false);
    expect(response.error).toContain('target directory');
    expect(response.results).toEqual([]);
  });

  it('requires explicit overwrite permission for existing files', async () => {
    const root = await repositoryRoot();
    const options = { repositoryRoots: { mission: root } };
    await expect(exportForgeRepositoryBundle(request(), options)).resolves.toMatchObject({ ok: true });

    const rejected = await exportForgeRepositoryBundle(request(), options);
    expect(rejected.ok).toBe(false);
    expect(rejected.results[0]).toMatchObject({ path: 'Checkout.tsx', status: 'rejected' });
    expect(rejected.results[0]?.error).toContain('already exists');

    const overwritten = await exportForgeRepositoryBundle(request({ overwrite: true }), options);
    expect(overwritten.ok).toBe(true);
  });

  it('reports per-file failures while writing the rest of a bundle', async () => {
    const root = await repositoryRoot();
    const options = { repositoryRoots: { mission: root } };
    await writeFile(path.join(root, 'existing.tsx'), 'existing');
    const response = await exportForgeRepositoryBundle(
      request({
        bundle: {
          componentName: 'Checkout',
          files: [
            { path: '../../existing.tsx', kind: 'tsx', content: 'blocked' },
            { path: 'new.tsx', kind: 'tsx', content: 'written' },
          ],
          diagnostics: [],
        },
      }),
      options,
    );

    expect(response.ok).toBe(false);
    expect(response.results).toEqual([
      { path: '../../existing.tsx', status: 'rejected', error: expect.stringContaining('relative') },
      { path: 'new.tsx', status: 'written', bytesWritten: 7 },
    ]);
    await expect(readFile(path.join(root, 'components/checkout/new.tsx'), 'utf8')).resolves.toBe('written');
  });

  it('rejects files larger than the configured limit', async () => {
    const root = await repositoryRoot();
    const response = await exportForgeRepositoryBundle(
      request({
        bundle: {
          componentName: 'Checkout',
          files: [{ path: 'large.tsx', kind: 'tsx', content: '123456789' }],
          diagnostics: [],
        },
      }),
      { repositoryRoots: { mission: root }, maxFileBytes: 4 },
    );

    expect(response.ok).toBe(false);
    expect(response.results[0]).toMatchObject({ path: 'large.tsx', status: 'rejected' });
    expect(response.results[0]?.error).toContain('size limit');
  });

  it('generates a distinct authentication token for each server', () => {
    const firstServer = createForgeBridgeServer({ repositoryRoots: { mission: '/tmp/mission' } });
    const secondServer = createForgeBridgeServer({ repositoryRoots: { mission: '/tmp/mission' } });

    expect(firstServer.authToken).toHaveLength(43);
    expect(secondServer.authToken).toHaveLength(43);
    expect(firstServer.authToken).not.toBe(secondServer.authToken);
    expect(firstServer.allowedOrigin).toBe(DEFAULT_ALLOWED_ORIGIN);
  });

  it('rejects unauthorized HTTP exports before reading or writing the bundle', async () => {
    const root = await repositoryRoot();
    const server = await startForgeBridgeServer({
      repositoryRoots: { mission: root },
      authToken: 'test-token',
      port: 0,
    });
    const address = server.address();
    if (typeof address !== 'object' || address === null) throw new Error('The test bridge did not bind to a port.');

    try {
      const unauthorizedResponse = await fetch(`http://127.0.0.1:${address.port}/export`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: DEFAULT_ALLOWED_ORIGIN },
        body: JSON.stringify(request()),
      });
      expect(unauthorizedResponse.status).toBe(401);
      expect(await unauthorizedResponse.json()).toMatchObject({ protocolVersion: 1, ok: false });
      await expect(readFile(path.join(root, 'components/checkout/Checkout.tsx'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  it('rejects cross-origin HTTP exports even with a valid authentication token', async () => {
    const root = await repositoryRoot();
    const server = await startForgeBridgeServer({
      repositoryRoots: { mission: root },
      authToken: 'test-token',
      port: 0,
    });
    const address = server.address();
    if (typeof address !== 'object' || address === null) throw new Error('The test bridge did not bind to a port.');

    try {
      const crossOriginResponse = await fetch(`http://127.0.0.1:${address.port}/export`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer test-token',
          origin: 'https://evil.example',
        },
        body: JSON.stringify(request()),
      });
      expect(crossOriginResponse.status).toBe(403);
      expect(crossOriginResponse.headers.get('access-control-allow-origin')).toBeNull();
      await expect(readFile(path.join(root, 'components/checkout/Checkout.tsx'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  it('serves the versioned protocol over HTTP for an authenticated allowed-origin request', async () => {
    const root = await repositoryRoot();
    const server = await startForgeBridgeServer({
      repositoryRoots: { mission: root },
      authToken: 'test-token',
      port: 0,
    });
    const address = server.address();
    if (typeof address !== 'object' || address === null) throw new Error('The test bridge did not bind to a port.');

    try {
      const validResponse = await fetch(`http://127.0.0.1:${address.port}/export`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer test-token',
          origin: DEFAULT_ALLOWED_ORIGIN,
        },
        body: JSON.stringify(request()),
      });
      expect(validResponse.status).toBe(200);
      expect(validResponse.headers.get('access-control-allow-origin')).toBe(DEFAULT_ALLOWED_ORIGIN);
      expect(validResponse.headers.get('access-control-allow-origin')).not.toBe('*');
      expect(await validResponse.json()).toMatchObject({ protocolVersion: 1, ok: true });

      const malformedResponse = await fetch(`http://127.0.0.1:${address.port}/export`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer test-token',
          origin: DEFAULT_ALLOWED_ORIGIN,
        },
        body: '{',
      });
      expect(malformedResponse.status).toBe(400);
      expect(await malformedResponse.json()).toMatchObject({ protocolVersion: 1, ok: false });

      const invalidShapeResponse = await fetch(`http://127.0.0.1:${address.port}/export`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer test-token',
          origin: DEFAULT_ALLOWED_ORIGIN,
        },
        body: JSON.stringify({ protocolVersion: 1 }),
      });
      expect(invalidShapeResponse.status).toBe(400);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
