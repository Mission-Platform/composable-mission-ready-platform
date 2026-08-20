import { describe, expect, it } from 'vitest';
import { CompletionItemKind } from 'vscode-languageserver/node';

import { createForgeWebScriptLspServer } from './server.js';

import type { InitializeParams } from 'vscode-languageserver/node';

const uri = 'file:///workspace/example.fws';
const validSource = `export fn add(value: i32) -> i32 {
  return value;
}`;
const privateHelperSource = `fn helper() -> i32 { return 1; }
export fn entry() -> i32 { return helper(); }`;

function initialize(server: ReturnType<typeof createForgeWebScriptLspServer>): void {
  server.initialize({ rootUri: 'file:///workspace', workspaceFolders: void 0 } satisfies InitializeParams);
}

describe('Forge Web Script LSP server', () => {
  it('refreshes the workspace only once while opening a document', async () => {
    let listFilesCalls = 0;
    let getOptionsCalls = 0;
    const server = createForgeWebScriptLspServer({
      workspaceHost: {
        readFile: async () => void 0,
        listFiles: async () => {
          listFilesCalls += 1;
          return [];
        },
        getOptions: async () => {
          getOptionsCalls += 1;
          return {};
        },
      },
    });
    initialize(server);

    await server.openDocument({ uri, version: 1, text: validSource });

    expect(listFilesCalls).toBe(0);
    expect(getOptionsCalls).toBe(1);
    await server.shutdown();
  });

  it('publishes protocol diagnostics and clears them on close', async () => {
    const published: Array<{ uri: string; diagnostics: readonly unknown[] }> = [];
    const server = createForgeWebScriptLspServer({
      publishDiagnostics: ({ uri: documentUri, diagnostics }) => published.push({ uri: documentUri, diagnostics }),
    });
    initialize(server);

    await server.openDocument({ uri, version: 1, text: 'export fn broken(' });
    expect(published.at(-1)).toMatchObject({
      uri,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: 'FWS-PARSE-017', source: 'forge-web-script' }),
      ]),
    });
    await server.closeDocument(uri);
    expect(published.at(-1)).toEqual({ uri, diagnostics: [] });
    server.dispose();
  });

  it('accepts private helpers in default protocol diagnostics', async () => {
    const published: Array<{ uri: string; diagnostics: readonly unknown[] }> = [];
    const server = createForgeWebScriptLspServer({
      publishDiagnostics: ({ uri: documentUri, diagnostics }) => published.push({ uri: documentUri, diagnostics }),
    });
    initialize(server);

    await server.openDocument({ uri, version: 1, text: privateHelperSource });

    expect(published.at(-1)?.diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'FWS-ABI-003' })]),
    );
    await server.shutdown();
  });

  it('honors strict export validation from an injected workspace host', async () => {
    const published: Array<{ uri: string; diagnostics: readonly unknown[] }> = [];
    const server = createForgeWebScriptLspServer({
      workspaceHost: {
        readFile: async () => void 0,
        listFiles: async () => [],
        getOptions: async () => ({ requireExports: true }),
      },
      publishDiagnostics: ({ uri: documentUri, diagnostics }) => published.push({ uri: documentUri, diagnostics }),
    });
    initialize(server);

    await server.openDocument({ uri, version: 1, text: privateHelperSource });

    expect(published.at(-1)?.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'FWS-ABI-003' })]),
    );
    await server.shutdown();
  });

  it('honors strict export validation passed to the root-bounded host', async () => {
    const published: Array<{ uri: string; diagnostics: readonly unknown[] }> = [];
    const server = createForgeWebScriptLspServer({
      workspaceOptions: { requireExports: true },
      publishDiagnostics: ({ uri: documentUri, diagnostics }) => published.push({ uri: documentUri, diagnostics }),
    });
    initialize(server);

    await server.openDocument({ uri, version: 1, text: privateHelperSource });

    expect(published.at(-1)?.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'FWS-ABI-003' })]),
    );
    await server.shutdown();
  });

  it('bridges completion replacement ranges and hover through the same handlers', async () => {
    const server = createForgeWebScriptLspServer();
    initialize(server);
    await server.openDocument({ uri, version: 1, text: validSource });

    const completion = server.completion({
      textDocument: { uri },
      position: { line: 1, character: 9 },
    });
    expect(completion.some((item) => item.label === 'value')).toBe(true);
    expect(completion.find((item) => item.label === 'value')?.textEdit).toMatchObject({
      range: { start: { line: 1, character: 9 }, end: { line: 1, character: 9 } },
    });

    const hover = server.hover({ textDocument: { uri }, position: { line: 0, character: 12 } });
    expect(hover).toMatchObject({ contents: { value: expect.stringContaining('add') } });
    await server.shutdown();
  });

  it('bridges workspace features, rename, and client-aware telemetry', async () => {
    const progress: string[] = [];
    const logs: string[] = [];
    const server = createForgeWebScriptLspServer({
      progress: (event) => progress.push(event.kind),
      log: (event) => logs.push(event.event),
    });
    server.initialize({
      rootUri: 'file:///workspace',
      workspaceFolders: void 0,
      capabilities: { window: { workDoneProgress: true } },
    });
    const source = `export fn helper(value: i32) -> i32 {
  let known: i32 = 1;
  return known;
}
export fn entry(value: i32) -> i32 {
  return helper(value);
}`;
    await server.openDocument({ uri, version: 1, text: source });

    const helperPosition = { line: 0, character: 11 };
    expect(server.definition({ textDocument: { uri }, position: { line: 5, character: 9 } })).toEqual([
      expect.objectContaining({ uri, range: expect.objectContaining({ start: { line: 0, character: 10 } }) }),
    ]);
    expect(server.declaration({ textDocument: { uri }, position: helperPosition })).toHaveLength(1);
    expect(server.implementation({ textDocument: { uri }, position: helperPosition })).toEqual([]);
    expect(server.references({ textDocument: { uri }, position: helperPosition })).toHaveLength(1);

    const symbols = server.documentSymbols({ textDocument: { uri } });
    expect(symbols[0]?.children?.map((symbol) => symbol.name)).toEqual(['helper', 'entry']);
    const codeLenses = server.codeLens({ textDocument: { uri } });
    expect(codeLenses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: expect.objectContaining({ title: expect.stringContaining('reference') }) }),
      ]),
    );
    expect(codeLenses.find((lens) => lens.command?.title === '1 reference')?.command).toMatchObject({
      command: 'forge-web-script.showReferences',
      arguments: [
        uri,
        { line: 0, character: 10 },
        [{ uri, range: { start: { line: 5, character: 9 }, end: { line: 5, character: 15 } } }],
      ],
    });
    expect(server.foldingRanges({ textDocument: { uri } }).length).toBeGreaterThan(0);
    expect(
      server.inlineValues({
        textDocument: { uri },
        range: { start: { line: 0, character: 0 }, end: { line: 6, character: 0 } },
      }),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ text: '1' })]));
    expect(
      server.inlayHints({
        textDocument: { uri },
        range: { start: { line: 0, character: 0 }, end: { line: 6, character: 0 } },
      }),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'value:' })]));

    const edit = server.rename({ textDocument: { uri }, position: helperPosition, newName: 'compute' });
    expect(edit?.changes?.[uri]).toHaveLength(2);
    expect(
      server.definition({ textDocument: { uri: 'file:///workspace/missing.fws' }, position: helperPosition }),
    ).toEqual([]);
    expect(
      server.rename({ textDocument: { uri: 'file:///workspace/missing.fws' }, position: helperPosition, newName: 'x' }),
    ).toBeUndefined();
    expect(progress).toEqual(['begin', 'report', 'end']);
    expect(logs).toEqual(expect.arrayContaining(['workspace.refresh.begin', 'workspace.refresh.end']));
    await server.shutdown();
  });

  it('bridges source-function documentation through hover and completion', async () => {
    const server = createForgeWebScriptLspServer();
    initialize(server);
    const source = `/**
 * Adds one to a value.
 * @param value Input value.
 * @return Incremented value.
 */
export fn add(value: i32) -> i32 { return value + 1; }
export fn caller() -> i32 { return add(1); }`;
    await server.openDocument({ uri, version: 1, text: source });
    const documentation = 'Adds one to a value.\n\n@param value Input value.\n\n@return Incremented value.';

    expect(server.hover({ textDocument: { uri }, position: { line: 5, character: 12 } })).toMatchObject({
      contents: { kind: 'markdown', value: expect.stringContaining(documentation) },
    });
    const completion = server.completion({
      textDocument: { uri },
      position: { line: 6, character: 38 },
    });
    expect(completion.find((item) => item.label === 'add')).toMatchObject({ documentation });
    await server.shutdown();
  });

  it('bridges aggregate types, regex functions, and iterResult through editor surfaces', async () => {
    const server = createForgeWebScriptLspServer();
    initialize(server);
    const source = `struct Pair<T> { value: T; }
export fn parse(value: string) -> bool { return regex_search(value, value, 0); }
// one comment`;
    await server.openDocument({ uri, version: 1, text: source });
    const regexOffset = source.indexOf('regex_search');

    const completions = server.completion({
      textDocument: { uri },
      position: { line: 1, character: 7 },
    });
    expect(completions).toContainEqual(
      expect.objectContaining({ label: 'regex_search', kind: CompletionItemKind.Function }),
    );
    expect(completions).toContainEqual(
      expect.objectContaining({ label: 'Pair', kind: CompletionItemKind.TypeParameter }),
    );
    expect(
      server.hover({
        textDocument: { uri },
        position: { line: 1, character: regexOffset - source.indexOf('\n') - 1 + 2 },
      }),
    ).toMatchObject({
      contents: { value: expect.stringContaining('regex_search(string, string, i32): bool') },
    });
    expect(
      server.semanticTokens({ textDocument: { uri } }).data.filter((value, index) => index % 5 === 3 && value === 0),
    ).toHaveLength(1);
    await server.shutdown();
  });

  it('encodes token classifications as line-relative semantic tokens', async () => {
    const server = createForgeWebScriptLspServer();
    initialize(server);
    await server.openDocument({ uri, version: 1, text: validSource });

    const semanticTokens = server.semanticTokens({ textDocument: { uri } });
    expect(semanticTokens.data.slice(0, 15)).toEqual([0, 0, 6, 4, 0, 0, 7, 2, 4, 0, 0, 3, 3, 1, 0]);
    expect(semanticTokens.data.length % 5).toBe(0);
    await server.shutdown();
  });

  it('refreshes workspace options after watched-file changes', async () => {
    let requestedCapabilities: readonly string[] = [];
    const server = createForgeWebScriptLspServer({
      workspaceHost: {
        readFile: async () => void 0,
        listFiles: async () => [],
        getOptions: async () => ({ requestedCapabilities }),
      },
    });
    initialize(server);
    const source = `import capability "clock.now" as now() -> i64;
export fn current() -> i64 { return now(); }`;
    await server.openDocument({ uri, version: 1, text: source });
    expect(server.completion({ textDocument: { uri }, position: { line: 1, character: 0 } })).toBeDefined();
    requestedCapabilities = ['clock.now'];
    await server.changeWatchedFiles({ changes: [{ uri: 'file:///workspace/options.json', type: 2 }] });
    expect(server.completion({ textDocument: { uri }, position: { line: 1, character: 0 } }).length).toBeGreaterThan(0);
    await server.shutdown();
  });

  it('invalidates diagnostics when per-document export policy changes', async () => {
    let requireExports = false;
    const published: Array<{ uri: string; diagnostics: readonly unknown[] }> = [];
    const server = createForgeWebScriptLspServer({
      workspaceHost: {
        readFile: async () => void 0,
        listFiles: async () => [],
        getOptions: async () => ({ requireExports }),
      },
      publishDiagnostics: ({ uri: documentUri, diagnostics }) => published.push({ uri: documentUri, diagnostics }),
    });
    initialize(server);

    await server.openDocument({ uri, version: 1, text: privateHelperSource });
    expect(published.at(-1)?.diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'FWS-ABI-003' })]),
    );

    requireExports = true;
    await server.changeWatchedFiles({ changes: [{ uri: 'file:///workspace/options.json', type: 2 }] });
    expect(published.at(-1)?.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'FWS-ABI-003' })]),
    );

    requireExports = false;
    await server.changeWatchedFiles({ changes: [{ uri: 'file:///workspace/options.json', type: 2 }] });
    expect(published.at(-1)?.diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'FWS-ABI-003' })]),
    );
    await server.shutdown();
  });

  it('rejects protocol operations after clean shutdown', async () => {
    const server = createForgeWebScriptLspServer();
    initialize(server);
    await server.shutdown();
    expect(() => server.completion({ textDocument: { uri }, position: { line: 0, character: 0 } })).toThrow(
      /disposed/u,
    );
    server.dispose();
  });
});
