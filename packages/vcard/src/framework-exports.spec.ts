import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const frameworks = ['vue', 'react', 'solid', 'svelte', 'web-components'] as const;

describe('vCard framework exports', () => {
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

  it('keeps calendar helpers available from framework-conditioned entries', async () => {
    const frameworkModule = await import(path.join(process.cwd(), 'dist/vue/index.js'));
    const declarations = readFileSync(path.join(process.cwd(), 'dist/vue/index.d.ts'), 'utf8');

    expect(frameworkModule.WEEKDAY_LUXON).toEqual({
      MO: 1,
      TU: 2,
      WE: 3,
      TH: 4,
      FR: 5,
      SA: 6,
      SU: 7,
    });
    expect(declarations).toContain('from "../calendar/dates"');
    expect(declarations).toContain('from "../calendar/types"');
  });
});
