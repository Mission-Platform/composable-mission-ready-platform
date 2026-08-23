/* eslint-disable unicorn/prevent-abbreviations */

import { describe, expect, it } from 'vitest';

import { parseForgeWebScriptCliArgs } from './args.js';

describe('parseForgeWebScriptCliArgs', () => {
  it('parses graph, ABI, optimization, and output options deterministically', () => {
    expect(
      parseForgeWebScriptCliArgs(
        [
          'compile',
          'src/main.fws',
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
      entries: ['/workspace/src/main.fws'],
      roots: ['/workspace/src'],
      projectRoots: ['/workspace/src', '/workspace/shared'],
      linkMode: 'static',
      capabilities: ['clock.now', 'codec.encode'],
      optimization: 'release',
      outputDirectory: '/workspace/artifacts',
      compilerVersion: '0.1.0',
      vmMode: 'jit',
    });
  });

  it('rejects unsupported commands, options, and multiple entries', () => {
    expect(() => parseForgeWebScriptCliArgs(['run', 'main.fws'])).toThrow('Missing command');
    expect(() => parseForgeWebScriptCliArgs(['check', 'main.fws', '--unknown'])).toThrow('Unknown option');
    expect(() => parseForgeWebScriptCliArgs(['check', 'one.fws', 'two.fws'])).toThrow('Exactly one entry');
    expect(() => parseForgeWebScriptCliArgs(['check', 'main.fws', '--vm-mode', 'native'])).toThrow('Invalid VM mode');
  });

  it('accepts structured verification output for CI consumers', () => {
    expect(parseForgeWebScriptCliArgs(['check', 'main.fws', '--format', 'json'], '/workspace')).toMatchObject({
      command: 'check',
      entries: ['/workspace/main.fws'],
      format: 'json',
    });
  });

  it('parses bounded forensic trace options without affecting ordinary commands', () => {
    expect(
      parseForgeWebScriptCliArgs(
        ['trace', 'main.fws', '--trace-capture', 'snapshot', '--max-trace-events', '4', '--max-trace-bytes', '128'],
        '/workspace',
      ),
    ).toMatchObject({
      command: 'trace',
      trace: { capture: 'snapshot', maxEvents: 4, maxTraceBytes: 128, maxSnapshotBytes: 4096 },
    });
    expect(() => parseForgeWebScriptCliArgs(['trace', 'main.fws', '--max-trace-events', 'unbounded'])).toThrow(
      'non-negative integer',
    );
  });
});
