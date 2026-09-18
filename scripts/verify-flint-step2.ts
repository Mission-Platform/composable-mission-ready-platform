import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const PACKAGES = ['regex', 'wasm', 'core', 'runtime', 'stdlib', 'language-service', 'lsp', 'dap', 'cli', 'vitest'];

const FLINT_ROOT = join(process.cwd(), 'packages', 'flint');

export interface ScanResult {
  file: string;
  line: number;
  pattern: string;
  content: string;
}

export function scanForLegacyPatterns(): ScanResult[] {
  const results: ScanResult[] = [];
  const patterns = [/@mission-platform\/forge-web-script/g, /ForgeWebScript/g, /\bFWS-[A-Z0-9-]+/g, /\.fws\b/g];

  function walk(dir: string) {
    for (const item of readdirSync(dir)) {
      if (
        item === 'node_modules' ||
        item === 'dist' ||
        item === '.turbo' ||
        item === '.git' ||
        item === 'docs' ||
        item === 'CHANGELOG.md'
      )
        continue;
      const fullPath = join(dir, item);
      const st = statSync(fullPath);
      if (st.isDirectory()) {
        walk(fullPath);
      } else if (st.isFile()) {
        if (fullPath.endsWith('.wasm') || fullPath.endsWith('.png') || fullPath.endsWith('.jpg')) continue;
        const text = readFileSync(fullPath, 'utf8');
        const lines = text.split('\n');
        for (const [index, line] of lines.entries()) {
          for (const pattern of patterns) {
            pattern.lastIndex = 0;
            if (pattern.test(line)) {
              results.push({
                file: relative(process.cwd(), fullPath),
                line: index + 1,
                pattern: pattern.source,
                content: line.trim(),
              });
            }
          }
        }
      }
    }
  }

  for (const pkg of PACKAGES) {
    const pkgDir = join(FLINT_ROOT, pkg);
    if (existsSync(pkgDir)) {
      walk(pkgDir);
    }
  }
  return results;
}

export function runPackageBuild(pkg: string): { success: boolean; output: string } {
  const pkgDir = join(FLINT_ROOT, pkg);
  const pkgJson = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
  const pkgName = pkgJson.name;

  try {
    const res = spawnSync('pnpm', ['--filter', pkgName, 'run', 'build:check'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 120_000,
    });
    return {
      success: res.status === 0,
      output: (res.stdout || '') + '\n' + (res.stderr || ''),
    };
  } catch (error: unknown) {
    return {
      success: false,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}

export function runPackageTest(pkg: string): { success: boolean; output: string; failures: string[] } {
  const pkgDir = join(FLINT_ROOT, pkg);
  const pkgJson = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
  const pkgName = pkgJson.name;

  try {
    const res = spawnSync('pnpm', ['--filter', pkgName, 'run', 'test'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 120_000,
    });
    const combinedOutput = (res.stdout || '') + '\n' + (res.stderr || '');
    const failures: string[] = [];

    // Parse failing test lines from Vitest output
    const lines = combinedOutput.split('\n');
    for (const line of lines) {
      if (line.includes('FAIL') || line.includes('✕')) {
        failures.push(line.trim());
      }
    }

    return {
      success: res.status === 0,
      output: combinedOutput,
      failures,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: message,
      failures: [message],
    };
  }
}

// CLI execution
if (process.argv[1]?.endsWith('verify-flint-step2.ts')) {
  const args = process.argv.slice(2);
  const isScan = args.includes('--scan') || args.length === 0;
  const isBuild = args.includes('--build');
  const isTest = args.includes('--test');
  const targetPkg = args.find((a, i) => args[i - 1] === '--pkg');

  console.log('=== Flint Step 2 Verification Runner ===');

  if (isScan) {
    console.log('\n--- Scanning for legacy references across packages/flint/* ---');
    const scanResults = scanForLegacyPatterns();
    console.log(`Found ${scanResults.length} legacy occurrences:`);
    const byPkg = new Map<string, number>();
    const byFile = new Map<string, ScanResult[]>();
    for (const r of scanResults) {
      const pkg = r.file.split('/')[2] || 'unknown';
      byPkg.set(pkg, (byPkg.get(pkg) || 0) + 1);
      const list = byFile.get(r.file) || [];
      list.push(r);
      byFile.set(r.file, list);
    }
    console.log('\nBreakdown by package:');
    for (const [pkg, count] of byPkg.entries()) {
      console.log(`  ${pkg}: ${count}`);
    }
    console.log(`Total files with legacy references: ${byFile.size}`);
  }

  const pkgsToRun = targetPkg ? [targetPkg] : PACKAGES;

  if (isBuild) {
    console.log('\n--- Building Flint Packages (build:check) ---');
    for (const pkg of pkgsToRun) {
      process.stdout.write(`Building ${pkg}... `);
      const res = runPackageBuild(pkg);
      if (res.success) {
        console.log('✔ PASS');
      } else {
        console.log('✖ FAIL');
        console.log(res.output);
      }
    }
  }

  if (isTest) {
    console.log('\n--- Testing Flint Packages (test) ---');
    for (const pkg of pkgsToRun) {
      process.stdout.write(`Testing ${pkg}... `);
      const res = runPackageTest(pkg);
      if (res.success) {
        console.log('✔ PASS');
      } else {
        console.log('✖ FAIL');
        if (res.failures.length > 0) {
          console.log('  Failures:');
          for (const f of res.failures) {
            console.log(`    ${f}`);
          }
        }
        console.log(res.output.slice(-2000));
      }
    }
  }
}
