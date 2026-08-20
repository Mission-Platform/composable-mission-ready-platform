import { describe, expect, it } from 'vitest';

import { load, loadSync } from './matrix-decoder.fws';
import { encodeMatrix } from '../encoder';

describe('matrix decoder FWS artifact', () => {
  it('decodes Data Matrix payload bytes synchronously', () => {
    const decoder = loadSync();
    const code = encodeMatrix('datamatrix', '123456');
    expect(decoder.decode_matrix(0, code.width, code.height, code.modules, [])).toBe('049050051052053054');
    expect(decoder.decode_matrix(99 as 0 | 1 | 2 | 3, code.width, code.height, code.modules, [])).toBe('');
  });

  it('loads the same numeric-array ABI asynchronously', async () => {
    const decoder = await load();
    const code = encodeMatrix('datamatrixrectangular', '123456');
    expect(decoder.decode_matrix(2, code.width, code.height, code.modules, [])).toBe('049050051052053054');
  });
});