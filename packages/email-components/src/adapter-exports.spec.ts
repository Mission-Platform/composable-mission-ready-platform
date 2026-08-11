import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('email component package exports', () => {
  it('publishes the Vue adapter required by Storybook', () => {
    const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
      exports?: {
        '.': {
          'mp:vue'?: {
            import?: string;
          };
        };
      };
    };
    const vueExport = packageJson.exports?.['.']?.['mp:vue'];

    expect(vueExport?.import).toBe('./dist/vue/index.js');
  });
});
