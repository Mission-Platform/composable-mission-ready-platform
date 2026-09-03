import { defineForgeRouterPlugin, type RouterOutputPlugin } from '@mission-platform/forge-router-plugin-api';
import { describe, expect, it } from 'vitest';

import { analyzeRouterCapabilities, compileRouterModule } from './router.js';

const SOURCE = [
  "import { MpLink as Link, useMpRoute, MpRouterView } from '@mission-platform/router';",
  'export function Shared() {',
  '  const route = useMpRoute();',
  '  return <><Link to={{ path: "/settings", query: { tab: "profile" } }}>Settings</Link><MpRouterView /></>;',
  '}',
].join('\n');

const fixtureRouter: RouterOutputPlugin = defineForgeRouterPlugin({
  id: 'fixture-router',
  routerPackage: 'fixture-native-router',
  capabilities: ['link', 'route', 'view'],
  lower: (module, context) => ({ routerTarget: context.routerTarget, module }),
  optimize: (plan, _options) => plan,
  generate: (plan) => ({
    code: plan.module.source.replace("from '@mission-platform/router'", "from 'fixture-native-router'"),
    lang: 'tsx',
    map: { version: 3, sources: [plan.module.fileName] },
    declarations: [{ name: 'Shared.d.ts', code: 'export declare function Shared(): unknown;' }],
  }),
  build: {},
});

describe('Forge router compiler pass', () => {
  it('builds neutral IR from named imports and JSX/call uses', () => {
    const ir = analyzeRouterCapabilities({ source: SOURCE, fileName: 'shared.tsx', moduleKind: 'component' });

    expect(ir.kind).toBe('router-capability-module');
    expect(ir.imports.map((entry) => [entry.importedName, entry.localName])).toEqual([
      ['MpLink', 'Link'],
      ['useMpRoute', 'useMpRoute'],
      ['MpRouterView', 'MpRouterView'],
    ]);
    expect(ir.uses.map((use) => [use.capability, use.kind])).toEqual([
      ['route', 'call'],
      ['link', 'jsx'],
      ['view', 'jsx'],
    ]);
  });

  it('uses a router target independently of the selected UI framework and preserves generated artifacts', () => {
    const result = compileRouterModule({
      source: SOURCE,
      fileName: 'shared.tsx',
      moduleKind: 'component',
      uiFramework: 'vue',
      router: 'fixture-router',
      routerPlugins: [fixtureRouter],
    });

    expect(result.routerTarget).toBe('fixture-router');
    expect(result.code).not.toContain("from '@mission-platform/router'");
    expect(result.code).toContain("from 'fixture-native-router'");
    expect(result.map).toEqual({ version: 3, sources: ['shared.tsx'] });
    expect(result.declarations?.[0]?.name).toBe('Shared.d.ts');
  });

  it('reports an unselected or incomplete target instead of silently retaining neutral execution', () => {
    const missingTarget = compileRouterModule({
      source: SOURCE,
      fileName: 'shared.tsx',
      moduleKind: 'component',
      uiFramework: 'react',
    });
    expect(missingTarget.diagnostics?.map((diagnostic) => diagnostic.code)).toEqual([
      'MP_ROUTER_TARGET_REQUIRED',
      'MP_ROUTER_TARGET_REQUIRED',
      'MP_ROUTER_TARGET_REQUIRED',
    ]);

    const phases: string[] = [];
    expect(() =>
      compileRouterModule({
        source: SOURCE,
        fileName: 'shared.tsx',
        moduleKind: 'component',
        uiFramework: 'react',
        router: {
          ...fixtureRouter,
          capabilities: ['link'],
          lower: (...args) => {
            phases.push('lower');
            return fixtureRouter.lower(...args);
          },
          optimize: (...args) => {
            phases.push('optimize');
            return fixtureRouter.optimize(...args);
          },
          generate: (...args) => {
            phases.push('generate');
            return fixtureRouter.generate(...args);
          },
        },
      }),
    ).toThrow(/MP_ROUTER_CAPABILITY_UNSUPPORTED/);
    expect(phases).toEqual([]);
  });

  it('stops router execution after a target lowering error', () => {
    const phases: string[] = [];
    const failingRouter = {
      ...fixtureRouter,
      lower(module: Parameters<typeof fixtureRouter.lower>[0], context: Parameters<typeof fixtureRouter.lower>[1]) {
        phases.push('lower');
        return {
          ...fixtureRouter.lower(module, context),
          diagnostics: [
            {
              phase: 'generation' as const,
              severity: 'error' as const,
              code: 'FORGE_ROUTER_FIXTURE_LOWERING_ERROR',
              message: 'The router fixture cannot lower this module.',
              fileName: module.fileName,
            },
          ],
        };
      },
      optimize(
        plan: Parameters<typeof fixtureRouter.optimize>[0],
        options: Parameters<typeof fixtureRouter.optimize>[1],
      ) {
        phases.push('optimize');
        return fixtureRouter.optimize(plan, options);
      },
      generate(plan: Parameters<typeof fixtureRouter.generate>[0]) {
        phases.push('generate');
        return fixtureRouter.generate(plan);
      },
    };

    expect(() =>
      compileRouterModule({
        source: SOURCE,
        fileName: 'router-lowering-error.tsx',
        moduleKind: 'component',
        uiFramework: 'react',
        router: failingRouter,
      }),
    ).toThrow(/FORGE_ROUTER_FIXTURE_LOWERING_ERROR/);
    expect(phases).toEqual(['lower']);
  });
});
