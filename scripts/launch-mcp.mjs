import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDirectory, '..');
const serverScript = path.join(repoRoot, 'mcp/developer/dist/index.js');

if (!existsSync(serverScript)) {
  throw new Error(
    `[mission-mcp] Error: Compiled MCP developer server not found at "${serverScript}".\nRun "pnpm exec turbo run build --filter @mission-platform/mcp-developer" before launching.`,
  );
}

const child = spawn(process.execPath, [serverScript, ...process.argv.slice(2)], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    MISSION_REPO_ROOT: repoRoot,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exitCode = code ?? 0;
});
