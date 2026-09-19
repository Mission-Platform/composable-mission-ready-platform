/**
 * Focused Step-4 verification matrix for the Flint language migration.
 *
 * Runs targeted build/test commands across downstream consumers, benchmarks,
 * MCP developer tools, and example packages. Captures failing package/test
 * names and truncated error output for retry loops.
 *
 * Usage:
 *   node --experimental-strip-types scripts/verify-flint-step4.ts
 *   node --experimental-strip-types scripts/verify-flint-step4.ts --only mcp-developer,benchmark
 *   node --experimental-strip-types scripts/verify-flint-step4.ts --skip-build
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface MatrixEntry {
  readonly id: string;
  readonly description: string;
  readonly commands: readonly {
    readonly label: string;
    readonly args: readonly string[];
    readonly timeoutMs?: number;
  }[];
}

const MATRIX: readonly MatrixEntry[] = [
  {
    id: 'phone-number',
    description: '@mission-platform/phone-number',
    commands: [
      { label: 'test', args: ['--filter', '@mission-platform/phone-number', 'run', 'test'], timeoutMs: 120_000 },
      { label: 'build', args: ['--filter', '@mission-platform/phone-number', 'run', 'build'], timeoutMs: 120_000 },
    ],
  },
  {
    id: 'barcode-wasm',
    description: '@mission-platform/barcode-wasm',
    commands: [
      { label: 'test', args: ['--filter', '@mission-platform/barcode-wasm', 'run', 'test'], timeoutMs: 120_000 },
      { label: 'build', args: ['--filter', '@mission-platform/barcode-wasm', 'run', 'build'], timeoutMs: 120_000 },
    ],
  },
  {
    id: 'barcode',
    description: '@mission-platform/barcode',
    commands: [
      { label: 'test', args: ['--filter', '@mission-platform/barcode', 'run', 'test'], timeoutMs: 120_000 },
      { label: 'build', args: ['--filter', '@mission-platform/barcode', 'run', 'build'], timeoutMs: 180_000 },
    ],
  },
  {
    id: 'qr-code-wasm',
    description: '@mission-platform/qr-code-wasm',
    commands: [
      { label: 'test', args: ['--filter', '@mission-platform/qr-code-wasm', 'run', 'test'], timeoutMs: 120_000 },
      { label: 'build', args: ['--filter', '@mission-platform/qr-code-wasm', 'run', 'build'], timeoutMs: 120_000 },
    ],
  },
  {
    id: 'qr-code',
    description: '@mission-platform/qr-code',
    commands: [
      { label: 'test', args: ['--filter', '@mission-platform/qr-code', 'run', 'test'], timeoutMs: 120_000 },
      { label: 'build', args: ['--filter', '@mission-platform/qr-code', 'run', 'build'], timeoutMs: 180_000 },
    ],
  },
  {
    id: 'matrix-code-wasm',
    description: '@mission-platform/matrix-code-wasm',
    commands: [
      { label: 'test', args: ['--filter', '@mission-platform/matrix-code-wasm', 'run', 'test'], timeoutMs: 120_000 },
      { label: 'build', args: ['--filter', '@mission-platform/matrix-code-wasm', 'run', 'build'], timeoutMs: 120_000 },
    ],
  },
  {
    id: 'matrix-code',
    description: '@mission-platform/matrix-code',
    commands: [
      { label: 'test', args: ['--filter', '@mission-platform/matrix-code', 'run', 'test'], timeoutMs: 120_000 },
      { label: 'build', args: ['--filter', '@mission-platform/matrix-code', 'run', 'build'], timeoutMs: 180_000 },
    ],
  },
  {
    id: 'code-scanner-wasm',
    description: '@mission-platform/code-scanner-wasm',
    commands: [
      { label: 'test', args: ['--filter', '@mission-platform/code-scanner-wasm', 'run', 'test'], timeoutMs: 180_000 },
      { label: 'build', args: ['--filter', '@mission-platform/code-scanner-wasm', 'run', 'build'], timeoutMs: 180_000 },
    ],
  },
  {
    id: 'code-scanner',
    description: '@mission-platform/code-scanner',
    commands: [
      { label: 'test', args: ['--filter', '@mission-platform/code-scanner', 'run', 'test'], timeoutMs: 120_000 },
      { label: 'build', args: ['--filter', '@mission-platform/code-scanner', 'run', 'build'], timeoutMs: 180_000 },
    ],
  },
  {
    id: 'benchmark',
    description: 'benchmark',
    commands: [
      { label: 'test', args: ['--filter', 'benchmark', 'run', 'test'], timeoutMs: 120_000 },
      { label: 'build', args: ['--filter', 'benchmark', 'run', 'build'], timeoutMs: 120_000 },
    ],
  },
  {
    id: 'mcp-developer',
    description: '@mission-platform/mcp-developer',
    commands: [
      { label: 'test', args: ['--filter', '@mission-platform/mcp-developer', 'run', 'test'], timeoutMs: 180_000 },
      { label: 'build', args: ['--filter', '@mission-platform/mcp-developer', 'run', 'build'], timeoutMs: 120_000 },
    ],
  },
  {
    id: 'flint-runtime-example',
    description: 'flint-runtime-example',
    commands: [{ label: 'build', args: ['--filter', 'flint-runtime-example', 'run', 'build'], timeoutMs: 180_000 }],
  },
  {
    id: 'extract-package-docs',
    description: 'scripts/extract-package-docs.spec.ts',
    commands: [
      {
        label: 'test',
        args: ['--filter', '@mission-platform/scripts', 'run', 'test', '--', 'extract-package-docs.spec.ts'],
        timeoutMs: 120_000,
      },
    ],
  },
];

interface CommandResult {
  readonly entryId: string;
  readonly description: string;
  readonly label: string;
  readonly success: boolean;
  readonly durationMs: number;
  readonly failures: string[];
  readonly tail: string;
}

function parseFailures(output: string): string[] {
  const failures: string[] = [];
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (
      (trimmed.includes('FAIL') ||
        trimmed.includes('×') ||
        trimmed.includes('✕') ||
        /Error:/.test(trimmed) ||
        /AssertionError/.test(trimmed)) &&
      trimmed.length > 0 &&
      trimmed.length < 300
    ) {
      failures.push(trimmed);
    }
  }
  return [...new Set(failures)].slice(0, 20);
}

function runCommand(
  entry: MatrixEntry,
  command: MatrixEntry['commands'][number],
  skipBuild: boolean,
): CommandResult | undefined {
  if (skipBuild && command.label === 'build') return undefined;

  const started = Date.now();
  const result = spawnSync('pnpm', command.args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: command.timeoutMs ?? 120_000,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
  });
  const durationMs = Date.now() - started;
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const success = result.status === 0;
  return {
    entryId: entry.id,
    description: entry.description,
    label: command.label,
    success,
    durationMs,
    failures: success ? [] : parseFailures(output),
    tail: output.slice(-2500),
  };
}

function main(): number {
  const args = process.argv.slice(2);
  const onlyArg =
    args.find((arg, index) => args[index - 1] === '--only') ??
    args.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
  const only = onlyArg
    ? new Set(
        onlyArg
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      )
    : undefined;
  const skipBuild = args.includes('--skip-build');

  console.log('=== Flint Step 4 Verification Runner ===');
  console.log(`cwd: ${process.cwd()}`);
  console.log(`matrix entries: ${MATRIX.length}${only ? ` (filtered: ${[...only].join(', ')})` : ''}`);
  if (skipBuild) console.log('mode: skip-build');

  const requiredPaths = [
    'packages/flint/core',
    'packages/tooling/vite/flint',
    'examples/flint-runtime',
    'mcp/developer',
    'benchmark/src/adapters/flint-wasm.ts',
    'benchmark/src/adapters/flint-vm.ts',
    'scripts/verify-flint-step4.ts',
  ];
  for (const relativePath of requiredPaths) {
    if (!existsSync(resolve(process.cwd(), relativePath))) {
      console.error(`Missing required path: ${relativePath}`);
      return 1;
    }
  }

  const results: CommandResult[] = [];
  for (const entry of MATRIX) {
    if (only && !only.has(entry.id)) continue;
    console.log(`\n--- ${entry.id}: ${entry.description} ---`);
    for (const command of entry.commands) {
      process.stdout.write(`  ${command.label}... `);
      const result = runCommand(entry, command, skipBuild);
      if (result === undefined) {
        console.log('skipped');
        continue;
      }
      results.push(result);
      if (result.success) {
        console.log(`PASS (${result.durationMs}ms)`);
      } else {
        console.log(`FAIL (${result.durationMs}ms)`);
        if (result.failures.length > 0) {
          console.log('  failures:');
          for (const failure of result.failures) console.log(`    - ${failure}`);
        }
        console.log('  output tail:');
        console.log(result.tail);
      }
    }
  }

  const failed = results.filter((result) => !result.success);
  console.log('\n=== Summary ===');
  console.log(`ran: ${results.length}`);
  console.log(`passed: ${results.length - failed.length}`);
  console.log(`failed: ${failed.length}`);
  if (failed.length > 0) {
    console.log('\nFailed commands:');
    for (const result of failed) {
      console.log(`- ${result.entryId}/${result.label} (${result.description})`);
      for (const failure of result.failures.slice(0, 5)) console.log(`    ${failure}`);
    }
    return 1;
  }
  console.log('All Step-4 matrix commands passed.');
  return 0;
}

process.exit(main());
