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
