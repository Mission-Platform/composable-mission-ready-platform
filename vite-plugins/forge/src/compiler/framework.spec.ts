import { describe, expect, it } from 'vitest';

import { compileModule } from './compile.js';
import { createCompilerPipeline } from './pipeline.js';

import type { FrameworkOutputPlugin } from '@mission-platform/forge-plugin-api';

function fixtureFramework(id: string): FrameworkOutputPlugin {
  return {
    id,
    outputLanguage: 'ts',
    source: {
      componentExtension: '.ts',
      componentImportExtension: '',
      composableExtension: '.ts',
      entryExtension: '.ts',
      componentExport: 'named',
    },
    lower(ir, context) {
      return { framework: context.framework, module: ir, context };
    },
    optimize(intentions) {
      return intentions;
    },
    generate() {
      return { code: 'export const fixture = true;', lang: 'ts' };
    },
    build: {
      vite: () => [],
      tsdown: () => [],
    },
  };
}

describe('framework output plugin contracts', () => {
  it('runs lower, optimize, and generate as explicit phases', () => {
    const phases: string[] = [];
    const plugin: FrameworkOutputPlugin = {
      id: 'fixture',
      outputLanguage: 'ts',
      source: {
        componentExtension: '.ts',
        componentImportExtension: '',
        composableExtension: '.ts',
        entryExtension: '.ts',
        componentExport: 'named',
      },
      lower(ir, context) {
        phases.push(`lower:${ir.moduleKind}:${context.framework}`);
        return { framework: context.framework, module: ir, context };
      },
      optimize(intentions) {
        phases.push('optimize');
        return intentions;
      },
      generate(intentions) {
        phases.push(`generate:${intentions.module.fileName}`);
        return { code: 'export const fixture = true;', lang: 'ts' };
      },
      build: {
        vite: () => [],
        tsdown: () => [],
      },
    };

    const result = createCompilerPipeline().compile(
      {
        source: 'export const fixture = true;',
        fileName: 'fixture.tsx',
        moduleKind: 'composable',
      },
      plugin,
    );

    expect(result).toEqual({ code: 'export const fixture = true;', lang: 'ts' });
    expect(phases).toEqual(['lower:composable:fixture', 'optimize', 'generate:fixture.tsx']);
  });

  it('reuses the cached semantic module across target compilations', () => {
    const modules: object[] = [];
    const base = fixtureFramework('cache-fixture');
    const plugin: FrameworkOutputPlugin = {
      ...base,
      lower(ir, context) {
        modules.push(ir);
        return base.lower(ir, context);
      },
    };
    const pipeline = createCompilerPipeline();
    const input = {
      source: 'export const fixture = true;',
      fileName: 'cache-fixture.tsx',
      moduleKind: 'composable' as const,
    };

    pipeline.compile(input, plugin);
    pipeline.compile(input, plugin);

    expect(modules).toHaveLength(2);
    expect(modules[0]).toBe(modules[1]);
  });

  it('rejects a missing named component before target lowering', () => {
    const phases: string[] = [];
    const plugin: FrameworkOutputPlugin = {
      ...fixtureFramework('missing-component-fixture'),
      lower(ir, context) {
        phases.push('lower');
        return { framework: context.framework, module: ir, context };
      },
    };

    expect(() =>
      createCompilerPipeline().compile(
        {
          source: 'export function Available() { return <div />; }',
          fileName: 'missing-component.tsx',
          moduleKind: 'component',
          componentName: 'Requested',
        },
        plugin,
      ),
    ).toThrow(/FORGE_COMPONENT_NOT_FOUND/);
    expect(phases).toEqual([]);
  });

  it('stops after a lowering error without optimizing or generating output', () => {
    const phases: string[] = [];
    const plugin: FrameworkOutputPlugin = {
      ...fixtureFramework('lowering-error-fixture'),
      lower(ir, context) {
        phases.push('lower');
        return {
          framework: context.framework,
          module: ir,
          context,
          diagnostics: [
            {
              phase: 'generation',
              severity: 'error',
              code: 'FORGE_FIXTURE_LOWERING_ERROR',
              message: 'The fixture cannot lower this module.',
              fileName: ir.fileName,
            },
          ],
        };
      },
      optimize(intentions) {
        phases.push('optimize');
        return intentions;
      },
      generate() {
        phases.push('generate');
        return { code: 'should not be emitted', lang: 'ts' };
      },
    };

    expect(() =>
      createCompilerPipeline().compile(
        {
          source: 'export const fixture = true;',
          fileName: 'lowering-error.tsx',
          moduleKind: 'composable',
        },
        plugin,
      ),
    ).toThrow(/FORGE_FIXTURE_LOWERING_ERROR/);
    expect(phases).toEqual(['lower']);
  });

  it('preserves successful phase diagnostics without duplicating forwarded records', () => {
    const warning = {
      phase: 'optimization' as const,
      severity: 'warning' as const,
      code: 'FORGE_FIXTURE_WARNING',
      message: 'The fixture used a conservative optimization.',
      fileName: 'diagnostics.tsx',
    };
    const plugin: FrameworkOutputPlugin = {
      ...fixtureFramework('diagnostic-fixture'),
      lower(ir, context) {
        return { framework: context.framework, module: ir, context, diagnostics: [warning] };
      },
      optimize(intentions) {
        return intentions;
      },
      generate() {
        return { code: 'export const fixture = true;', lang: 'ts', diagnostics: [warning] };
      },
    };

    const result = createCompilerPipeline().compile(
      {
        source: 'export const fixture = true;',
        fileName: 'diagnostics.tsx',
        moduleKind: 'composable',
      },
      plugin,
    );

    expect(result.diagnostics).toEqual([warning]);
  });

  it('compiles through an external plugin and preserves open output languages', () => {
    const plugin: FrameworkOutputPlugin = {
      id: 'external-fixture',
      outputLanguage: 'astro',
      source: {
        componentExtension: '.astro',
        componentImportExtension: '.astro',
        composableExtension: '.ts',
        entryExtension: '.ts',
        componentExport: 'default',
      },
      lower(ir, context) {
        return { framework: context.framework, module: ir, context };
      },
      optimize(intentions) {
        return intentions;
      },
      generate() {
        return {
          code: '---\n---\n<div data-fixture />',
          lang: 'astro',
          extraModules: [{ name: 'fixture-island', code: 'export const island = true;', lang: 'browser-ts' }],
        };
      },
      build: {
        vite: () => [],
        tsdown: () => [],
      },
    };

    const result = compileModule('export const fixture = true;', {
      framework: plugin,
      moduleKind: 'composable',
      fileName: 'fixture.ts',
    });

    expect(result.lang).toBe('astro');
    expect(result.code).toContain('data-fixture');
    expect(result.extraModules).toEqual([
      { name: 'fixture-island', code: 'export const island = true;', lang: 'browser-ts' },
    ]);
  });

  it('accepts independently supplied targets with separate build bundles', () => {
    const frameworks = ['react', 'astro', 'vue', 'solid', 'svelte', 'web-components'].map((id) => fixtureFramework(id));

    expect(frameworks.map((framework) => framework.id)).toEqual([
      'react',
      'astro',
      'vue',
      'solid',
      'svelte',
      'web-components',
    ]);
    expect(frameworks.map((framework) => framework.build.vite?.({}))).toHaveLength(6);
    expect(frameworks.map((framework) => framework.build.tsdown?.({}))).toHaveLength(6);
  });
});
