/* eslint-disable unicorn/prevent-abbreviations */

import { describe, expect, it } from 'vitest';

import { parseFlintCliArgs } from './args.js';

describe('parseFlintCliArgs', () => {
  it('parses graph, ABI, optimization, and output options deterministically', () => {
    expect(
      parseFlintCliArgs(
        [
          'compile',
          'src/main.flint',
          '--root',
          'src',
          '--project-root',
          'src',
          '--project-root',
          'shared',
          '--link-mode',
          'static',
          '--capability',
          'clock.now, codec.encode',
          '--capability',
          'clock.now',
          '--optimization',
          'release',
          '--out-dir',
          'artifacts',
          '--vm-mode',
          'jit',
        ],
        '/workspace',
      ),
    ).toEqual({
      command: 'compile',
      entries: ['/workspace/src/main.flint'],
      roots: ['/workspace/src'],
      projectRoots: ['/workspace/src', '/workspace/shared'],
      linkMode: 'static',
      capabilities: ['clock.now', 'codec.encode'],
      optimization: 'release',
      boundsChecks: 'runtime',
      showOptimizerReport: false,
      outputDirectory: '/workspace/artifacts',
      compilerVersion: '0.1.0',
      vmMode: 'jit',
    });
  });

  it('rejects unsupported commands, options, and multiple entries', () => {
    expect(() => parseFlintCliArgs(['run', 'main.flint'])).toThrow('Missing command');
    expect(() => parseFlintCliArgs(['check', 'main.flint', '--unknown'])).toThrow('Unknown option');
    expect(() => parseFlintCliArgs(['check', 'one.flint', 'two.flint'])).toThrow('Exactly one entry');
    expect(() => parseFlintCliArgs(['check', 'main.flint', '--vm-mode', 'native'])).toThrow('Invalid VM mode');
  });

  it('accepts structured verification output for CI consumers', () => {
    expect(parseFlintCliArgs(['check', 'main.flint', '--format', 'json'], '/workspace')).toMatchObject({
      command: 'check',
      entries: ['/workspace/main.flint'],
      format: 'json',
    });
  });

  it('parses explicit bounds policy and optimizer reporting', () => {
    expect(
      parseFlintCliArgs(['check', 'main.flint', '--bounds-checks', 'proven-safe', '--optimizer-report']),
    ).toMatchObject({
      boundsChecks: 'proven-safe',
      showOptimizerReport: true,
    });
    expect(() => parseFlintCliArgs(['check', 'main.flint', '--bounds-checks', 'guess'])).toThrow(
      'Invalid bounds-check policy',
    );
    expect(parseFlintCliArgs(['inspect-sonir', '.cache/main.sonir.json'])).toMatchObject({
      command: 'inspect-sonir',
    });
  });

  it('parses bounded forensic trace options without affecting ordinary commands', () => {
    expect(
      parseFlintCliArgs(
        ['trace', 'main.flint', '--trace-capture', 'snapshot', '--max-trace-events', '4', '--max-trace-bytes', '128'],
        '/workspace',
      ),
    ).toMatchObject({
      command: 'trace',
      trace: { capture: 'snapshot', maxEvents: 4, maxTraceBytes: 128, maxSnapshotBytes: 4096 },
    });
    expect(() => parseFlintCliArgs(['trace', 'main.flint', '--max-trace-events', 'unbounded'])).toThrow(
      'non-negative integer',
    );
  });
});
