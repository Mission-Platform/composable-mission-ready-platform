import { createForgeWebScriptLanguageService } from '@mission-platform/forge-web-script-language-service';
import { describe, expect, it } from 'vitest';

import { attachForgeWebScriptMonaco } from './forge-web-script';

interface Disposable {
  dispose(): void;
}

class FakeModel {
  readonly uri = {
    path: '/workspace/example.fws',
    toString: () => 'file:///workspace/example.fws',
  };
  private listener: (() => void) | undefined;
  private version = 1;

  constructor(private text: string) {}

  getValue(): string {
    return this.text;
  }

  getVersionId(): number {
    return this.version;
  }

  onDidChangeContent(listener: () => void): Disposable {
    this.listener = listener;
    return { dispose: () => (this.listener = undefined) };
  }

  setValue(text: string): void {
    this.text = text;
    this.version += 1;
    this.listener?.();
  }
}

function createFakeMonaco(model: FakeModel) {
  const tokenProviders: Array<{
    languageId: string;
    provider: { tokenize: (line: string, state: object) => unknown };
  }> = [];
  const completionProviders: Array<{ provideCompletionItems: (model: unknown, position: unknown) => unknown }> = [];
  const hoverProviders: Array<{ provideHover: (model: unknown, position: unknown) => unknown }> = [];
  const markers: unknown[] = [];
  let registrationsDisposed = 0;

  const disposable = (): Disposable => ({ dispose: () => (registrationsDisposed += 1) });
  class Range {
    constructor(
      readonly startLineNumber: number,
      readonly startColumn: number,
      readonly endLineNumber: number,
      readonly endColumn: number,
    ) {}
  }
  const runtime = {
    languages: {
      getLanguages: () => [],
      register: () => {},
      setTokensProvider: (languageId: string, provider: { tokenize: (line: string, state: object) => unknown }) => {
        tokenProviders.push({ languageId, provider });
        return disposable();
      },
      registerCompletionItemProvider: (
        _languageId: string,
        provider: { provideCompletionItems: (model: unknown, position: unknown) => unknown },
      ) => {
        completionProviders.push(provider);
        return disposable();
      },
      registerHoverProvider: (
        _languageId: string,
        provider: { provideHover: (model: unknown, position: unknown) => unknown },
      ) => {
        hoverProviders.push(provider);
        return disposable();
      },
      CompletionItemKind: { Keyword: 17, TypeParameter: 25, Function: 3, Module: 8, Variable: 5 },
    },
    MarkerSeverity: { Error: 8, Warning: 4, Info: 2 },
    Range,
    editor: {
      getModel: () => model,
      setModelMarkers: (_model: unknown, _owner: string, nextMarkers: unknown[]) => markers.push(nextMarkers),
    },
  };

  const editor = {
    getModel: () => model,
    onDidChangeModel: (_listener: (event: { newModelUrl: null }) => void) => disposable(),
  };

  return {
    runtime,
    editor,
    tokenProviders,
    completionProviders,
    hoverProviders,
    markers,
    get registrationsDisposed() {
      return registrationsDisposed;
    },
  };
}

describe('Forge Web Script Monaco adapter', () => {
  it('registers lexical tokens with standard Monaco scopes that built-in themes color', async () => {
    const source = [
      '/**',
      ' * Adds one to a value.',
      ' * @param value Input value.',
      ' * @return Incremented value.',
      ' */',
      'export fn add(value: i32) -> i32 {',
      '  return value + 1;',
      '}',
      'export fn caller() -> i32 { return add(1); }',
    ].join('\n');
    const model = new FakeModel(source);
    const fake = createFakeMonaco(model);
    const service = createForgeWebScriptLanguageService();
    const handle = attachForgeWebScriptMonaco(fake.editor as never, fake.runtime as never, {
      languageService: service,
    });

    await handle.refresh();
    const tokenResult = fake.tokenProviders[0]?.provider.tokenize('export fn add(value: i32) {}', {});
    expect(tokenResult).toMatchObject({
      tokens: expect.arrayContaining([
        // 'export' and 'fn' are keywords → should emit 'keyword' (not 'fws.keyword')
        expect.objectContaining({ scopes: 'keyword' }),
        // 'i32' is a primitive type → should emit 'type' (not 'fws.type')
        expect.objectContaining({ scopes: 'type' }),
      ]),
    });
    expect((tokenResult as { tokens: Array<{ startIndex: number; scopes: string }> }).tokens).toEqual(
      expect.arrayContaining([
        { startIndex: 0, scopes: 'keyword' },
        { startIndex: 7, scopes: 'keyword' },
        { startIndex: 10, scopes: 'type' },
        { startIndex: 21, scopes: 'type' },
      ]),
    );
    // Verify no custom 'fws.*' scopes are emitted (they won't be colored by built-in themes)
    const allScopes = (tokenResult as { tokens: Array<{ scopes: string }> }).tokens.map((t) => t.scopes);
    expect(allScopes).not.toContain(expect.stringContaining('fws.'));
    // Verify all scopes are standard Monaco token names
    const standardScopes = new Set([
      'keyword',
      'type',
      'string',
      'number',
      'comment',
      'invalid',
      'operator',
      'delimiter',
      'identifier',
    ]);
    for (const scope of allScopes) {
      expect(standardScopes).toContain(scope);
    }

    const completions = (await fake.completionProviders[0]?.provideCompletionItems(model, {
      lineNumber: 1,
      column: 1,
    })) as {
      suggestions: Array<{ label: string }>;
    };
    expect(completions.suggestions.map(({ label }) => label)).toContain('add');

    const hover = (await fake.hoverProviders[0]?.provideHover(model, { lineNumber: 6, column: 13 })) as {
      contents: Array<{ value: string }>;
    };
    expect(hover.contents[0]?.value).toContain('add');
    expect(hover.contents.map(({ value }) => value)).toContain(
      'Adds one to a value.\n\n@param value Input value.\n\n@return Incremented value.',
    );
    const completion = (await fake.completionProviders[0]?.provideCompletionItems(model, {
      lineNumber: 9,
      column: 39,
    })) as {
      suggestions: Array<{ label: string; documentation?: string }>;
    };
    expect(completion.suggestions.find(({ label }) => label === 'add')?.documentation).toBe(
      'Adds one to a value.\n\n@param value Input value.\n\n@return Incremented value.',
    );
    expect(fake.markers.at(-1)).toEqual([]);

    handle.dispose();
    expect(fake.registrationsDisposed).toBe(4);
  });

  it('reports unrelated errors while accepting private helpers by default', async () => {
    const model = new FakeModel('export fn hidden() -> i32 { return "wrong"; }');
    const fake = createFakeMonaco(model);
    const handle = attachForgeWebScriptMonaco(fake.editor as never, fake.runtime as never);

    await handle.refresh();
    const invalidMarkers = fake.markers.at(-1) as Array<{ code: string; source: string; message: string }>;
    expect(invalidMarkers.length).toBeGreaterThan(0);
    expect(invalidMarkers[0]?.code).toMatch(/^FWS-/);
    expect(invalidMarkers[0]?.source).toContain('forge-web-script/');

    model.setValue(`fn hidden() -> i32 { return 1; }
export fn entry() -> i32 { return hidden(); }`);
    await handle.refresh();
    expect(fake.markers.at(-1)).toEqual([]);
    handle.dispose();
  });
});
