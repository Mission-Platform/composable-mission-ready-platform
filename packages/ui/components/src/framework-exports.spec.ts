import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('components package exports', () => {
  it('publishes neutral main and type fallbacks alongside framework exports', () => {
    const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
      main?: string;
      types?: string;
      exports?: {
        '.': {
          import?: string;
          types?: string;
        };
      };
    };

    expect(packageJson.main).toBe('./dist/components/index.js');
    expect(packageJson.types).toBe('./dist/components/index.d.ts');
    expect(packageJson.exports?.['.']).toMatchObject({
      import: './dist/components/index.js',
      types: './dist/components/index.d.ts',
    });
  });
});
