import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseFlint } from '../../../../flint/core/dist/index.js';

const fileName = resolve(import.meta.dirname, 'locate-qr.flint');
const source = readFileSync(fileName, 'utf8');

describe('locate-qr Flint source', () => {
  it('parses the corner_candidate implementation', () => {
    const parsed = parseFlint(source, fileName);

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module?.functions.some(({ name }) => name === 'corner_candidate')).toBe(true);
  });
});
