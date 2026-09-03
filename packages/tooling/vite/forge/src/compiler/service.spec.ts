import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createForgeArtifactManifest } from './artifact-manifest.js';
import { createForgeCompilerService } from './service.js';

import type { FrameworkOutputPlugin } from '@mission-platform/forge-plugin-api';

function fixtureFramework(phases: string[], warning = false): FrameworkOutputPlugin {
  return {
    id: 'service-fixture',
    outputLanguage: 'ts',
    source: {
      componentExtension: '.ts',
      componentImportExtension: '',
      composableExtension: '.ts',
      entryExtension: '.ts',
      componentExport: 'named',
    },
    lower(ir, context) {
      phases.push('lower');
      return {
        framework: context.framework,
        module: ir,
        context,
        ...(warning
          ? {
              diagnostics: [
                {
                  phase: 'inference' as const,
                  severity: 'warning' as const,
                  code: 'FORGE_TEST_WARNING',
                  message: 'Target warning.',
                  fileName: ir.fileName,
                },
              ],
            }
          : {}),
      };
    },
    optimize(intentions) {
      phases.push('optimize');
      return intentions;
    },
    generate() {
      phases.push('generate');
      return { code: 'export const fixture = true;', lang: 'ts' };
    },
    // Neutral generation and CMS island targets do not need native adapters.
    build: {},
  };
}

function input(source = 'export const fixture = true;') {
  return {
    source,
    fileName: 'Fixture.tsx',
    moduleKind: 'composable' as const,
  };
}

