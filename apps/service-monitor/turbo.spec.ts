import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

describe('service-monitor dev task', () => {
  it('does not start the component watcher while RedwoodSDK is booting', async () => {
    const config = JSON.parse(await readFile(path.resolve(packageRoot, 'turbo.json'), 'utf8')) as {
      tasks?: { dev?: { with?: unknown[] } };
    };

    expect(config.tasks?.dev?.with).toEqual([]);
  });
});
