import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveRepoPath } from '@mission-platform/mcp-shared/repo/paths';

import { shutdownLspSessions, startLspSession } from '../src/lsp/registry.ts';
import { getLspTestsForFile, runBoundedWorkflowProcess, type WorkflowCommand } from '../src/lsp/workflows.ts';

const workspaceRoot = resolveRepoPath('.', 'workflow test workspace');

function nodeCommand(source: string): WorkflowCommand {
  return {
    executable: 'pnpm',
    args: ['exec', 'node', '-e', source],
    cwd: workspaceRoot,
    workspaceRoot,
    script: 'test',
  };
}

describe('bounded LSP workflows', () => {
  it('returns successful command output and exit status', async () => {
    const result = await runBoundedWorkflowProcess(nodeCommand("process.stdout.write('workflow-ok')"), {
      timeoutMs: 5000,
    });

    assert.equal(result.status, 'passed');
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /workflow-ok/);
    assert.equal(result.timedOut, false);
  });

  it('returns failed exit status and stderr without throwing', async () => {
    const result = await runBoundedWorkflowProcess(
      nodeCommand("process.stderr.write('workflow-failed'); process.exit(7)"),
      { timeoutMs: 5000 },
    );

    assert.equal(result.status, 'failed');
    assert.equal(result.exitCode, 7);
    assert.match(result.stderr, /workflow-failed/);
  });

  it('caps combined output and reports truncation', async () => {
    const result = await runBoundedWorkflowProcess(
      nodeCommand("process.stdout.write('x'.repeat(10_000)); process.stderr.write('y'.repeat(10_000))"),
      { timeoutMs: 5000, maxOutputBytes: 128 },
    );

    assert.equal(result.status, 'passed');
    assert.equal(result.outputTruncated, true);
    assert.ok(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr) <= 128);
  });

  it('times out and cleans up a long-running child process', async () => {
    const started = Date.now();
    const result = await runBoundedWorkflowProcess(nodeCommand('setInterval(() => {}, 1000)'), {
      timeoutMs: 50,
    });

    assert.equal(result.status, 'timed-out');
    assert.equal(result.timedOut, true);
    assert.equal(result.exitCode, null);
    assert.ok(Date.now() - started < 2000);
  });

  it('supports cancellation and cleans up the child process', async () => {
    const controller = new AbortController();
    const resultPromise = runBoundedWorkflowProcess(nodeCommand('setInterval(() => {}, 1000)'), {
      timeoutMs: 5000,
      signal: controller.signal,
    });
    controller.abort();
    const result = await resultPromise;

    assert.equal(result.status, 'cancelled');
    assert.equal(result.cancelled, true);
  });

  it('rejects non-allowlisted executables before spawning', () => {
    assert.throws(
      () =>
        runBoundedWorkflowProcess({
          ...nodeCommand(''),
          executable: 'sh',
          args: ['-c', 'echo forbidden'],
        }),
      /not allowlisted/,
    );
  });

  it('correlates a source file with bounded repository tests', async () => {
    const sessionId = startLspSession('json').session.sessionId;
    try {
      const result = await getLspTestsForFile({
        sessionId,
        filePath: 'mcp/developer/src/lsp/edits.ts',
        limit: 10,
      });

      assert.equal(result.sessionId, sessionId);
      assert.equal(result.filePath, 'mcp/developer/src/lsp/edits.ts');
      assert.ok(result.tests.some((test) => test.filePath.endsWith('mcp/developer/test/lsp-edits.test.ts')));
    } finally {
      shutdownLspSessions(sessionId);
    }
  });
});
