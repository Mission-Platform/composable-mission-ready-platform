import { describe, expect, it } from 'vitest';

import { compileRegex } from '../regex/compiler.js';
import { test as vmTest } from '../regex/reference-vm.js';
import { PATTERN_CORPUS } from './pattern-corpus.js';

// Deterministic pseudo-random digit-string generator (seeded LCG).
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function sampleInputs(rng: () => number): string[] {
  const inputs = ['', '0', '1', '12', '123'];
  for (let len = 1; len <= 13; len++) {
    let s = '';
    for (let i = 0; i < len; i++) s += Math.floor(rng() * 10).toString();
    inputs.push(s);
  }
  return inputs;
}

describe('captured metadata pattern corpus', () => {
  const patterns = PATTERN_CORPUS;

  it('collects a large, non-trivial pattern corpus', () => {
    expect(patterns.length).toBeGreaterThan(500);
  });

  it('compiles every real pattern without unsupported-syntax errors', () => {
    const failures: string[] = [];
    for (const pattern of patterns) {
      try {
        compileRegex(pattern);
      } catch (error) {
        failures.push(`${pattern} :: ${(error as Error).message}`);
      }
    }
    expect(failures, `unsupported patterns:\n${failures.slice(0, 20).join('\n')}`).toEqual([]);
  });

  it('agrees with the native engine (full match) over sampled inputs', () => {
    const rng = makeRng(0x9e3779b1);
    const mismatches: string[] = [];
    for (const pattern of patterns) {
      const re = compileRegex(pattern);
      const native = new RegExp(`^(?:${pattern})$`);
      for (const input of sampleInputs(rng)) {
        if (vmTest(re, input) !== native.test(input)) {
          mismatches.push(`pattern=${JSON.stringify(pattern)} input=${JSON.stringify(input)}`);
          if (mismatches.length > 20) break;
        }
      }
      if (mismatches.length > 20) break;
    }
    expect(mismatches, `mismatches:\n${mismatches.join('\n')}`).toEqual([]);
  });
});