describe('ForgeCompilerService', () => {
  it('runs target phases in order and reuses neutral analysis', () => {
    const phases: string[] = [];
    const service = createForgeCompilerService();
    const framework = fixtureFramework(phases);

    service.compile({ input: input(), framework });
    service.compile({ input: input(), framework });

    expect(phases).toEqual(['lower', 'optimize', 'generate', 'lower', 'optimize', 'generate']);
    expect(service.report().cache).toMatchObject({ semanticHits: 1, semanticMisses: 1 });
    expect(service.report().phaseTimings.map(({ phase }) => phase)).toEqual([
      'frontend',
      'frontend',
      'optimization',
      'inference',
      'target-lowering',
      'optimization',
      'generation',
      'frontend',
      'target-lowering',
      'optimization',
      'generation',
    ]);
    expect(service.report().phaseTimings.every(({ durationMs }) => durationMs >= 0)).toBe(true);
    expect(service.report().artifacts).toHaveLength(1);
    expect(service.report().artifacts[0]?.artifacts).toHaveLength(1);
    expect(service.report().emittedArtifactCount).toBe(1);
  });

  it('reports target artifact counts for auxiliary output', () => {
    const service = createForgeCompilerService();
    const framework: FrameworkOutputPlugin = {
      ...fixtureFramework([]),
      generate: () => ({
        code: 'export const fixture = true;',
        lang: 'ts',
        extraModules: [{ name: 'helper.ts', code: 'export const helper = true;', lang: 'ts' }],
        declarations: [{ name: 'Fixture.d.ts', code: 'export declare const fixture: boolean;' }],
        map: '{}',
      }),
    };

    service.compile({ input: input(), framework });

    expect(service.report().emittedArtifactCount).toBe(4);
    expect(service.report().artifacts[0]?.artifacts).toHaveLength(4);
  });

  it('invalidates only entries for changed files and enforces cache limits', () => {
    const service = createForgeCompilerService({ semanticModules: 1 });
    service.analyze(input('export const one = true;'));
    service.analyze({ ...input('export const two = true;'), fileName: 'Other.tsx' });

    expect(service.report().cache.semanticEvictions).toBe(1);
    expect(service.invalidate(['Other.tsx'])).toMatchObject({
      changedFiles: ['Other.tsx'],
      invalidatedFiles: ['Other.tsx'],
      invalidatedEntries: 1,
    });
    expect(service.report().cache.invalidatedEntries).toBe(1);
  });

  it('bounds derived caches and invalidates their indexed entries', () => {
    const service = createForgeCompilerService({ frontendModules: 2, optimizedModules: 2 });
    service.analyze(input('export const one = true;'));
    service.analyze({ ...input('export const two = true;'), fileName: 'Other.tsx' });

    const phaseCount = service.report().phaseTimings.length;
    expect(service.invalidate(['Other.tsx'])).toMatchObject({
      invalidatedFiles: ['Other.tsx'],
      invalidatedEntries: 1,
    });
    service.analyze({ ...input('export const two = true;'), fileName: 'Other.tsx' });
    expect(
      service
        .report()
        .phaseTimings.slice(phaseCount)
        .map(({ phase }) => phase),
    ).toEqual(['frontend', 'optimization', 'inference']);

    service.analyze({ ...input('export const three = true;'), fileName: 'Third.tsx' });
    expect(service.report().cache).toMatchObject({ frontendEvictions: 1, optimizedEvictions: 1 });
  });

  it('aggregates target warnings and rejects use after disposal', () => {
    const service = createForgeCompilerService();
    service.compile({ input: input(), framework: fixtureFramework([], true) });

    expect(service.report().warnings).toHaveLength(1);
    expect(service.report().errors).toHaveLength(0);
    service.dispose();
    expect(() => service.analyze(input())).toThrow('disposed');
  });

  it('caches Oxc parser diagnostics with the semantic result', () => {
    const service = createForgeCompilerService();
    const malformed = input('export const fixture = <div;');

    const first = service.analyze(malformed);
    const second = service.analyze(malformed);

    expect(second).toBe(first);
    expect(first.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FORGE_FRONTEND_PARSE_ERROR',
          fileName: 'Fixture.tsx',
          message: expect.stringContaining('[OXC]'),
        }),
      ]),
    );
    expect(service.report().cache).toMatchObject({ semanticHits: 1, semanticMisses: 1 });
  });

  it('separates prepared project configuration fingerprints', () => {
    const phases: string[] = [];
    const service = createForgeCompilerService();
    const framework = fixtureFramework(phases);

    service.compile({ input: input(), framework, project: service.prepare({ configFingerprint: 'one' }) });
    service.compile({ input: input(), framework, project: service.prepare({ configFingerprint: 'two' }) });

    expect(service.report().cache).toMatchObject({ semanticHits: 0, semanticMisses: 2 });
  });

  it('creates target-scoped deterministic artifact manifests', () => {
    expect(
      createForgeArtifactManifest('vue', [
        { fileName: 'z.ts', kind: 'module', hash: 'z' },
        { fileName: 'index.ts', kind: 'entry', hash: 'i' },
      ]),
    ).toEqual({
      version: 1,
      targetId: 'vue',
      complete: true,
      entries: ['index.ts'],
      artifacts: [
        { fileName: 'index.ts', kind: 'entry', hash: 'i' },
        { fileName: 'z.ts', kind: 'module', hash: 'z' },
      ],
    });
  });

  it('invalidates graph dependents while retaining unrelated semantic entries', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forge-service-'));
    try {
      const entry = path.join(root, 'index.ts');
      const dependent = path.join(root, 'dependent.ts');
      const changed = path.join(root, 'changed.ts');
      const unrelated = path.join(root, 'unrelated.ts');
      writeFileSync(entry, `export * from './dependent';`);
      writeFileSync(dependent, `export * from './changed';`);
      writeFileSync(changed, `export const changed = true;`);
      writeFileSync(unrelated, `export const unrelated = true;`);

      const service = createForgeCompilerService();
      const firstProject = service.prepare({ entry, sourceRoot: root });
      expect(service.prepare({ entry, sourceRoot: root }).graph).toBe(firstProject.graph);
      service.analyze({ ...input('export const changed = true;'), fileName: changed });
      service.analyze({ ...input('export const unrelated = true;'), fileName: unrelated });
      service.analyze({ ...input('export const dependent = true;'), fileName: dependent });

      expect(service.invalidate([changed])).toMatchObject({
        invalidatedFiles: [changed, dependent, entry].sort(),
        invalidatedEntries: 2,
      });
      expect(service.prepare({ entry, sourceRoot: root }).graph).not.toBe(firstProject.graph);
      expect(service.analyze({ ...input('export const unrelated = true;'), fileName: unrelated })).toBeDefined();
      expect(service.report().cache.semanticHits).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('bounds prepared project graph retention', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forge-graph-cache-'));
    try {
      const entry = path.join(root, 'index.ts');
      writeFileSync(entry, 'export const fixture = true;');
      const service = createForgeCompilerService({ projectGraphs: 1 });

      service.prepare({ entry, sourceRoot: root, configFingerprint: 'one' });
      service.prepare({ entry, sourceRoot: root, configFingerprint: 'two' });

      expect(service.report().cache.projectGraphEvictions).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
