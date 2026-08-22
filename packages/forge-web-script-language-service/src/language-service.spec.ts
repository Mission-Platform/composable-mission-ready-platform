import { lexForgeWebScript } from '@mission-platform/forge-web-script';
import { describe, expect, it } from 'vitest';

import { createForgeWebScriptLanguageService, offsetAtPosition, positionAtOffset, tokenizeForgeWebScript } from '.';

const arithmetic = `export fn add(value: i32) -> i32 {
    let result: i32 = value + 1;
    return result;
}`;

function document(text: string, version = 1) {
  return { uri: 'file:///workspace/arithmetic.fws', fileName: 'arithmetic.fws', text, version };
}

describe('Forge Web Script language service', () => {
  it('accepts private helpers by default and exposes them to same-module editor tooling', () => {
    const service = createForgeWebScriptLanguageService();
    const source = `fn helper(value: i32) -> i32 { return value + 1; }
export fn entry(value: i32) -> i32 { return helper(value); }`;
    service.openDocument(document(source));
    const uri = document(source).uri;

    const analysis = service.diagnose(uri);
    expect(analysis.valid).toBe(true);
    expect(analysis.diagnostics).toEqual([]);
    expect(analysis.symbols.find((symbol) => symbol.name === 'helper')).toMatchObject({
      kind: 'function',
      detail: 'helper(i32): i32',
    });
    expect(
      service
        .complete(uri, positionAtOffset(source, source.indexOf('helper(value)') + 'helper'.length))
        .find((item) => item.label === 'helper'),
    ).toMatchObject({ kind: 'function', detail: 'helper(i32): i32' });
    expect(service.hover(uri, positionAtOffset(source, source.lastIndexOf('helper') + 1))).toMatchObject({
      contents: ['helper(i32): i32'],
    });
    service.dispose();
  });

  it('preserves explicit export requirements and invalidates cached analyses when the policy changes', async () => {
    let requireExports: boolean | undefined = true;
    let notify: ((change: { readonly uri: string; readonly kind: 'changed' }) => void) | undefined;
    const service = createForgeWebScriptLanguageService({
      readFile: async () => '',
      listFiles: async () => [],
      getOptions: async () => ({ requireExports }),
      watch: (listener) => {
        notify = listener;
        return { dispose: () => (notify = undefined) };
      },
    });
    const source = `fn hidden() -> i32 { return 1; }
export fn entry() -> i32 { return hidden(); }`;
    service.openDocument(document(source));
    await service.refreshWorkspace(document(source).uri);

    const strict = service.diagnose(document(source).uri);
    expect(strict.diagnostics).toEqual([
      expect.objectContaining({ code: 'FWS-ABI-003', phase: 'abi', severity: 'error' }),
    ]);
    expect(strict.diagnostics[0]?.hint).toContain('export');

    requireExports = false;
    notify?.({ uri: document(source).uri, kind: 'changed' });
    await service.refreshWorkspace(document(source).uri);
    const permissive = service.diagnose(document(source).uri);
    expect(permissive).not.toBe(strict);
    expect(permissive.diagnostics).toEqual([]);
    service.dispose();
  });

  it.each(['interpret', 'jit', 'aot'] as const)('reports bounded FWS lex parity in %s mode', (selfHostedVmMode) => {
    const service = createForgeWebScriptLanguageService({
      readFile: async () => '',
      listFiles: async () => [],
      getOptions: async () => ({ selfHostedVmMode }),
    });
    service.openDocument(document(arithmetic));

    const analysisPromise = service.refreshWorkspace('file:///workspace/arithmetic.fws');
    return analysisPromise.then(() => {
      const analysis = service.diagnose('file:///workspace/arithmetic.fws');
      expect(analysis.valid).toBe(true);
      expect(analysis.diagnostics).toEqual([]);
      expect(analysis.selfHosted).toMatchObject({ mode: selfHostedVmMode, parity: true });
      service.dispose();
    });
  });

  it('converts positions using UTF-16 code units and handles multiline boundaries', () => {
    const source = '😀value\r\nnext';
    expect(positionAtOffset(source, 2)).toEqual({ line: 0, character: 2 });
    expect(positionAtOffset(source, 9)).toEqual({ line: 1, character: 0 });
    expect(offsetAtPosition(source, { line: 0, character: 2 })).toBe(2);
    expect(offsetAtPosition(source, { line: 1, character: 4 })).toBe(source.length);
  });

  it('reuses cached analyses, ignores stale versions, and invalidates changed documents', () => {
    const service = createForgeWebScriptLanguageService();
    service.openDocument(document(arithmetic));
    const first = service.diagnose('file:///workspace/arithmetic.fws');
    expect(service.diagnose('file:///workspace/arithmetic.fws')).toBe(first);
    service.updateDocument(document('', 0));
    expect(service.diagnose('file:///workspace/arithmetic.fws')).toBe(first);
    service.updateDocument(document('export fn changed() -> i32 { return 1; }', 2));
    const second = service.diagnose('file:///workspace/arithmetic.fws');
    expect(second).not.toBe(first);
    expect(second.version).toBe(2);
    service.dispose();
    expect(() => service.diagnose('file:///workspace/arithmetic.fws')).toThrow('disposed');
  });

  it('refreshes workspace options and invalidates affected analysis', async () => {
    let requestedCapabilities: readonly string[] = [];
    let notify: ((change: { readonly uri: string; readonly kind: 'changed' }) => void) | undefined;
    const service = createForgeWebScriptLanguageService({
      readFile: async () => '',
      listFiles: async () => [],
      getOptions: async () => ({ requestedCapabilities }),
      watch: (listener) => {
        notify = listener;
        return { dispose: () => (notify = void 0) };
      },
    });
    const source = `import capability "clock.now" as now() -> i64;
export fn current() -> i64 { return now(); }`;
    service.openDocument(document(source));
    await service.refreshWorkspace();
    expect(service.diagnose(document(source).uri).diagnostics.map((item) => item.code)).toContain('FWS-ABI-002');
    requestedCapabilities = ['clock.now'];
    notify?.({ uri: document(source).uri, kind: 'changed' });
    await service.refreshWorkspace(document(source).uri);
    expect(service.diagnose(document(source).uri).diagnostics).toEqual([]);
    service.dispose();
    expect(notify).toBeUndefined();
  });

  it('indexes declarations and provides scoped completion and hover', () => {
    const service = createForgeWebScriptLanguageService();
    service.openDocument(document(arithmetic));
    const uri = document(arithmetic).uri;
    const analysis = service.diagnose(uri);
    expect(analysis.symbols.map((symbol) => symbol.name)).toEqual(
      expect.arrayContaining(['add', 'value', 'result', 'i32']),
    );
    const completion = service.complete(uri, { line: 2, character: 6 });
    expect(completion.find((item) => item.label === 'return')).toMatchObject({
      range: { start: { line: 2, character: 4 }, end: { line: 2, character: 6 } },
    });
    expect(service.complete(uri, { line: 2, character: 13 }).find((item) => item.label === 'result')).toBeDefined();
    const valueOffset = arithmetic.indexOf('value +');
    const hover = service.hover(uri, positionAtOffset(arithmetic, valueOffset + 2));
    expect(hover?.contents[0]).toContain('parameter value: i32');
    expect(service.hover(uri, positionAtOffset(arithmetic, arithmetic.indexOf('add')))?.contents[0]).toContain('add(');
  });

  it('renders source-function documentation for declaration and reference hover and completion', () => {
    const service = createForgeWebScriptLanguageService();
    const source = `/**
 * Adds one to a value.
 * @param value Input value.
 * @return Incremented value.
 */
export fn add(value: i32) -> i32 { return value + 1; }
export fn caller() -> i32 { return add(1); }`;
    const uri = document(source).uri;
    service.openDocument(document(source));
    const documentation = 'Adds one to a value.\n\n@param value Input value.\n\n@return Incremented value.';

    expect(service.hover(uri, positionAtOffset(source, source.indexOf('add')))?.contents).toEqual([
      'export add(i32): i32',
      documentation,
    ]);
    expect(service.hover(uri, positionAtOffset(source, source.lastIndexOf('add')))?.contents).toEqual([
      'add(i32): i32',
      documentation,
    ]);
    expect(
      service
        .complete(uri, positionAtOffset(source, source.indexOf('add(1)') + 'add'.length))
        .find((item) => item.label === 'add'),
    ).toMatchObject({ detail: 'export add(i32): i32', documentation });
  });

  it('completes control-flow and compiler-owned string functions with signatures', () => {
    const service = createForgeWebScriptLanguageService();
    const uri = document('').uri;
    const incomplete = 'export fn parse() -> i32 { iter';
    service.openDocument(document(incomplete));

    const iteratorCompletion = service.complete(uri, positionAtOffset(incomplete, incomplete.length));
    expect(iteratorCompletion.find((item) => item.label === 'iter')).toMatchObject({
      kind: 'keyword',
      range: {
        start: { line: 0, character: incomplete.indexOf('iter') },
        end: { line: 0, character: incomplete.length },
      },
    });

    const source = `export fn parse(value: string) -> i32 {
  return string_length(value);
}`;
    service.updateDocument(document(source, 2));
    const stringPrefixOffset = source.indexOf('string_') + 'string_'.length;
    const stringCompletions = service.complete(uri, positionAtOffset(source, stringPrefixOffset));
    expect(stringCompletions.filter((item) => item.label.startsWith('string_')).map((item) => item.label)).toEqual([
      'string_byte_at',
      'string_concat',
      'string_length',
      'string_slice',
      'string_starts_with',
      'string_to_i32',
    ]);
    expect(stringCompletions.find((item) => item.label === 'string_length')).toMatchObject({
      kind: 'function',
      detail: 'string_length(string): i32',
      range: {
        start: positionAtOffset(source, source.indexOf('string_')),
        end: positionAtOffset(source, stringPrefixOffset),
      },
    });

    const hover = service.hover(uri, positionAtOffset(source, source.indexOf('string_length') + 1));
    expect(hover?.contents).toContain('string_length(string): i32');
  });

  it('keeps completion and hover safe for incomplete documents', () => {
    const service = createForgeWebScriptLanguageService();
    const cases = [
      'export fn parse(value: string) -> i32 { whil',
      'export fn parse(value: string) -> i32 { return string_',
      'export fn parse(value: string) -> i32 { if value == ',
    ];
    for (const [index, source] of cases.entries()) {
      service.openDocument(document(source, index + 1));
      const uri = document('').uri;
      const position = positionAtOffset(source, source.length);
      expect(() => service.diagnose(uri)).not.toThrow();
      expect(() => service.complete(uri, position)).not.toThrow();
      expect(service.complete(uri, position)).toEqual(expect.any(Array));
      expect(() => service.hover(uri, position)).not.toThrow();
    }

    const tokenKinds = tokenizeForgeWebScript('// note\nlet x: i32 = "unterminated');
    expect(tokenKinds.map((token) => token.kind)).toEqual(
      expect.arrayContaining(['comment', 'declaration', 'type', 'invalid']),
    );
  });

  it('classifies grammar tokens across trivia and preserves UTF-16 ranges', () => {
    const source = 'export fn /* docs */ add(value: /* type */ i32) -> i32 {\r\n  return "🙂";\r\n}';
    const tokens = tokenizeForgeWebScript(source);

    expect(tokens.map(({ kind, text }) => ({ kind, text }))).toEqual([
      { kind: 'keyword', text: 'export' },
      { kind: 'keyword', text: 'fn' },
      { kind: 'comment', text: '/* docs */' },
      { kind: 'declaration', text: 'add' },
      { kind: 'punctuation', text: '(' },
      { kind: 'declaration', text: 'value' },
      { kind: 'punctuation', text: ':' },
      { kind: 'comment', text: '/* type */' },
      { kind: 'type', text: 'i32' },
      { kind: 'punctuation', text: ')' },
      { kind: 'operator', text: '->' },
      { kind: 'type', text: 'i32' },
      { kind: 'punctuation', text: '{' },
      { kind: 'keyword', text: 'return' },
      { kind: 'string', text: '"🙂"' },
      { kind: 'punctuation', text: ';' },
      { kind: 'punctuation', text: '}' },
    ]);
    expect(tokens.find((token) => token.text === '"🙂"')?.range).toMatchObject({
      startOffset: source.indexOf('"🙂"'),
      endOffset: source.indexOf('"🙂"') + 4,
      start: { line: 1, character: 9 },
      end: { line: 1, character: 13 },
    });
    expect(tokens.some((token) => token.text === 'eof')).toBe(false);
  });

  it('supports imperative loops and exposes iterator types in editor surfaces', () => {
    const service = createForgeWebScriptLanguageService();
    const source = `export iter fn values(source: Iterator<i32>) -> Iterator<i32> {
  loop next = source.next() { yield next; }
}
export fn invalid() -> i32 { while true { return 1; } }`;
    const iteratorDocument = {
      uri: 'file:///workspace/iterator.fws',
      fileName: 'iterator.fws',
      text: source,
      version: 1,
    };
    service.openDocument(iteratorDocument);
    const analysis = service.diagnose(iteratorDocument.uri);
    expect(analysis.valid).toBe(true);
    expect(analysis.diagnostics).toEqual([]);
    expect(analysis.selfHosted).toMatchObject({ parity: true });
    expect(analysis.symbols.find((symbol) => symbol.name === 'Iterator<i32>')).toMatchObject({
      detail: 'Forge Web Script type Iterator<i32>',
    });
    const completions = service.complete(iteratorDocument.uri, positionAtOffset(source, source.indexOf('yield')));
    expect(completions).toContainEqual(expect.objectContaining({ label: 'Iterator', kind: 'type' }));
    expect(completions).toContainEqual(expect.objectContaining({ label: 'while', kind: 'keyword' }));
    expect(service.hover(iteratorDocument.uri, positionAtOffset(source, source.indexOf('Iterator') + 1))).toMatchObject(
      {
        contents: ['generic type Iterator<T>'],
      },
    );
    const tokens = service.tokenize(iteratorDocument.uri);
    expect(tokens.find((token) => token.text === 'Iterator')?.kind).toBe('type');
    expect(tokens.find((token) => token.text === 'while')?.kind).toBe('keyword');
    expect(lexForgeWebScript(source, iteratorDocument.fileName).diagnostics).toEqual([]);
  });

  it('surfaces aggregate, generic, iterator, and match symbols', () => {
    const service = createForgeWebScriptLanguageService();
    const source = `struct Pair<T: Equatable> { first: T; second: i32; }
enum Maybe<T> { None, Some(value: T), }
interface Equatable<T> { fn equals(left: T, right: T) -> bool; }
export fn select<T: Equatable>(value: T) -> i32 {
  return match value { case Some(x) => 1, _ => 0 };
}
export iter fn values(source: Iterator<i32>) -> Iterator<i32> {
  loop next = source.next() { yield next; }
}
`;
    const editorDocument = document(source);
    service.openDocument(editorDocument);

    const analysis = service.diagnose(editorDocument.uri);
    expect(analysis.diagnostics).toEqual([]);
    expect(analysis.selfHosted).toMatchObject({ parity: true });
    expect(analysis.symbols.map((symbol) => symbol.name)).toEqual(
      expect.arrayContaining(['Pair', 'T', 'first', 'second', 'Maybe', 'Some', 'Equatable', 'equals', 'next', 'x']),
    );
    expect(service.hover(editorDocument.uri, positionAtOffset(source, source.indexOf('Pair<T:') + 1))).toMatchObject({
      contents: ['Forge Web Script type Pair<T: Equatable>'],
    });
    expect(service.complete(editorDocument.uri, positionAtOffset(source, source.indexOf('enum Maybe')))).toContainEqual(
      expect.objectContaining({ label: 'Pair', kind: 'type' }),
    );
  });

  it('surfaces every compiler-owned standard-library function and iterResult', () => {
    const service = createForgeWebScriptLanguageService();
    const source =
      'export fn parse(value: string) -> iterResult<i32, string> { return regex_search(value, value, 0); }';
    const editorDocument = document(source);
    service.openDocument(editorDocument);

    const completions = service.complete(
      editorDocument.uri,
      positionAtOffset(source, source.indexOf('export fn') + 'export '.length),
    );
    expect(completions.filter((item) => item.label.startsWith('regex_'))).toHaveLength(9);
    expect(completions.find((item) => item.label === 'iterResult')).toMatchObject({ kind: 'type' });
    expect(
      service.hover(editorDocument.uri, positionAtOffset(source, source.indexOf('regex_search') + 2)),
    ).toMatchObject({
      contents: ['regex_search(string, string, i32): bool'],
    });
    expect(service.hover(editorDocument.uri, positionAtOffset(source, source.indexOf('iterResult') + 2))).toMatchObject(
      {
        contents: ['generic type iterResult<T, E>'],
      },
    );
    expect(service.tokenize(editorDocument.uri).find((token) => token.text === 'iterResult')?.kind).toBe('type');
  });

  it('only suggests accepted grammar keywords and emits each comment once', () => {
    const service = createForgeWebScriptLanguageService();
    const source = '// note\nexport fn parse() -> i32 { return 1; }';
    const editorDocument = document(source);
    service.openDocument(editorDocument);

    const completions = service.complete(editorDocument.uri, { line: 1, character: 0 });
    expect(completions.map((item) => item.label)).toEqual(
      expect.arrayContaining(['do', 'interface', 'match', 'struct', 'while']),
    );
    expect(completions.map((item) => item.label)).not.toEqual(
      expect.arrayContaining(['class', 'for', 'throw', 'try', 'catch', 'new']),
    );
    expect(service.tokenize(editorDocument.uri).filter((token) => token.kind === 'comment')).toHaveLength(1);
  });

  it('resolves local definitions, references, and renames without touching unrelated text', async () => {
    const service = createForgeWebScriptLanguageService();
    const source = `export fn add(value: i32) -> i32 {
  let result: i32 = value + 1;
  return result;
}
export fn caller(value: i32) -> i32 { return add(value); }`;
    const uri = document(source).uri;
    service.openDocument(document(source));
    await service.refreshWorkspace(uri);

    const definition = service.definition(uri, positionAtOffset(source, source.lastIndexOf('add') + 1));
    expect(definition).toEqual([
      expect.objectContaining({
        uri,
        range: expect.objectContaining({ startOffset: source.indexOf('add'), endOffset: source.indexOf('add') + 3 }),
      }),
    ]);
    expect(service.declaration(uri, positionAtOffset(source, source.lastIndexOf('add') + 1))).toEqual(definition);

    const references = service.references(uri, positionAtOffset(source, source.indexOf('add') + 1));
    expect(references).toEqual([
      expect.objectContaining({
        uri,
        range: expect.objectContaining({
          startOffset: source.lastIndexOf('add'),
          endOffset: source.lastIndexOf('add') + 3,
        }),
      }),
    ]);

    const localDefinition = service.definition(uri, positionAtOffset(source, source.indexOf('result;') + 1));
    expect(localDefinition[0]).toMatchObject({
      uri,
      range: { startOffset: source.indexOf('result'), endOffset: source.indexOf('result') + 6 },
    });

    const rename = service.rename(uri, positionAtOffset(source, source.lastIndexOf('add') + 1), 'sum');
    expect(rename).toBeDefined();
    expect([...rename!.changes.keys()]).toEqual([uri]);
    expect(rename!.changes.get(uri)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          newText: 'sum',
          range: expect.objectContaining({ startOffset: source.indexOf('add') }),
        }),
        expect.objectContaining({
          newText: 'sum',
          range: expect.objectContaining({ startOffset: source.lastIndexOf('add') }),
        }),
      ]),
    );
    expect(service.rename(uri, positionAtOffset(source, source.lastIndexOf('add') + 1), '1bad')).toBeUndefined();
    service.dispose();
  });

  it('resolves qualified cross-module definitions, references, and safe workspace renames', async () => {
    const helperSource =
      'export fn run(value: i32) -> i32 { return value + 1; }\nexport fn unused() -> i32 { return 0; }';
    const mainSource =
      'import "./helper.fws" as helper;\nexport fn entry(value: i32) -> i32 { return helper.run(value); }';
    const otherSource = 'export fn run(value: i32) -> i32 { return value; }';
    const files = new Map<string, string>([
      ['file:///workspace/helper.fws', helperSource],
      ['file:///workspace/main.fws', mainSource],
      ['file:///workspace/other.fws', otherSource],
    ]);
    const service = createForgeWebScriptLanguageService({
      readFile: async (uri) => files.get(uri) ?? '',
      listFiles: async () => [...files.keys()],
      getOptions: async () => ({}),
    });

    for (const [uri, text] of files) {
      service.openDocument({ uri, fileName: uri.split('/').pop()!, text, version: 1 });
    }
    await service.refreshWorkspace();

    const callOffset = mainSource.indexOf('run');
    const helperRunOffset = helperSource.indexOf('run');
    const definition = service.definition('file:///workspace/main.fws', positionAtOffset(mainSource, callOffset + 1));
    expect(definition).toEqual([
      expect.objectContaining({
        uri: 'file:///workspace/helper.fws',
        range: expect.objectContaining({
          startOffset: helperRunOffset,
          endOffset: helperRunOffset + 3,
        }),
      }),
    ]);
    expect(service.declaration('file:///workspace/main.fws', positionAtOffset(mainSource, callOffset + 1))).toEqual(
      definition,
    );

    const referencesFromDeclaration = service.references(
      'file:///workspace/helper.fws',
      positionAtOffset(helperSource, helperRunOffset + 1),
    );
    expect(referencesFromDeclaration).toEqual([
      expect.objectContaining({
        uri: 'file:///workspace/main.fws',
        range: expect.objectContaining({ startOffset: callOffset, endOffset: callOffset + 3 }),
      }),
    ]);

    const rename = service.rename(
      'file:///workspace/main.fws',
      positionAtOffset(mainSource, callOffset + 1),
      'execute',
    );
    expect(rename).toBeDefined();
    expect(rename!.changes.get('file:///workspace/helper.fws')).toEqual([
      expect.objectContaining({
        newText: 'execute',
        range: expect.objectContaining({ startOffset: helperRunOffset, endOffset: helperRunOffset + 3 }),
      }),
    ]);
    expect(rename!.changes.get('file:///workspace/main.fws')).toEqual([
      expect.objectContaining({
        newText: 'execute',
        range: expect.objectContaining({ startOffset: callOffset, endOffset: callOffset + 3 }),
      }),
    ]);
    expect(rename!.changes.has('file:///workspace/other.fws')).toBe(false);

    // Same-name export in another module must not be confused with the imported helper.
    const otherDefinition = service.definition(
      'file:///workspace/other.fws',
      positionAtOffset(otherSource, otherSource.indexOf('run') + 1),
    );
    expect(otherDefinition).toEqual([
      expect.objectContaining({
        uri: 'file:///workspace/other.fws',
        range: expect.objectContaining({ startOffset: otherSource.indexOf('run') }),
      }),
    ]);
    service.dispose();
  });

  it('checks imported signatures and refreshes importer diagnostics when dependencies change', async () => {
    const helperUri = 'file:///workspace/helper.fws';
    const mainUri = 'file:///workspace/main.fws';
    const files = new Map<string, string>([
      [helperUri, 'export fn run(value: i32) -> i32 { return value + 1; }'],
      [mainUri, 'import "./helper.fws" as helper;\nexport fn entry(value: i32) -> i32 { return helper.run(value); }'],
    ]);
    const service = createForgeWebScriptLanguageService({
      readFile: async (uri) => files.get(uri) ?? '',
      listFiles: async () => [...files.keys()],
      getOptions: async () => ({}),
    });
    for (const [uri, text] of files) service.openDocument({ uri, fileName: uri.split('/').pop()!, text, version: 1 });

    await service.refreshWorkspace();
    expect(service.diagnose(mainUri).diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: expect.stringMatching(/FWS-(ABI|TYPE)/u) })]),
    );
    expect(service.inlayHints(mainUri)).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: ': i32', kind: 'type' })]),
    );

    const incompatibleHelper = 'export fn run(value: string) -> string { return value; }';
    files.set(helperUri, incompatibleHelper);
    service.updateDocument({ uri: helperUri, fileName: 'helper.fws', text: incompatibleHelper, version: 2 });
    await service.refreshWorkspace(helperUri);

    expect(service.diagnose(mainUri).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'FWS-TYPE-005', message: expect.stringContaining('string') }),
      ]),
    );
    expect(service.inlayHints(mainUri)).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: ': string', kind: 'type' })]),
    );
    service.dispose();
  });

  it('uses imported signatures for inlay hints and preserves export filtering across alias changes', async () => {
    const helperUri = 'file:///workspace/helper.fws';
    const otherUri = 'file:///workspace/other.fws';
    const mainUri = 'file:///workspace/main.fws';
    const helperSource =
      'export fn run(value: i32) -> i32 { return value + 1; }\nfn hidden(value: i32) -> i32 { return value; }';
    const otherSource = 'export fn run(value: string) -> string { return value; }';
    const mainSource =
      'import "./helper.fws" as helper;\nimport "./other.fws" as other;\nexport fn entry(value: i32) -> i32 { return helper.run(value); }';
    const files = new Map<string, string>([
      [helperUri, helperSource],
      [otherUri, otherSource],
      [mainUri, mainSource],
    ]);
    const service = createForgeWebScriptLanguageService({
      readFile: async (uri) => files.get(uri) ?? '',
      listFiles: async () => [...files.keys()],
      getOptions: async () => ({}),
    });
    for (const [uri, text] of files) service.openDocument({ uri, fileName: uri.split('/').pop()!, text, version: 1 });

    await service.refreshWorkspace();
    expect(service.inlayHints(mainUri)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'value:', kind: 'parameter' }),
        expect.objectContaining({ label: ': i32', kind: 'type' }),
      ]),
    );
    expect(service.diagnose(mainUri).diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: expect.stringMatching(/^FWS-(ABI|TYPE)/u) })]),
    );

    const incompatibleMain =
      'import "./helper.fws" as helper;\nexport fn entry(value: string) -> string { return helper.run(value); }';
    service.updateDocument({ uri: mainUri, fileName: 'main.fws', text: incompatibleMain, version: 2 });
    await service.refreshWorkspace(mainUri);
    expect(service.diagnose(mainUri).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'FWS-TYPE-005', message: expect.stringContaining("expected 'i32'") }),
        expect.objectContaining({
          code: 'FWS-TYPE-005',
          message: expect.stringContaining("returns 'string', but the return statement has type 'i32'"),
        }),
      ]),
    );
    expect(service.inlayHints(mainUri)).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: ': i32', kind: 'type' })]),
    );

    const aliasedMain = 'import "./helper.fws" as h;\nexport fn entry(value: i32) -> i32 { return h.run(value); }';
    service.updateDocument({ uri: mainUri, fileName: 'main.fws', text: aliasedMain, version: 3 });
    await service.refreshWorkspace(mainUri);
    expect(service.diagnose(mainUri).diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: expect.stringMatching(/^FWS-(ABI|TYPE)/u) })]),
    );
    expect(service.inlayHints(mainUri)).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: ': i32', kind: 'type' })]),
    );

    const privateMain =
      'import "./helper.fws" as helper;\nexport fn entry(value: i32) -> i32 { return helper.hidden(value); }';
    service.updateDocument({ uri: mainUri, fileName: 'main.fws', text: privateMain, version: 4 });
    await service.refreshWorkspace(mainUri);
    expect(service.diagnose(mainUri).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'FWS-ABI-004' })]),
    );
    expect(service.inlayHints(mainUri)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ label: ': i32', kind: 'type' })]),
    );
    service.dispose();
  });

  it('does not load unrelated listed files during a URI-scoped refresh', async () => {
    const activeUri = 'file:///workspace/main.fws';
    const unrelatedUri = 'file:///workspace/generated.fws';
    const files = new Map<string, string>([
      [activeUri, 'export fn entry() -> i32 { return 1; }'],
      [unrelatedUri, 'export fn generated() -> i32 { return 2; }'],
    ]);
    const reads: string[] = [];
    const service = createForgeWebScriptLanguageService({
      readFile: async (uri) => {
        reads.push(uri);
        return files.get(uri) ?? '';
      },
      listFiles: async () => [...files.keys()],
      getOptions: async () => ({}),
    });

    service.openDocument({ uri: activeUri, fileName: 'main.fws', text: files.get(activeUri)!, version: 1 });
    await service.refreshWorkspace(activeUri);

    expect(reads).not.toContain(unrelatedUri);
    expect(service.diagnose(activeUri).valid).toBe(true);
    service.dispose();
  });

  it('keeps interface implementation lookup empty when no reliable relationship exists', async () => {
    const source = `interface Runnable {
  fn run(value: i32) -> i32;
}
export fn run(value: i32) -> i32 { return value + 1; }
export fn entry(value: i32) -> i32 { return run(value); }`;
    const service = createForgeWebScriptLanguageService();
    const uri = document(source).uri;
    service.openDocument(document(source));
    await service.refreshWorkspace(uri);

    const methodOffset = source.indexOf('fn run') + 'fn '.length;
    expect(service.implementation(uri, positionAtOffset(source, methodOffset + 1))).toEqual([]);
    expect(service.definition(uri, positionAtOffset(source, methodOffset + 1))).toEqual([
      expect.objectContaining({
        uri,
        range: expect.objectContaining({ startOffset: methodOffset, endOffset: methodOffset + 3 }),
      }),
    ]);

    // Unresolved / non-identifier positions stay safe for rename.
    expect(service.rename(uri, positionAtOffset(source, source.indexOf('return') + 1), 'renamed')).toBeUndefined();
    expect(service.definition(uri, positionAtOffset(source, source.indexOf('{') + 1))).toEqual([]);
    service.dispose();
  });

  it('keeps malformed documents query-safe and refreshes changed workspace modules', async () => {
    const files = new Map<string, string>([
      ['file:///workspace/helper.fws', 'export fn run(value: i32) -> i32 { return value + 1; }'],
      [
        'file:///workspace/main.fws',
        'import "./helper.fws" as helper;\nexport fn entry(value: i32) -> i32 { return helper.run(value); }',
      ],
    ]);
    let notify: ((change: { readonly uri: string; readonly kind: 'changed' | 'deleted' }) => void) | undefined;
    const service = createForgeWebScriptLanguageService({
      readFile: async (uri) => files.get(uri) ?? '',
      listFiles: async () => [...files.keys()],
      getOptions: async () => ({}),
      watch: (listener) => {
        notify = listener;
        return { dispose: () => (notify = undefined) };
      },
    });

    const malformed = 'export fn broken(value: i32) -> i32 { return helper.';
    service.openDocument({
      uri: 'file:///workspace/broken.fws',
      fileName: 'broken.fws',
      text: malformed,
      version: 1,
    });
    await service.refreshWorkspace('file:///workspace/broken.fws');
    expect(() => service.diagnose('file:///workspace/broken.fws')).not.toThrow();
    expect(() =>
      service.definition('file:///workspace/broken.fws', positionAtOffset(malformed, malformed.length - 1)),
    ).not.toThrow();
    expect(
      service.definition('file:///workspace/broken.fws', positionAtOffset(malformed, malformed.length - 1)),
    ).toEqual([]);
    expect(
      service.rename('file:///workspace/broken.fws', positionAtOffset(malformed, malformed.length - 1), 'fixed'),
    ).toBeUndefined();

    for (const [uri, text] of files) {
      service.openDocument({ uri, fileName: uri.split('/').pop()!, text, version: 1 });
    }
    await service.refreshWorkspace();

    const main = files.get('file:///workspace/main.fws')!;
    expect(service.definition('file:///workspace/main.fws', positionAtOffset(main, main.indexOf('run') + 1))).toEqual([
      expect.objectContaining({
        uri: 'file:///workspace/helper.fws',
        range: expect.objectContaining({ startOffset: 10, endOffset: 13 }),
      }),
    ]);

    const updatedHelper =
      'export fn run(value: i32) -> i32 { return value + 2; }\nexport fn extra() -> i32 { return 1; }';
    files.set('file:///workspace/helper.fws', updatedHelper);
    service.updateDocument({
      uri: 'file:///workspace/helper.fws',
      fileName: 'helper.fws',
      text: updatedHelper,
      version: 2,
    });
    notify?.({ uri: 'file:///workspace/helper.fws', kind: 'changed' });
    await service.refreshWorkspace('file:///workspace/helper.fws');

    const references = service.references(
      'file:///workspace/helper.fws',
      positionAtOffset(updatedHelper, updatedHelper.indexOf('run') + 1),
    );
    expect(references).toEqual([
      expect.objectContaining({
        uri: 'file:///workspace/main.fws',
        range: expect.objectContaining({ startOffset: main.indexOf('run') }),
      }),
    ]);
    expect(service.definition('file:///workspace/main.fws', positionAtOffset(main, main.indexOf('run') + 1))).toEqual([
      expect.objectContaining({
        uri: 'file:///workspace/helper.fws',
        range: expect.objectContaining({
          startOffset: updatedHelper.indexOf('run'),
          endOffset: updatedHelper.indexOf('run') + 3,
        }),
      }),
    ]);

    // Completions continue to surface workspace-visible exports after refresh.
    expect(
      service
        .complete('file:///workspace/main.fws', positionAtOffset(main, main.indexOf('helper.run') + 'helper.'.length))
        .some((item) => item.label === 'run' || item.label === 'extra'),
    ).toBe(true);
    service.dispose();
  });

  it('provides deterministic declaration lenses and hierarchical document symbols, including zero references', async () => {
    const source = `export fn used(value: i32) -> i32 {
  let answer: i32 = 1;
  return answer;
}
export fn unused() -> i32 {
  return 0;
}
export fn entry(value: i32) -> i32 {
  return used(value);
}`;
    const service = createForgeWebScriptLanguageService();
    const uri = document(source).uri;
    service.openDocument(document(source));
    await service.refreshWorkspace(uri);

    const lenses = service.codeLenses(uri);
    expect(lenses.map((lens) => [lens.symbolName, lens.referenceCount, lens.title])).toEqual([
      ['used', 1, '1 reference'],
      ['unused', 0, '0 references'],
      ['entry', 0, '0 references'],
    ]);
    expect(lenses).toEqual(service.codeLenses(uri));

    const symbols = service.documentSymbols(uri);
    expect(symbols).toHaveLength(1);
    expect(symbols[0]).toMatchObject({ name: 'arithmetic' });
    expect(symbols[0]?.children.map((child) => child.name)).toEqual(['used', 'unused', 'entry']);
    expect(symbols[0]?.children.find((child) => child.name === 'used')?.children.map((child) => child.name)).toContain(
      'value',
    );
    service.dispose();
  });

  it('emits one code lens for an aggregate declaration despite repeated type references', () => {
    const source = `struct Foo { value: i32; }
export fn first(value: Foo) -> Foo { return value; }
export fn second(value: Foo) -> Foo { return value; }`;
    const service = createForgeWebScriptLanguageService();
    const uri = document(source).uri;
    service.openDocument(document(source));

    const fooLenses = service.codeLenses(uri).filter((lens) => lens.symbolName === 'Foo');
    expect(fooLenses).toHaveLength(1);
    expect(fooLenses[0]).toMatchObject({
      symbolKind: 'type',
      range: { startOffset: source.indexOf('Foo'), endOffset: source.indexOf('Foo') + 3 },
    });
    const fooSymbol = service.documentSymbols(uri)[0]?.children.find((symbol) => symbol.name === 'Foo');
    expect(fooSymbol?.children.map((symbol) => symbol.name)).toContain('value');
    service.dispose();
  });

  it('derives nested folds with UTF-16 ranges and conservative literal inline values/inlay hints', async () => {
    const source = `// 😀 header\r\nexport fn add(value: i32) -> i32 {\r\n  let known: i32 = 1;\r\n  if value > 0 {\r\n    while value > 0 {\r\n      return add(known);\r\n    }\r\n  }\r\n  let unknown: i32 = value;\r\n  return unknown;\r\n}`;
    const service = createForgeWebScriptLanguageService();
    const uri = document(source).uri;
    service.openDocument(document(source));
    await service.refreshWorkspace(uri);

    const folds = service.foldingRanges(uri);
    expect(folds.filter((fold) => fold.kind === 'region')).toHaveLength(2);
    expect(folds.every((fold) => fold.range.startOffset < fold.range.endOffset)).toBe(true);
    expect(folds.some((fold) => fold.range.start.line === 3 && fold.range.end.line >= 5)).toBe(true);

    const inline = service.inlineValues(uri);
    expect(inline).toEqual([expect.objectContaining({ variableName: 'known', text: '1', type: 'i32' })]);
    expect(inline.some((value) => value.variableName === 'unknown')).toBe(false);

    const hints = service.inlayHints(uri);
    expect(hints).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'parameter', label: 'value:' })]));
    expect(
      hints.some(
        (hint) =>
          hint.kind === 'type' &&
          hint.position.line === positionAtOffset(source, source.indexOf('known') + 'known'.length).line &&
          hint.position.character === positionAtOffset(source, source.indexOf('known') + 'known'.length).character,
      ),
    ).toBe(false);
    expect(hints.some((hint) => hint.position.line === 5 && hint.position.character > 0)).toBe(true);
    service.dispose();
  });

  it('returns empty secondary features for incomplete syntax instead of throwing', () => {
    const source = 'export fn incomplete(value: i32) -> i32 { if value > 0 {';
    const service = createForgeWebScriptLanguageService();
    const uri = document(source).uri;
    service.openDocument(document(source));
    expect(() => service.codeLenses(uri)).not.toThrow();
    expect(() => service.foldingRanges(uri)).not.toThrow();
    expect(() => service.inlineValues(uri)).not.toThrow();
    expect(() => service.inlayHints(uri)).not.toThrow();
    expect(() => service.documentSymbols(uri)).not.toThrow();
    expect(service.foldingRanges(uri)).toEqual([]);
    expect(service.inlineValues(uri)).toEqual([]);
    service.dispose();
  });

  it('covers switch cases and nested statements in secondary features', async () => {
    const source = `export fn dispatch(state: i32) -> i32 {
  switch state {
    case 0: {
      let known: i32 = 1;
      return dispatch(known);
    }
    default: return dispatch(1);
  }
}`;
    const service = createForgeWebScriptLanguageService();
    const uri = document(source).uri;
    service.openDocument(document(source));
    await service.refreshWorkspace(uri);

    const folds = service.foldingRanges(uri);
    expect(folds.filter((fold) => fold.kind === 'region')).toHaveLength(2);
    expect(folds.some((fold) => fold.range.startOffset === source.indexOf('switch'))).toBe(true);
    expect(service.inlineValues(uri)).toEqual([
      expect.objectContaining({ variableName: 'known', text: '1', type: 'i32' }),
    ]);
    expect(service.inlayHints(uri)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'parameter', label: 'state:' }),
        expect.objectContaining({ kind: 'type', label: ': i32' }),
      ]),
    );
    service.dispose();
  });

  it('drops stale parsed declarations when an open document becomes malformed', async () => {
    const service = createForgeWebScriptLanguageService();
    const uri = document('export fn stable() -> i32 { return 1; }').uri;
    service.openDocument({
      uri,
      fileName: 'arithmetic.fws',
      text: 'export fn stable() -> i32 { return 1; }',
      version: 1,
    });
    await service.refreshWorkspace(uri);

    const malformed = 'export fn broken() -> i32 { return stable.';
    service.updateDocument({ uri, fileName: 'arithmetic.fws', text: malformed, version: 2 });

    expect(service.definition(uri, positionAtOffset(malformed, malformed.length - 1))).toEqual([]);
    expect(service.rename(uri, positionAtOffset(malformed, malformed.length - 1), 'renamed')).toBeUndefined();
    service.dispose();
  });

  it('recomputes source-import aliases after an open document changes', async () => {
    const files = new Map<string, string>([
      ['file:///workspace/one.fws', 'export fn one() -> i32 { return 1; }'],
      ['file:///workspace/two.fws', 'export fn two(value: i32) -> i32 { return value; }'],
      ['file:///workspace/main.fws', 'import "./one.fws" as dep;\nexport fn entry() -> i32 { return dep.one(); }'],
    ]);
    const service = createForgeWebScriptLanguageService({
      readFile: async (uri) => files.get(uri),
      listFiles: async () => [...files.keys()],
      getOptions: async () => ({}),
    });
    for (const [uri, text] of files) service.openDocument({ uri, fileName: uri.split('/').pop()!, text, version: 1 });
    await service.refreshWorkspace();

    const mainUri = 'file:///workspace/main.fws';
    const updated = 'import "./two.fws" as dep;\nexport fn entry(value: i32) -> i32 { return dep.two(value); }';
    service.updateDocument({ uri: mainUri, fileName: 'main.fws', text: updated, version: 2 });
    await service.refreshWorkspace(mainUri);
    const target = service.definition(mainUri, positionAtOffset(updated, updated.lastIndexOf('two') + 1));
    expect(target).toEqual([expect.objectContaining({ uri: 'file:///workspace/two.fws' })]);
    expect(service.complete(mainUri, positionAtOffset(updated, updated.indexOf('dep.') + 'dep.'.length))).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'two' })]),
    );
    service.dispose();
  });
});
