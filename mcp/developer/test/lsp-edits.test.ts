import assert from 'node:assert/strict';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveRepoPath } from '@mission-platform/mcp-shared/repo/paths';

import {
  applyLspEdit,
  executeLspCommand,
  formatLspDocument,
  formatLspRange,
  normalizeWorkspaceEdit,
  previewLspEdit,
  renameLspSymbol,
  replaceLspSymbolBody,
  safeDeleteLspSymbol,
  simulateLspChain,
  suggestLspFixes,
} from '../src/lsp/edits.ts';
import { getLspRequestSession, openLspDocument, shutdownLspSessions, startLspSession } from '../src/lsp/registry.ts';

const fixture = fileURLToPath(new URL('.lsp-edit-fixture.json', import.meta.url));
const secondFixture = fileURLToPath(new URL('.lsp-edit-fixture-2.json', import.meta.url));
let sessionId: string;

function edit(start: number, end: number, newText: string, line = 0) {
  return { range: { start: { line, character: start }, end: { line, character: end } }, newText };
}

describe('lsp edits', () => {
  before(() => {
    sessionId = startLspSession('json').session.sessionId;
  });

  after(() => {
    shutdownLspSessions(sessionId);
    for (const file of [fixture, secondFixture]) {
      const path = resolve(file);
      try {
        unlinkSync(path);
      } catch {
        // The fixture may not have been created if setup failed.
      }
    }
  });

  it('normalizes text edits without writing and rejects unsafe ranges', () => {
    const filePath = resolveRepoPath('agent-lsp.json', 'fixture');
    const uri = pathToFileURL(filePath).href;
    const original = readFileSync(filePath, 'utf8');
    const prepared = normalizeWorkspaceEdit(
      {
        changes: {
          [uri]: [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: ' ' }],
        },
      },
      { workspaceRoot: resolveRepoPath('.', 'workspace root') },
    );
    assert.equal(prepared.files[0]?.originalText, original);
    assert.notEqual(prepared.files[0]?.updatedText, original);
    assert.equal(readFileSync(filePath, 'utf8'), original);

    assert.throws(
      () => normalizeWorkspaceEdit({ changes: { [uri]: [edit(0, 2, 'x', 1), edit(1, 3, 'y', 1)] } }),
      /overlap/,
    );
    assert.throws(
      () => normalizeWorkspaceEdit({ changes: { ['file:///tmp/outside.json']: [edit(0, 0, 'x')] } }),
      /repository root|within/,
    );
    assert.throws(
      () => normalizeWorkspaceEdit({ changes: { [uri]: [edit(1_000_000, 1_000_001, 'x')] } }),
      /invalid position|exceeds/,
    );
  });

  it('returns a no-write preview and validates a chained simulation', async () => {
    const filePath = resolveRepoPath('agent-lsp.json', 'fixture');
    const original = readFileSync(filePath, 'utf8');
    const preview = await previewLspEdit({
      sessionId,
      filePath: 'agent-lsp.json',
      edits: [edit(0, 0, ' ')],
      apply: true,
    });
    assert.equal(preview.dryRun, true);
    assert.equal(preview.applied, false);
    assert.equal(preview.files.length, 1);
    assert.equal(readFileSync(filePath, 'utf8'), original);

    const chain = await simulateLspChain({
      sessionId,
      steps: [
        { filePath: 'agent-lsp.json', edits: [edit(0, 0, ' ')] },
        { filePath: 'agent-lsp.json', edits: [edit(0, 1, '{')] },
      ],
    });
    assert.equal(chain.dryRun, true);
    assert.equal(chain.safeToApplyThroughStep, 2);
    assert.equal(chain.steps.length, 2);
    assert.equal(readFileSync(filePath, 'utf8'), original);
  });

  it('previews symbol replacement and safe deletion without writing', async () => {
    const filePath = resolveRepoPath('agent-lsp.json', 'fixture');
    const original = readFileSync(filePath, 'utf8');
    const replacement = await replaceLspSymbolBody({
      sessionId,
      filePath: 'agent-lsp.json',
      symbolRange: { start: { line: 1, character: 2 }, end: { line: 1, character: 9 } },
      newText: 'servers',
    });
    assert.equal(replacement.dryRun, true);
    assert.equal(replacement.files[0]?.edits[0]?.newText, 'servers');

    const deletion = await safeDeleteLspSymbol({
      sessionId,
      filePath: 'agent-lsp.json',
      symbolRange: { start: { line: 1, character: 2 }, end: { line: 1, character: 9 } },
    });
    assert.equal(deletion.dryRun, true);
    assert.equal(deletion.files[0]?.edits[0]?.newText, '');
    assert.equal(readFileSync(filePath, 'utf8'), original);
  });

  it('applies a validated multi-file edit and reports document versions', async () => {
    writeFileSync(resolve(fixture), '{"value":1}\n', 'utf8');
    writeFileSync(resolve(secondFixture), '{"other":1}\n', 'utf8');
    const firstPath = resolve(fixture);
    const secondPath = resolve(secondFixture);
    const result = await applyLspEdit({
      sessionId,
      apply: true,
      workspaceEdit: {
        changes: {
          [pathToFileURL(firstPath).href]: [edit(2, 7, 'next')],
          [pathToFileURL(secondPath).href]: [edit(2, 7, 'newer')],
        },
      },
    });
    assert.equal(result.applied, true);
    assert.equal(readFileSync(firstPath, 'utf8'), '{"next":1}\n');
    assert.equal(readFileSync(secondPath, 'utf8'), '{"newer":1}\n');
    assert.deepEqual(
      result.files.map((file) => file.versionAfter),
      [1, 1],
    );
    assert.deepEqual(Object.keys(result.diagnosticDelta).sort(), [firstPath, secondPath].sort());
  });

  it('rejects stale versions before applying an edit', async () => {
    const filePath = resolve(fixture);
    writeFileSync(filePath, '{"value":1}\n', 'utf8');
    await openLspDocument(filePath, sessionId, 'json');
    await assert.rejects(
      () =>
        applyLspEdit({
          sessionId,
          apply: true,
          filePath,
          edits: [edit(2, 7, 'stale')],
          expectedVersions: { [filePath]: 0 },
        }),
      /Stale open-document version/,
    );
    assert.equal(readFileSync(filePath, 'utf8'), '{"value":1}\n');
  });

  it('returns an unsupported result when rename is not advertised', async () => {
    const isolated = startLspSession('json').session.sessionId;
    try {
      const session = await getLspRequestSession(isolated, 'json');
      session.protocol.getCapabilities = () => ({});
      const result = await renameLspSymbol({
        sessionId: isolated,
        filePath: 'agent-lsp.json',
        line: 0,
        character: 0,
        newName: 'renamed',
      });
      assert.equal(result.supported, false);
      assert.equal(result.operation, 'lsp_rename');
      assert.match(result.reason, /renameProvider/);
    } finally {
      shutdownLspSessions(isolated);
    }
  });

  it('previews and explicitly applies a code action edit', async () => {
    writeFileSync(resolve(fixture), '{"value":1}\n', 'utf8');
    const filePath = resolve(fixture);
    const isolated = startLspSession('json').session.sessionId;
    try {
      const session = await getLspRequestSession(isolated, 'json');
      session.protocol.getCapabilities = () => ({ codeActionProvider: true });
      session.protocol.request = (async () => [
        {
          title: 'Normalize value',
          kind: 'quickfix',
          edit: {
            changes: {
              [pathToFileURL(filePath).href]: [edit(2, 7, 'next')],
            },
          },
        },
      ]) as typeof session.protocol.request;
      session.protocol.waitForDiagnostics = async () => [];

      const request = {
        sessionId: isolated,
        filePath,
        start: { line: 0, character: 0 },
        end: { line: 0, character: 11 },
      };
      const preview = await suggestLspFixes(request);
      assert.equal(preview.supported, true);
      assert.equal(preview.actions[0]?.title, 'Normalize value');
      assert.equal(preview.applied, undefined);
      assert.equal(readFileSync(filePath, 'utf8'), '{"value":1}\n');

      const applied = await suggestLspFixes({ ...request, actionIndex: 0, apply: true });
      assert.equal(applied.supported, true);
      assert.equal(applied.applied?.applied, true);
      assert.equal(readFileSync(filePath, 'utf8'), '{"next":1}\n');
    } finally {
      shutdownLspSessions(isolated);
    }
  });

  it('previews and explicitly applies document formatting edits', async () => {
    writeFileSync(resolve(fixture), '{"value":1}\n', 'utf8');
    const filePath = resolve(fixture);
    const isolated = startLspSession('json').session.sessionId;
    try {
      const session = await getLspRequestSession(isolated, 'json');
      session.protocol.getCapabilities = () => ({ documentFormattingProvider: true });
      session.protocol.request = (async () => [edit(2, 7, 'next')]) as typeof session.protocol.request;
      session.protocol.waitForDiagnostics = async () => [];

      const request = { sessionId: isolated, filePath };
      const preview = await formatLspDocument(request);
      assert.equal(preview.supported, true);
      assert.equal(preview.dryRun, true);
      assert.equal(readFileSync(filePath, 'utf8'), '{"value":1}\n');

      const applied = await formatLspDocument({ ...request, apply: true });
      assert.equal(applied.supported, true);
      assert.equal(applied.applied, true);
      assert.equal(readFileSync(filePath, 'utf8'), '{"next":1}\n');
    } finally {
      shutdownLspSessions(isolated);
    }
  });

  it('previews and explicitly applies range formatting edits', async () => {
    writeFileSync(resolve(fixture), '{"value":1}\n', 'utf8');
    const filePath = resolve(fixture);
    const isolated = startLspSession('json').session.sessionId;
    try {
      const session = await getLspRequestSession(isolated, 'json');
      session.protocol.getCapabilities = () => ({ documentRangeFormattingProvider: true });
      session.protocol.request = (async () => [edit(2, 7, 'next')]) as typeof session.protocol.request;
      session.protocol.waitForDiagnostics = async () => [];

      const request = {
        sessionId: isolated,
        filePath,
        start: { line: 0, character: 0 },
        end: { line: 0, character: 11 },
      };
      const preview = await formatLspRange(request);
      assert.equal(preview.supported, true);
      assert.equal(preview.dryRun, true);
      assert.equal(readFileSync(filePath, 'utf8'), '{"value":1}\n');

      const applied = await formatLspRange({ ...request, apply: true });
      assert.equal(applied.supported, true);
      assert.equal(applied.applied, true);
      assert.equal(readFileSync(filePath, 'utf8'), '{"next":1}\n');
    } finally {
      shutdownLspSessions(isolated);
    }
  });

  it('rejects commands that are not in the advertised command allowlist', async () => {
    const isolated = startLspSession('json').session.sessionId;
    try {
      const session = await getLspRequestSession(isolated, 'json');
      session.protocol.getCapabilities = () => ({ executeCommandProvider: { commands: ['allowed.command'] } });
      let requested = false;
      session.protocol.request = (async () => {
        requested = true;
        return [];
      }) as typeof session.protocol.request;
      const result = await executeLspCommand({ sessionId: isolated, command: 'blocked.command', apply: true });
      assert.ok('supported' in result);
      assert.equal(result.supported, false);
      assert.match(result.reason, /did not advertise/);
      assert.equal(requested, false);
    } finally {
      shutdownLspSessions(isolated);
    }
  });
});
