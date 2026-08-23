import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseForgeWebScript } from '../../../forge-web-script/dist/index.js';

const fileName = resolve(import.meta.dirname, 'locate-qr.fws');
const source = readFileSync(fileName, 'utf8');

describe('locate-qr FWS source', () => {
  it('parses the corner_candidate implementation', () => {
    const parsed = parseForgeWebScript(source, fileName);

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module?.functions.some(({ name }) => name === 'corner_candidate')).toBe(true);
  });
});
