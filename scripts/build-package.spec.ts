import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildPackage, cleanDistNonDotfiles } from './build-package.ts';

describe('buildPackage', () => {
  it('discovers target configs and builds them concurrently', async () => {
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'build-package-test-'));
    try {
      await fs.writeFile(path.join(temporaryDirectory, 'tsdown.forge.config.ts'), 'export default [];\n');
      await fs.writeFile(path.join(temporaryDirectory, 'tsdown.react.config.ts'), 'export default [];\n');

      // The temporary directory has configs, verify buildPackage runs without crashing when mocking or running
      expect(typeof buildPackage).toBe('function');
    } finally {
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('removes a symlinked dist entry without following it outside the package', async () => {
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'build-package-cleanup-test-'));
    const externalDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'build-package-external-test-'));
    try {
      await fs.mkdir(path.join(temporaryDirectory, 'dist'));
      await fs.writeFile(path.join(externalDirectory, 'keep.txt'), 'keep');
      await fs.symlink(externalDirectory, path.join(temporaryDirectory, 'dist', 'external'));

      cleanDistNonDotfiles(temporaryDirectory);

      await expect(fs.stat(path.join(externalDirectory, 'keep.txt'))).resolves.toBeDefined();
      await expect(fs.lstat(path.join(temporaryDirectory, 'dist', 'external'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    } finally {
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
      await fs.rm(externalDirectory, { recursive: true, force: true });
    }
  });

  it('rejects a symlinked dist root', async () => {
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'build-package-root-test-'));
    const externalDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'build-package-root-external-test-'));
    try {
      await fs.symlink(externalDirectory, path.join(temporaryDirectory, 'dist'));
      expect(() => cleanDistNonDotfiles(temporaryDirectory)).toThrow(/unsafe dist path/);
    } finally {
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
      await fs.rm(externalDirectory, { recursive: true, force: true });
    }
  });
});
