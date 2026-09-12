import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hoverContents, normalizeLocationLike } from '../src/lsp/contracts.ts';
import { startLspSession, shutdownLspSessions, getLspRequestSession } from '../src/lsp/registry.ts';
import { findLspCallers, getLspTypeHierarchy, getLspCrossRepoReferences } from '../src/lsp/relationships.ts';

describe('lsp-logic', () => {
  describe('contracts', () => {
    it('hoverContents splits correctly', () => {
      const input = {
        contents: [
          'Documentation text',
          { language: 'typescript', value: '```typescript\nconst x = 1;\n```' },
          'More text',
        ],
      };
      const result = hoverContents(input);
      assert.equal(result.documentation, 'Documentation text\n\nMore text');
      assert.deepEqual(result.source, ['```typescript\nconst x = 1;\n```']);
    });

    it('normalizeLocationLike normalizes target variant', () => {
      const input = {
        targetUri: 'file:///path/to/file.ts',
        targetSelectionRange: {
          start: { line: 1, character: 2 },
          end: { line: 1, character: 4 },
        },
      };
      const result = normalizeLocationLike(input);
      assert.ok(result);
      assert.equal(result.uri, 'file:///path/to/file.ts');
      assert.equal(result.range.start.line, 1);
      assert.equal(result.range.start.character, 2);
    });
  });

  describe('operations', () => {
    it('mocks protocol for supported call hierarchy', async () => {
      const start = startLspSession('json');
      const sessionId = start.session.sessionId;
      const session = await getLspRequestSession(sessionId, 'json');

      // Mock the request method
      session.protocol.getCapabilities = () => ({ callHierarchyProvider: true });
      session.protocol.request = (async (method: string) => {
        if (method === 'textDocument/prepareCallHierarchy') {
          return [
            {
              name: 'test',
              kind: 1,
              uri: 'file:///test.ts',
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
              selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            },
          ];
        }
        if (method === 'callHierarchy/incomingCalls') {
          return [
            {
              from: {
                name: 'caller',
                kind: 1,
                uri: 'file:///caller.ts',
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
              },
              fromRanges: [],
            },
          ];
        }
        return [];
      }) as typeof session.protocol.request;

      const result = await findLspCallers({
        filePath: 'agent-lsp.json',
        line: 0,
        character: 0,
        sessionId,
        direction: 'incoming',
      });
      assert.ok(result && 'supported' in result && result.supported);
      assert.equal(result.callers[0].item.name, 'caller');

      shutdownLspSessions(sessionId);
    });

    it('mocks protocol for supported type hierarchy', async () => {
      const start = startLspSession('json');
      const sessionId = start.session.sessionId;
      const session = await getLspRequestSession(sessionId, 'json');

      session.protocol.getCapabilities = () => ({ typeHierarchyProvider: true });
      session.protocol.request = (async (method: string) => {
        if (method === 'textDocument/prepareTypeHierarchy') {
          return [
            {
              name: 'test',
              kind: 1,
              uri: 'file:///test.ts',
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
              selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            },
          ];
        }
        if (method === 'typeHierarchy/supertypes') {
          return [
            {
              name: 'super',
              kind: 1,
              uri: 'file:///super.ts',
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
              selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            },
          ];
        }
        return [];
      }) as typeof session.protocol.request;

      const result = await getLspTypeHierarchy({
        filePath: 'agent-lsp.json',
        line: 0,
        character: 0,
        sessionId,
        direction: 'supertypes',
      });
      assert.ok(result && 'supported' in result && result.supported);
      assert.equal(result.items[0].name, 'super');

      shutdownLspSessions(sessionId);
    });

    it('mocks protocol for supported cross-repo references', async () => {
      const start = startLspSession('json');
      const sessionId = start.session.sessionId;
      const session = await getLspRequestSession(sessionId, 'json');

      session.protocol.getCapabilities = () => ({ referencesProvider: true });
      session.protocol.request = (async (method: string) => {
        if (method === 'textDocument/references') {
          return [
            { uri: 'file:///test.ts', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } },
          ];
        }
        return [];
      }) as typeof session.protocol.request;

      const result = await getLspCrossRepoReferences({ filePath: 'agent-lsp.json', line: 0, character: 0, sessionId });
      assert.ok(result && 'supported' in result && result.supported);
      assert.equal(result.references[0].uri, 'file:///test.ts');

      shutdownLspSessions(sessionId);
    });
  });
});
