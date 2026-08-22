import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { collectTokenReachability, writeTokenReachabilityReport } from './reachability.js';

const temporaryDirectories: string[] = [];

function temporaryRepository(): { root: string; tokens: string } {
  const root = mkdtempSync(path.join(tmpdir(), 'mp-token-reachability-'));
  temporaryDirectories.push(root);
  const tokens = path.join(root, 'packages/tokens/tokens');
  mkdirSync(tokens, { recursive: true });
  return { root, tokens };
}

function writeSource(tokensDir: string, sourceId: string, document: Record<string, unknown>): void {
  const filePath = path.join(tokensDir, `${sourceId}.tokens.json`);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(document));
}

function writeConsumer(root: string, relativePath: string, content: string): void {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

function token(report: ReturnType<typeof collectTokenReachability>, path_: string, sourceId?: string) {
  return report.tokens.find((entry) => entry.path === path_ && (sourceId === undefined || entry.sourceId === sourceId));
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true });
});

describe('collectTokenReachability', () => {
  it('collects static CSS, SCSS, and TypeScript roots with generated names', () => {
    const { root, tokens } = temporaryRepository();
    writeSource(tokens, 'palette', {
      color: {
        used: { $value: '#123456' },
        unused: { $value: '#654321' },
      },
    });
    writeSource(tokens, 'spacing', {
      spacing: {
        used: { $value: '1rem' },
        unused: { $value: '2rem' },
      },
    });
    writeSource(tokens, 'size', {
      size: {
        font: {
          md: { $value: '1rem' },
          lg: { $value: '2rem' },
        },
      },
    });
    writeConsumer(root, 'packages/components/src/button.module.scss', '.button { color: var(--mp-color-used); padding: $spacing-used; }');
    writeConsumer(
      root,
      'packages/components/src/use.ts',
      "import { size } from '@mission-platform/tokens';\nconst value = size.font.md;\nconst unrelated = values[index];",
    );

    const report = collectTokenReachability({ repositoryRoot: root, tokensDir: tokens });
    expect(token(report, 'color.used')).toMatchObject({
      status: 'active',
      evidence: ['css'],
      generatedNames: ['--mp-color-used', '$color-used'],
    });
    expect(token(report, 'spacing.used')).toMatchObject({ status: 'active', evidence: ['scss'] });
    expect(token(report, 'size.font.md')).toMatchObject({ status: 'active', evidence: ['typescript'] });
    expect(token(report, 'color.unused')?.status).toBe('candidate');
    expect(token(report, 'spacing.unused')?.status).toBe('candidate');
    expect(token(report, 'size.font.lg')?.status).toBe('candidate');
  });

  it('indexes nested composite aliases and activates transitive dependencies', () => {
    const { root, tokens } = temporaryRepository();
    writeSource(tokens, 'palette', {
      color: {
        used: { $value: '#123456' },
        nested: { $value: '#654321' },
      },
    });
    writeSource(tokens, 'component/atoms/button', {
      component: {
        button: {
          primary: {
            background: {
              default: {
                $value: {
                  color: '{color.used}',
                  fallback: ['solid', '{color.nested}'],
                },
              },
            },
          },
        },
      },
    });
    writeConsumer(root, 'packages/components/src/button.css', '.button { color: var(--mp-button-primary-background-default); }');

    const report = collectTokenReachability({ repositoryRoot: root, tokensDir: tokens });
    expect(report.aliases).toEqual([
      { sourceId: 'component/atoms/button', from: 'component.button.primary.background.default', to: 'color.nested', resolved: true },
      { sourceId: 'component/atoms/button', from: 'component.button.primary.background.default', to: 'color.used', resolved: true },
    ]);
    expect(token(report, 'component.button.primary.background.default')).toMatchObject({
      status: 'active',
      evidence: ['css'],
    });
    expect(token(report, 'color.used')?.status).toBe('active');
    expect(token(report, 'color.nested')?.status).toBe('active');
  });

  it('keeps theme-dark light-dark() twins reachable with their theme-light pair', () => {
    const { root, tokens } = temporaryRepository();
    writeSource(tokens, 'palette', {
      color: {
        lightUsed: { $value: '#111111' },
        darkUsed: { $value: '#eeeeee' },
        lightUnused: { $value: '#222222' },
        darkUnused: { $value: '#dddddd' },
      },
    });
    writeSource(tokens, 'theme-light', {
      color: {
        used: { $value: '{color.lightUsed}' },
        unused: { $value: '{color.lightUnused}' },
      },
    });
    writeSource(tokens, 'theme-dark', {
      color: {
        used: { $value: '{color.darkUsed}' },
        unused: { $value: '{color.darkUnused}' },
      },
    });
    writeSource(tokens, 'component/atoms/surface', {
      component: {
        surface: {
          background: {
            default: { $value: '{color.used}' },
          },
        },
      },
    });
    writeConsumer(root, 'packages/components/src/surface.css', '.surface { background: var(--mp-surface-background-default); }');

    const report = collectTokenReachability({ repositoryRoot: root, tokensDir: tokens });
    expect(token(report, 'color.used', 'theme-light')).toMatchObject({
      status: 'active',
      evidence: ['alias'],
    });
    expect(token(report, 'color.used', 'theme-dark')).toMatchObject({
      status: 'active',
      evidence: ['alias'],
    });
    expect(token(report, 'color.used', 'theme-dark')?.reason).toMatch(/light-dark\(\)/);
    expect(token(report, 'color.lightUsed')?.status).toBe('active');
    expect(token(report, 'color.darkUsed')?.status).toBe('active');
    // An unused light/dark pair stays removable together; generation only emits
    // names driven by reachable theme-light leaves.
    expect(token(report, 'color.unused', 'theme-light')?.status).toBe('candidate');
    expect(token(report, 'color.unused', 'theme-dark')?.status).toBe('candidate');
  });

  it('protects dynamic branches instead of guessing individual leaves', () => {
    const { root, tokens } = temporaryRepository();
    writeSource(tokens, 'size', {
      size: {
        font: {
          md: { $value: '1rem' },
          lg: { $value: '2rem' },
        },
        icon: {
          sm: { $value: '1rem' },
        },
      },
    });
    writeConsumer(root, 'packages/components/src/scale.ts', "import { size } from '@mission-platform/tokens';\ntype FontScale = keyof typeof size.font;");

    const report = collectTokenReachability({ repositoryRoot: root, tokensDir: tokens });
    expect(token(report, 'size.font.md')).toMatchObject({ status: 'ambiguous', evidence: ['typescript'] });
    expect(token(report, 'size.font.lg')).toMatchObject({ status: 'ambiguous', evidence: ['typescript'] });
    expect(token(report, 'size.icon.sm')?.status).toBe('candidate');
  });

  it('recognizes exported token object access with numeric and dynamic keys', () => {
    const { root, tokens } = temporaryRepository();
    writeSource(tokens, 'palette', {
      color: {
        primary: {
          500: { $value: '#123456' },
          600: { $value: '#654321' },
        },
      },
    });
    writeSource(tokens, 'typography', {
      typography: {
        body: {
          $value: { fontFamily: '{font.family.sans}', fontSize: '{font.size.base}' },
        },
        display: {
          $value: { fontFamily: '{font.family.sans}', fontSize: '{font.size.base}' },
        },
      },
    });
    writeSource(tokens, 'font', {
      font: {
        family: { sans: { $value: 'sans-serif' } },
        size: { base: { $value: '1rem' } },
      },
    });
    writeConsumer(root, 'packages/map/src/colors.ts', "import { palette } from '@mission-platform/tokens';\nconst color = palette.color.primary[500];");
    writeConsumer(root, 'packages/email-components/src/typography.ts', "import { typography } from '@mission-platform/tokens';\nconst variant = 'body' as keyof typeof typography;\nconst token = typography[variant];");

    const report = collectTokenReachability({ repositoryRoot: root, tokensDir: tokens });
    expect(token(report, 'color.primary.500')).toMatchObject({ status: 'active', evidence: ['typescript'] });
    expect(token(report, 'color.primary.600')?.status).toBe('candidate');
    expect(token(report, 'typography.body.font-family')).toMatchObject({ status: 'ambiguous', evidence: ['typescript'] });
    expect(token(report, 'typography.display.font-size')).toMatchObject({ status: 'ambiguous', evidence: ['typescript'] });
  });

  it('keeps static generated usage active despite unrelated keyed syntax', () => {
    const { root, tokens } = temporaryRepository();
    writeSource(tokens, 'z-index', {
      'z-index': {
        used: { $value: 10 },
        unused: { $value: 20 },
      },
    });
    writeConsumer(
      root,
      'packages/components/src/menu.module.scss',
      '$unrelated: (first, second);\n.menu { z-index: var(--mp-z-index-used); content: $unrelated[0]; }',
    );

    const report = collectTokenReachability({ repositoryRoot: root, tokensDir: tokens });
    expect(token(report, 'z-index.used')).toMatchObject({ status: 'active', evidence: ['css'] });
    expect(token(report, 'z-index.unused')?.status).toBe('candidate');
  });

  it('does not use spec/test files or test-only MCP selectors as roots', () => {
    const { root, tokens } = temporaryRepository();
    writeSource(tokens, 'palette', {
      color: {
        runtime: { $value: '#123456' },
        testOnly: { $value: '#654321' },
      },
    });
    writeConsumer(root, 'packages/example/token.test.ts', "readTokens('palette'); const value = palette.color.testOnly;");
    writeConsumer(root, 'mcp/shared/src/repo/tokens.test.ts', "readTokens('palette');");

    const report = collectTokenReachability({ repositoryRoot: root, tokensDir: tokens });
    expect(token(report, 'color.runtime')?.status).toBe('candidate');
    expect(token(report, 'color.testOnly')?.status).toBe('candidate');
    expect(report.tokens.every(({ evidence }) => !evidence.includes('mcp'))).toBe(true);
  });

  it('protects override, MCP, and public package contracts', () => {
    const { root, tokens } = temporaryRepository();
    writeSource(tokens, 'palette', {
      color: {
        override: { $value: '#123456' },
        public: { $value: '#654321' },
      },
    });
    writeSource(tokens, 'spacing', { spacing: { public: { $value: '1rem' } } });
    writeSource(tokens, 'size', {
      size: { font: { md: { $value: '1rem' }, lg: { $value: '2rem' } } },
    });
    writeSource(tokens, 'radius', { radius: { reflective: { $value: '2px' } } });
    writeConsumer(root, 'apps/storybook/design-tokens/overrides.tokens.json', JSON.stringify({ color: { override: { $value: '#abcdef' } } }));
    writeConsumer(
      root,
      'mcp/shared/src/repo/tokens.ts',
      "export function listOverridableTokenVariables() { return readTokenSources(); }\nconst palette = readTokens('palette');",
    );
    writeConsumer(
      root,
      'packages/tokens/src/tokens.ts',
      "export * from './generated/tokens.js';\nexport type PublicColor = typeof palette.color.public;\nexport type PublicScale = keyof typeof size.font;",
    );

    const report = collectTokenReachability({ repositoryRoot: root, tokensDir: tokens });
    expect(token(report, 'color.override')).toMatchObject({ status: 'protected' });
    expect(token(report, 'color.override')?.evidence).toEqual(expect.arrayContaining(['mcp', 'override']));
    expect(token(report, 'color.public')).toMatchObject({ status: 'protected' });
    expect(token(report, 'color.public')?.evidence).toEqual(expect.arrayContaining(['mcp', 'public-api']));
    expect(token(report, 'spacing.public')?.status).toBe('candidate');
    expect(token(report, 'size.font.md')).toMatchObject({ status: 'protected' });
    expect(token(report, 'size.font.md')?.evidence).toContain('public-api');
    expect(token(report, 'size.font.lg')).toMatchObject({ status: 'protected' });
    expect(token(report, 'size.font.lg')?.evidence).toContain('public-api');
    expect(token(report, 'radius.reflective')?.status).toBe('candidate');
  });

  it('reports a genuine candidate and writes deterministic JSON', () => {
    const { root, tokens } = temporaryRepository();
    writeSource(tokens, 'radius', { radius: { unused: { $value: '2px' } } });
    const options = { repositoryRoot: root, scanConsumers: false, tokensDir: tokens } as const;
    const first = collectTokenReachability(options);
    const second = collectTokenReachability(options);
    expect(first).toEqual(second);
    expect(first.summary).toEqual({ active: 0, protected: 0, ambiguous: 0, candidate: 1 });
    expect(first.tokens[0]).toMatchObject({
      sourceId: 'radius',
      path: 'radius.unused',
      generatedNames: ['--mp-radius-unused', '$radius-unused'],
      status: 'candidate',
    });

    const reportPath = path.join(root, 'report.json');
    writeTokenReachabilityReport(first, reportPath);
    expect(existsSync(reportPath)).toBe(true);
    expect(JSON.parse(readFileSync(reportPath, 'utf8'))).toEqual(first);
  });

  it('matches the checked-in repository reachability report', () => {
    const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
    const tokensDir = path.join(repositoryRoot, 'packages/tokens/tokens');
    const reportPath = path.join(import.meta.dirname, 'fixtures/token-reachability.report.json');
    const consumerRootNames = (process.env.TOKEN_REACHABILITY_ROOTS ?? 'apps,docs,mcp,packages,vite-plugins').split(',');
    const report = collectTokenReachability({
      repositoryRoot,
      tokensDir,
      consumerRoots: consumerRootNames.map((root) => path.join(repositoryRoot, root)),
      scanConsumers: process.env.TOKEN_REACHABILITY_GRAPH_ONLY !== '1',
    });
    if (process.env.UPDATE_TOKEN_REACHABILITY_FIXTURE === '1') writeTokenReachabilityReport(report, reportPath);
    expect(existsSync(reportPath)).toBe(true);
    expect(JSON.parse(readFileSync(reportPath, 'utf8'))).toEqual(report);
    expect(report.summary.protected).toBeGreaterThan(0);
    expect(report.summary.ambiguous).toBeGreaterThan(0);
    expect(report.summary.protected).toBeLessThan(report.tokens.length);
    expect(report.summary.active).toBeGreaterThan(0);
    expect(report.summary.candidate).toBe(0);
    const unresolvedAliases = report.aliases.filter(({ resolved }) => !resolved);
    expect(unresolvedAliases).toEqual([
      { sourceId: 'component/atoms/layout', from: 'component.layout.stack.item.surface', to: 'color.surface.raised', resolved: false },
      { sourceId: 'component/atoms/typography', from: 'component.typography.link.radius', to: 'radius.2xs', resolved: false },
      { sourceId: 'component/organisms/scheduler', from: 'component.scheduler.year.outside-weight', to: 'font.weight.light', resolved: false },
    ]);
  }, 180_000);
});
