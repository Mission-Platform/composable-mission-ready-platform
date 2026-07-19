import { beforeAll, describe, expect, it } from 'vitest';

import { loadModule, type RawPhoneNumberExports } from '../generated/phone-number.js';
import { compileRegex } from './compiler.js';
import { fullMatch, test as vmTest } from './reference-vm.js';

// Diff-test the AssemblyScript/WebAssembly VM against the TypeScript reference
// implementation to prove they agree instruction-for-instruction.
const PATTERNS: string[] = [
  '[13-689]\\d{9}',
  '[2-9]\\d{2}[2-9]\\d{6}',
  '1(?:800|888)\\d{7}',
  '0[1-9]\\d{8}',
  '(\\d{3})(\\d{3})(\\d{4})',
  '(\\d{3})(\\d{4})',
  '\\d{2,3}',
  '[0-46-9]+',
  '(a|b)c',
  '(a+?)(a+)',
  '4\\d{8,9}',
  '(?:0|00)?[1-9]\\d+',
];

const INPUTS: string[] = [
  '',
  '4155552671',
  '18005551234',
  '2015550123',
  '0612345678',
  '999',
  '99',
  '12345',
  'aaaa',
  'bc',
  'ac',
  '45678901',
  '456789012',
  '4567890',
];

let wasm: RawPhoneNumberExports;

beforeAll(async () => {
  wasm = await loadModule();
});

describe('wasm regex VM vs reference VM', () => {
  it('agrees on full-match across the pattern/input matrix', () => {
    for (const pattern of PATTERNS) {
      const re = compileRegex(pattern);
      const program = Int32Array.from(re.program);
      const classes = Int32Array.from(re.classes);
      for (const input of INPUTS) {
        const wasmResult = wasm.reTest(program, classes, re.groupCount, input, true) === 1;
        const refResult = vmTest(re, input);
        expect(wasmResult, `pattern=${JSON.stringify(pattern)} input=${JSON.stringify(input)}`).toBe(refResult);
      }
    }
  });

  it('agrees on capture slots', () => {
    const re = compileRegex('(\\d{3})(\\d{3})(\\d{4})');
    const program = Int32Array.from(re.program);
    const classes = Int32Array.from(re.classes);
    const wasmCaps = Array.from(wasm.reCaptures(program, classes, re.groupCount, '4155552671', 0, true));
    const refCaps = fullMatch(re, '4155552671');
    expect(wasmCaps).toEqual(refCaps);
  });
});
