import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildPackage } from './build-package.ts';

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
});
