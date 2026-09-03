import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const frameworks = ['vue', 'react', 'solid', 'svelte', 'web-components'] as const;

describe('content framework exports', () => {
  it('publishes every generated framework entry point', () => {
    const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
      exports?: {
        '.': Record<string, { types?: string; import?: string }>;
      };
    };

    for (const framework of frameworks) {
      const condition = framework === 'web-components' ? 'mp:web-component' : `mp:${framework}`;
      expect(packageJson.exports?.['.']?.[condition]).toEqual({
        types: `./dist/${framework}/index.d.ts`,
        import: `./dist/${framework}/index.js`,
      });
    }
  });
});
