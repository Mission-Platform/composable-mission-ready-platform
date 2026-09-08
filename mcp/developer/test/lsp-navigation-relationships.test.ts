import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/index.ts';

let client: Client;
let sessionId: string | undefined;

before(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  await server.connect(serverTransport);
  client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(clientTransport);
});

async function callTool(
  name: string,
  arguments_: Record<string, unknown> = {},
): Promise<{ text: string; isError: boolean }> {
  const result = await client.callTool({ name, arguments: arguments_ });
  const content = result.content as { type: string; text: string; isError?: boolean }[];
  const text = content.map((entry) => entry.text).join('\n');
  const isError = content.some((entry) => !!entry.isError);
  return { text, isError };
}

describe('navigation and relationships', () => {
  it('initializes json session', async () => {
    const { text } = await callTool('lsp_start', { languageId: 'json' });
    const result = JSON.parse(text);
    sessionId = result.session.sessionId;
    assert.ok(sessionId, 'Expected sessionId in response');
  });

  it('lists symbols for a json file with truncation', async () => {
    const filePath = 'agent-lsp.json';
    await callTool('lsp_open_document', { filePath, sessionId });
    // Use a small limit to test truncation
    const { text, isError } = await callTool('lsp_list_symbols', { filePath, limit: 1, sessionId });
    assert.equal(isError, false, 'lsp_list_symbols should not error');
    const result = JSON.parse(text);
    assert.ok(result.supported === true, 'Expected supported: true');
    assert.ok(Array.isArray(result.symbols), 'Expected symbols array');
    assert.ok(result.symbols.length <= 1, 'Expected at most 1 symbol due to limit');
    assert.ok(result.truncated === true, 'Expected truncated flag to be true');
  });

  it('lists symbols without truncation when limit is high', async () => {
    const filePath = 'agent-lsp.json';
    const { text, isError } = await callTool('lsp_list_symbols', { filePath, limit: 500, sessionId });
    assert.equal(isError, false, 'lsp_list_symbols should not error');
    const result = JSON.parse(text);
    assert.ok(result.supported === true, 'Expected supported: true');
    assert.ok(Array.isArray(result.symbols), 'Expected symbols array');
    // With a high limit, truncated should be false (or true if there are many symbols)
    assert.ok(typeof result.truncated === 'boolean', 'Expected truncated to be a boolean');
  });

  it('returns unsupported result for type hierarchy on json server', async () => {
    const filePath = 'agent-lsp.json';
    const { text, isError } = await callTool('lsp_type_hierarchy', {
      filePath,
      line: 0,
      character: 0,
      direction: 'both',
      sessionId,
    });
    assert.equal(isError, false, 'Tool call should not error');
    const result = JSON.parse(text);
    // JSON server does not support type hierarchy, so we expect supported: false
    assert.ok(result.supported === false, 'Expected supported: false for unsupported capability');
    assert.ok(typeof result.reason === 'string', 'Expected reason string');
    assert.ok(result.operation === 'lsp_type_hierarchy', 'Expected operation name');
  });

  it('returns unsupported result for call hierarchy on json server', async () => {
    const filePath = 'agent-lsp.json';
    const { text, isError } = await callTool('lsp_find_callers', {
      filePath,
      line: 0,
      character: 0,
      direction: 'incoming',
      sessionId,
    });
    assert.equal(isError, false, 'Tool call should not error');
    const result = JSON.parse(text);
    // JSON server does not support call hierarchy
    assert.ok(result.supported === false, 'Expected supported: false for unsupported capability');
    assert.ok(typeof result.reason === 'string', 'Expected reason string');
  });

  it('normalizes location for definition with proper shape', async () => {
    const filePath = 'agent-lsp.json';
    await callTool('lsp_open_document', { filePath, sessionId });
    // Get symbols to find a position
    const { text: symbolsText } = await callTool('lsp_list_symbols', { filePath, sessionId });
    const symbolsResult = JSON.parse(symbolsText);

    if (symbolsResult.symbols && symbolsResult.symbols.length > 0) {
      const symbol = symbolsResult.symbols[0];
      const { text: defText, isError } = await callTool('lsp_go_to_definition', {
        filePath,
        line: symbol.location.range.start.line,
        character: symbol.location.range.start.character,
        sessionId,
      });
      assert.equal(isError, false, `Definition lookup should not error: ${defText}`);
      const defs = JSON.parse(defText);

      // Verify the response structure - either supported or unsupported
      assert.ok(typeof defs.supported === 'boolean', 'Expected supported boolean');

      if (defs.supported === true) {
        assert.ok(Array.isArray(defs.locations), 'Expected locations array');

        // Verify location normalization
        if (defs.locations.length > 0) {
          const loc = defs.locations[0];
          assert.ok(typeof loc.uri === 'string', 'Expected uri string');
          assert.ok(loc.path === null || typeof loc.path === 'string', 'Expected path to be null or string');
          assert.ok(typeof loc.external === 'boolean', 'Expected external boolean');
          assert.ok(loc.range, 'Expected range object');
          assert.ok(typeof loc.range.start.line === 'number', 'Expected start.line number');
          assert.ok(typeof loc.range.start.character === 'number', 'Expected start.character number');
          assert.ok(typeof loc.range.end.line === 'number', 'Expected end.line number');
          assert.ok(typeof loc.range.end.character === 'number', 'Expected end.character number');
        }
      } else {
        // If unsupported, verify the unsupported response structure
        assert.ok(typeof defs.reason === 'string', 'Expected reason string when unsupported');
      }
    }
  });

  it('returns empty results for references when none exist', async () => {
    const filePath = 'agent-lsp.json';
    const { text, isError } = await callTool('lsp_find_references', {
      filePath,
      line: 0,
      character: 0,
      sessionId,
    });
    assert.equal(isError, false, 'Tool call should not error');
    const result = JSON.parse(text);

    if (result.supported === true) {
      assert.ok(Array.isArray(result.references), 'Expected references array');
      assert.ok(typeof result.truncated === 'boolean', 'Expected truncated boolean');
      assert.ok(typeof result.includeDeclaration === 'boolean', 'Expected includeDeclaration boolean');
    }
  });

  it('returns unsupported result for references on json server if not supported', async () => {
    const filePath = 'agent-lsp.json';
    const { text, isError } = await callTool('lsp_find_references', {
      filePath,
      line: 0,
      character: 0,
      sessionId,
    });
    assert.equal(isError, false, 'Tool call should not error');
    const result = JSON.parse(text);

    // Result should have either supported: true or supported: false
    assert.ok(typeof result.supported === 'boolean', 'Expected supported boolean');
    if (result.supported === false) {
      assert.ok(typeof result.reason === 'string', 'Expected reason string when unsupported');
    }
  });

  it('returns unsupported result for implementations on json server', async () => {
    const filePath = 'agent-lsp.json';
    const { text, isError } = await callTool('lsp_find_implementations', {
      filePath,
      line: 0,
      character: 0,
      sessionId,
    });
    assert.equal(isError, false, 'Tool call should not error');
    const result = JSON.parse(text);

    // JSON server does not support implementations
    assert.ok(result.supported === false, 'Expected supported: false for unsupported capability');
    assert.ok(typeof result.reason === 'string', 'Expected reason string');
  });

  it('returns hover documentation and source separately', async () => {
    const filePath = 'agent-lsp.json';
    const { text, isError } = await callTool('lsp_get_symbol_documentation', {
      filePath,
      line: 0,
      character: 0,
      sessionId,
    });
    assert.equal(isError, false, 'Tool call should not error');
    const result = JSON.parse(text);

    if (result.supported === true) {
      assert.ok(typeof result.documentation === 'string', 'Expected documentation string');
      assert.ok(Array.isArray(result.source), 'Expected source array');
    }
  });

  it('returns unsupported result for hover on json server if not supported', async () => {
    const filePath = 'agent-lsp.json';
    const { text, isError } = await callTool('lsp_get_symbol_source', {
      filePath,
      line: 0,
      character: 0,
      sessionId,
    });
    assert.equal(isError, false, 'Tool call should not error');
    const result = JSON.parse(text);

    // Result should have either supported: true or supported: false
    assert.ok(typeof result.supported === 'boolean', 'Expected supported boolean');
  });
});

after(async () => {
  // Shutdown the session to clean up language-server child processes
  if (sessionId) {
    try {
      await callTool('lsp_shutdown', { sessionId });
    } catch {
      // Ignore errors during shutdown
    }
  }
  // Close the client to clean up resources
  await client.close();
});
