import { describe, expect, it } from 'vitest';

import {
  createForgeWebScriptLanguageService,
  createForgeWebScriptLsif,
  serializeForgeWebScriptLsif,
  type ForgeWebScriptDocument,
} from '.';

function makeWorkspace(): {
  readonly documents: readonly ForgeWebScriptDocument[];
  readonly service: ReturnType<typeof createForgeWebScriptLanguageService>;
} {
  const documents: readonly ForgeWebScriptDocument[] = [
    {
      uri: 'file:///workspace/main.fws',
      fileName: 'main.fws',
      version: 1,
      text: `import "./helper.fws" as helper;
/** Calls the helper. */
export fn entry(value: i32) -> i32 { return helper.run(value); }`,
    },
    {
      uri: 'file:///workspace/helper.fws',
      fileName: 'helper.fws',
      version: 1,
      text: `/** Adds one to a value. */
export fn run(value: i32) -> i32 { return value + 1; }`,
    },
    {
      uri: 'file:///workspace/broken.fws',
      fileName: 'broken.fws',
      version: 1,
      text: 'export fn broken(value: i32) -> i32 { return value.',
    },
  ];
  const service = createForgeWebScriptLanguageService({
    readFile: async (uri) => documents.find((document) => document.uri === uri)?.text,
    listFiles: async () => documents.map(({ uri }) => uri),
    getOptions: async () => ({}),
  });
  for (const document of documents) service.openDocument(document);
  return { documents, service };
}

describe('Forge Web Script LSIF export', () => {
  it('emits a structurally connected graph for workspace semantic facts', async () => {
    const { documents, service } = makeWorkspace();
    await service.refreshWorkspace();

    const graph = createForgeWebScriptLsif({ service, documents, projectRoot: 'file:///workspace/../workspace' });
    const vertices = new Map(graph.vertices.map((vertex) => [vertex.id, vertex]));
    const labels = new Set(graph.vertices.map((vertex) => vertex.label));
    for (const label of [
      'metaData',
      'project',
      'document',
      'range',
      'resultSet',
      'definitionResult',
      'declarationResult',
      'implementationResult',
      'referenceResult',
      'documentSymbolResult',
      'hoverResult',
      'moniker',
      'diagnosticResult',
    ]) {
      expect(labels.has(label)).toBe(true);
    }
    expect(
      graph.vertices.find((vertex) => vertex.label === 'document' && vertex.uri === 'file:///workspace/main.fws'),
    ).toMatchObject({
      languageId: 'forge-web-script',
      moduleId: 'main',
    });
    expect(graph.vertices.find((vertex) => vertex.label === 'metaData')).toMatchObject({
      version: '0.6.0',
      projectRoot: 'file:///workspace',
    });

    for (const edge of graph.edges) {
      expect(vertices.has(edge.outV), `missing out vertex for ${edge.id}`).toBe(true);
      expect(vertices.has(edge.inV), `missing in vertex for ${edge.id}`).toBe(true);
    }
    const rangeIds = new Set(graph.vertices.filter((vertex) => vertex.label === 'range').map((vertex) => vertex.id));
    const containedRanges = new Set(
      graph.edges.filter((edge) => edge.label === 'contains' && rangeIds.has(edge.inV)).map((edge) => edge.inV),
    );
    expect(containedRanges).toEqual(rangeIds);
    expect(graph.edges.some((edge) => edge.label === 'textDocument/definition')).toBe(true);
    expect(graph.edges.some((edge) => edge.label === 'textDocument/references')).toBe(true);
    expect(graph.edges.some((edge) => edge.label === 'textDocument/hover')).toBe(true);
    expect(graph.edges.some((edge) => edge.label === 'textDocument/documentSymbol')).toBe(true);
    expect(graph.edges.some((edge) => edge.label === 'moniker')).toBe(true);
    expect(graph.edges.some((edge) => edge.label === 'diagnostic')).toBe(true);
    expect(
      graph.vertices
        .filter((vertex) => vertex.label === 'hoverResult')
        .some((vertex) => vertex.contents?.includes('Adds one to a value.')),
    ).toBe(true);
    service.dispose();
  });

  it('is byte-for-byte deterministic independent of input document order', async () => {
    const first = makeWorkspace();
    const second = makeWorkspace();
    await Promise.all([first.service.refreshWorkspace(), second.service.refreshWorkspace()]);

    const firstGraph = createForgeWebScriptLsif({ service: first.service, documents: first.documents });
    const secondGraph = createForgeWebScriptLsif({
      service: second.service,
      documents: [...second.documents].toReversed(),
    });
    expect(serializeForgeWebScriptLsif(firstGraph)).toBe(serializeForgeWebScriptLsif(secondGraph));
    expect(JSON.parse(`[${serializeForgeWebScriptLsif(firstGraph).replaceAll('\n', ',')}]`)).toHaveLength(
      firstGraph.vertices.length + firstGraph.edges.length,
    );
    first.service.dispose();
    second.service.dispose();
  });
});
