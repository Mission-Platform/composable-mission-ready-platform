import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { flattenTokens, isAlias, type DtcgGroup } from './dtcg.js';

interface ComponentSourceManifest {
  inventory: {
    componentTsxSources: number;
    colocatedStories: number;
    cssModules: number;
    packages: number;
    sourceOfTruth: string;
    classifications: Record<string, string>;
  };
  sources: Array<{
    sourceId: string;
    file: string;
    level: string;
    namespace: string;
    contractPath: string;
  }>;
}

interface CollisionFixture {
  sources: Array<{ sourceId: string; document: DtcgGroup }>;
}

const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
const componentDirectory = path.join(repositoryRoot, 'packages/tokens/tokens/component');
const monolithPath = path.join(repositoryRoot, 'packages/tokens/tokens/component.tokens.json');
const referencePath = path.join(repositoryRoot, 'docs/component-token-reference.md');
const manifestPath = path.join(componentDirectory, 'component-sources.manifest.json');
const collisionFixturePath = path.join(import.meta.dirname, 'fixtures/component-source-collision.fixture.json');

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(entryPath) : entry.name.endsWith('.tokens.json') ? [entryPath] : [];
    })
    .toSorted();
}

function sourceNamespaces(document: DtcgGroup): string[] {
  const component = document.component;
  if (typeof component !== 'object' || component === null || Array.isArray(component)) return [];
  return Object.keys(component as DtcgGroup).filter((key) => !key.startsWith('$'));
}

function leafValues(document: DtcgGroup): Map<string, unknown> {
  return new Map(flattenTokens(document).map((record) => [record.path.join('.'), record.value]));
}

function layerCollisions(sources: Array<{ sourceId: string; document: DtcgGroup }>): string[] {
  const owners = new Map<string, string>();
  const collisions: string[] = [];
  for (const source of sources) {
    for (const namespace of sourceNamespaces(source.document)) {
      const previousOwner = owners.get(namespace);
      if (previousOwner) collisions.push(`${namespace}: ${previousOwner}, ${source.sourceId}`);
      else owners.set(namespace, source.sourceId);
    }
  }
  return collisions;
}

describe('split component token sources', () => {
  it('preserves every monolith path, value, and alias', () => {
    const monolith = readJson<DtcgGroup>(monolithPath);
    const split = sourceFiles(componentDirectory).map((filePath) => readJson<DtcgGroup>(filePath));
    const merged: DtcgGroup = {};
    for (const document of split) {
      const component = document.component;
      if (typeof component !== 'object' || component === null || Array.isArray(component)) continue;
      const existing = (merged.component ?? {}) as DtcgGroup;
      merged.component = { ...existing, ...(component as DtcgGroup) };
    }

    const expectedLeaves = leafValues(monolith);
    const actualLeaves = leafValues(merged);
    expect(actualLeaves).toEqual(expectedLeaves);
    const expectedAliases = [...expectedLeaves.values()].filter(isAlias).toSorted();
    const actualAliases = [...actualLeaves.values()].filter(isAlias).toSorted();
    expect(actualAliases).toEqual(expectedAliases);
  });

  it('has one source owner for every namespace and covers documented contracts', () => {
    const manifest = readJson<ComponentSourceManifest>(manifestPath);
    const files = sourceFiles(componentDirectory);
    const sourceDocuments = files.map((filePath) => ({
      sourceId: path.relative(componentDirectory, filePath).replaceAll(path.sep, '/').replace(/\.tokens\.json$/, ''),
      document: readJson<DtcgGroup>(filePath),
    }));
    const namespaces = sourceDocuments.flatMap(({ document }) => sourceNamespaces(document));
    const manifestNamespaces = manifest.sources.map((source) => source.namespace);
    const manifestFiles = manifest.sources.map((source) => source.file.replace(/^component\//, ''));
    const discoveredFiles = files.map((filePath) =>
      path.relative(componentDirectory, filePath).replaceAll(path.sep, '/'),
    );

    expect(manifest.inventory).toEqual(expect.objectContaining({
      componentTsxSources: 249,
      colocatedStories: 246,
      cssModules: 219,
      packages: 20,
    }));
    expect(files).toHaveLength(manifest.sources.length);
    expect(sourceDocuments.every(({ document }) => sourceNamespaces(document).length === 1)).toBe(true);
    expect([...discoveredFiles].toSorted()).toEqual([...manifestFiles].toSorted());
    expect(manifest.sources.map((source) => source.sourceId.replace(/^component\//, '')).toSorted()).toEqual(
      sourceDocuments.map((source) => source.sourceId).toSorted(),
    );
    expect(new Set(namespaces).size).toBe(namespaces.length);
    expect(new Set(manifestNamespaces).size).toBe(manifestNamespaces.length);
    expect([...namespaces].toSorted()).toEqual([...manifestNamespaces].toSorted());
    expect(layerCollisions(sourceDocuments)).toEqual([]);
    expect(discoveredFiles).not.toContain('templates/inherited.tokens.json');
    expect(manifestNamespaces).not.toContain('inherited');

    const documentedNamespaces = new Set(
      [...readFileSync(referencePath, 'utf8').matchAll(/component\.([a-z0-9-]+)/g)]
        .map((match) => match[1])
        .filter((namespace) => namespace !== 'tokens'),
    );
    for (const namespace of documentedNamespaces) expect(manifestNamespaces).toContain(namespace);
  });

  it('detects a split source claiming an existing component layer', () => {
    const fixture = readJson<CollisionFixture>(collisionFixturePath);
    expect(layerCollisions(fixture.sources)).toEqual(['button: component/atoms/button, component/molecules/button']);
  });
});