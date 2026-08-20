import { describe, expect, it } from 'vitest';

import { readExternalImports, readStyleImports } from './ast.js';
import { compileComponentModule } from './compiler-test-helpers.js';
import { createGenericAst, parseForgeSource, parseFrontendModule } from './frontends.js';
import { inferSemanticModule } from './infer.js';
import { analyzeForgeModule } from './pipeline.js';

describe('Forge source frontends', () => {
  it('parses all supported source extensions through Oxc', () => {
    for (const fileName of ['use-data.js', 'use-data.jsx', 'use-data.ts', 'ForgeCard.tsx']) {
      const frontend = parseFrontendModule(fileName, 'export const value = 1;', 'composable');
      expect(frontend.oxc.fileName).toBe(fileName);
      expect(frontend.diagnostics).toHaveLength(0);
    }
  });

  it('builds a serializable generic AST and removes framework directives', () => {
    const source = '"use vue";\nimport { useState } from "@mission-platform/forge";\nexport const value = 1;';
    const parsed = parseForgeSource('use-data.jsx', source);
    const ast = createGenericAst(parsed, 'composable');
    const frontend = parseFrontendModule('use-data.jsx', source, 'composable');

    expect(ast.fileName).toBe('use-data.jsx');
    expect(ast.nodes.some((node) => node.kind === 'import')).toBe(true);
    expect(ast.imports.map((entry) => entry.source)).toEqual(['@mission-platform/forge']);
    expect(ast.declarations.map((entry) => entry.statementKind)).toEqual(['expression', 'variable']);
    expect(ast.declarations[1]?.exported).toBe(true);
    expect(ast.component).toBeUndefined();
    expect(frontend.oxc.source).toContain('import');
    expect(JSON.stringify(ast)).not.toContain('SourceFileObject');
    expect('sourceFile' in ast).toBe(false);
  });

  it('reports Oxc parser diagnostics with source locations', () => {
    const frontend = parseFrontendModule(
      'Broken.tsx',
      'export function Broken() {\n  return <div>\n}',
      'component',
      'Broken',
    );

    expect(frontend.diagnostics.length).toBeGreaterThan(0);
    expect(frontend.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          phase: 'frontend',
          severity: 'error',
          code: 'FORGE_FRONTEND_PARSE_ERROR',
          fileName: 'Broken.tsx',
          message: expect.stringContaining('[OXC]'),
          span: expect.objectContaining({
            start: expect.any(Number),
            end: expect.any(Number),
            line: 3,
            column: expect.any(Number),
          }),
        }),
      ]),
    );
    expect(frontend.diagnostics.every((diagnostic) => diagnostic.span?.end !== undefined)).toBe(true);
  });

  it('normalizes Oxc imports, aliases, JSX, and framework directives', () => {
    const source = [
      '"use vue";',
      'import Component, { type Properties, value as alias } from "./component";',
      'export { alias as rendered } from "./component";',
      'export function ForgeCard(properties: Properties) { return <Component value={alias} {...properties} />; }',
    ].join('\n');
    const parsed = parseForgeSource('ForgeCard.tsx', source);
    const oxc = parsed;

    expect(oxc.facts.frameworkDirective).toBe('vue');
    expect(oxc.facts.hasJsx).toBe(true);
    expect(oxc.facts.imports[0]).toMatchObject({
      specifier: './component',
      valueNames: ['Component', 'alias'],
      typeNames: ['Properties'],
    });
    expect(oxc.facts.exports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ exportedName: 'rendered', localName: 'alias', specifier: './component' }),
        expect.objectContaining({ exportedName: 'ForgeCard', localName: 'ForgeCard' }),
      ]),
    );
  });

  it('reads generation imports and i18next usage from Oxc facts', () => {
    const source = [
      "import styles, { type Theme } from './card.module.scss';",
      "import './reset.css';",
      "import { format } from '@mission-platform/format';",
      "import i18next from 'i18next';",
      '',
      "export const label = i18next.t('label') as Theme;",
    ].join('\n');

    expect(readStyleImports('/workspace/components/card.tsx', source)).toEqual([
      {
        name: 'styles',
        specifier: './card.module.scss',
        flatSpecifier: './card.module.scss',
        base: 'card.module.scss',
      },
      {
        name: undefined,
        specifier: './reset.css',
        flatSpecifier: './reset.css',
        base: 'reset.css',
      },
    ]);
    expect(readExternalImports('/workspace/components/card.tsx', source)).toEqual([
      "import { format } from '@mission-platform/format';",
      "import i18next from 'i18next';",
      "import { useI18n } from '@mission-platform/i18n';",
    ]);
  });

  it('reports a missing named component with a source-backed diagnostic', () => {
    const source = 'export function Available() { return <div />; }';
    const semantic = inferSemanticModule(parseForgeSource('Missing.tsx', source), 'component', 'Missing');
    const diagnostic = semantic.diagnostics?.find((entry) => entry.code === 'FORGE_COMPONENT_NOT_FOUND');

    expect(diagnostic).toMatchObject({
      phase: 'inference',
      severity: 'error',
      code: 'FORGE_COMPONENT_NOT_FOUND',
      message: expect.stringContaining('"Missing"'),
      fileName: 'Missing.tsx',
      span: { start: 0, end: source.length, line: 1, column: 1 },
    });
  });

  it('retains frontend and semantic diagnostics in the semantic cache', () => {
    const input = {
      source: 'export const value = <div>\n',
      fileName: 'CachedBroken.tsx',
      moduleKind: 'component' as const,
      componentName: 'CachedBroken',
    };
    const first = analyzeForgeModule(input);
    const second = analyzeForgeModule(input);

    expect(first).toBe(second);
    expect(first.diagnostics?.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(['FORGE_FRONTEND_PARSE_ERROR', 'FORGE_COMPONENT_NOT_FOUND']),
    );
  });

  it('fails the pipeline when frontend parsing reports errors', () => {
    expect(() =>
      compileComponentModule('export function Broken() {\n  return <div>\n}', {
        framework: 'web-components',
        componentName: 'Broken',
        fileName: 'Broken.tsx',
      }),
    ).toThrow(/FORGE_FRONTEND_PARSE_ERROR/);
  });

  // Production WC lowering does not yet emit these diagnostic codes; tracked for the
  // target-plugin migration rather than the Oxc frontend normalization step.
  it.todo('fails the target pipeline before generating lossy Web Components output');

  it('extracts the component structure, attributes, and children into the generic AST', () => {
    const source = [
      'interface CardProperties { title: string; active?: boolean }',
      'export function ForgeCard(properties: CardProperties) {',
      '  const label = properties.title;',
      '  return (',
      '    <section class="card" hidden {...properties}>',
      '      <h2>{label}</h2>',
      '      Static text',
      '    </section>',
      '  );',
      '}',
    ].join('\n');
    const ast = createGenericAst(parseForgeSource('ForgeCard.tsx', source), 'component', 'ForgeCard');

    expect(ast.component?.name).toBe('ForgeCard');
    expect(ast.component?.exported).toBe(true);
    expect(ast.component?.parameter?.binding).toBe('identifier');
    expect(ast.component?.parameter?.text).toBe('properties');
    expect(ast.component?.parameter?.type?.text).toBe('CardProperties');
    expect(ast.component?.body.map((statement) => statement.statementKind)).toEqual(['variable', 'return']);
    expect(ast.declarations.map((statement) => statement.name)).toEqual(['CardProperties']);

    const root = ast.component?.returnNode;
    expect(root?.tag).toBe('section');
    expect(root?.tagKind).toBe('element');
    expect(root?.selfClosing).toBe(false);
    expect(root?.attributes.map((attribute) => attribute.kind)).toEqual([
      'jsx-attribute',
      'jsx-attribute',
      'jsx-spread-attribute',
    ]);
    const [classAttribute, hiddenAttribute] = root?.attributes ?? [];
    expect(
      classAttribute?.kind === 'jsx-attribute' && classAttribute.value?.kind === 'string'
        ? classAttribute.value.value
        : undefined,
    ).toBe('card');
    expect(hiddenAttribute?.kind === 'jsx-attribute' ? hiddenAttribute.value : undefined).toBeUndefined();

    expect(root?.children.map((child) => child.kind)).toEqual(['render-node', 'text']);
    const [heading] = root?.children ?? [];
    expect(heading?.kind === 'render-node' ? heading.tag : undefined).toBe('h2');
    const interpolation = heading?.kind === 'render-node' ? heading.children[0] : undefined;
    expect(interpolation?.kind).toBe('expression-node');
    expect(interpolation?.kind === 'expression-node' ? interpolation.expression?.text : undefined).toBe('label');
    expect(root?.span.start).toBeGreaterThan(0);
  });

  it('preserves self-closing JSX elements, components, and markers', () => {
    const source = [
      'import { Slot } from "@mission-platform/forge";',
      'export function ForgeForm() {',
      '  return (',
      '    <form>',
      '      <input id="name" type="text" />',
      '      <input id="email" type="email" />',
      '      <Slot />',
      '      <CustomComponent value={42} />',
      '      <div>content</div>',
      '    </form>',
      '  );',
      '}',
    ].join('\n');
    const ast = createGenericAst(parseForgeSource('ForgeForm.tsx', source), 'component', 'ForgeForm');

    const root = ast.component?.returnNode;
    expect(root?.tag).toBe('form');
    expect(root?.selfClosing).toBe(false);

    const children = root?.children ?? [];
    expect(children).toHaveLength(5);

    // Self-closing input element
    const input1 = children[0];
    expect(input1?.kind).toBe('render-node');
    expect(input1?.kind === 'render-node' ? input1.tag : undefined).toBe('input');
    expect(input1?.kind === 'render-node' ? input1.selfClosing : undefined).toBe(true);

    // Another self-closing input element
    const input2 = children[1];
    expect(input2?.kind).toBe('render-node');
    expect(input2?.kind === 'render-node' ? input2.tag : undefined).toBe('input');
    expect(input2?.kind === 'render-node' ? input2.selfClosing : undefined).toBe(true);

    // Self-closing Slot component
    const slot = children[2];
    expect(slot?.kind).toBe('render-node');
    expect(slot?.kind === 'render-node' ? slot.tag : undefined).toBe('Slot');
    expect(slot?.kind === 'render-node' ? slot.selfClosing : undefined).toBe(true);

    // Self-closing CustomComponent
    const customComponent = children[3];
    expect(customComponent?.kind).toBe('render-node');
    expect(customComponent?.kind === 'render-node' ? customComponent.tag : undefined).toBe('CustomComponent');
    expect(customComponent?.kind === 'render-node' ? customComponent.selfClosing : undefined).toBe(true);

    // Non-self-closing div
    const div = children[4];
    expect(div?.kind).toBe('render-node');
    expect(div?.kind === 'render-node' ? div.tag : undefined).toBe('div');
    expect(div?.kind === 'render-node' ? div.selfClosing : undefined).toBe(false);
  });

  it('retains prop and state type information for target emitters', () => {
    const source = [
      'import { useState } from "@mission-platform/forge";',
      'interface CardProperties { title: string; count?: number }',
      'export function ForgeCard(properties: CardProperties) {',
      '  const [open, setOpen] = useState(false);',
      '  const [label, setLabel] = useState<string | undefined>();',
      '  return <div>{properties.title}{open}{label}</div>;',
      '}',
    ].join('\n');
    const semantic = inferSemanticModule(parseForgeSource('ForgeCard.tsx', source), 'component', 'ForgeCard');

    expect(semantic.intentions.props.map((prop) => [prop.name, prop.type?.text])).toEqual([
      ['title', 'string'],
      ['count', 'number'],
    ]);
    expect(semantic.intentions.propsType?.text).toBe('CardProperties');
    expect(semantic.intentions.propsParameterName).toBe('properties');
    expect(semantic.intentions.state.map((state) => [state.name, state.type?.text, state.inferredType])).toEqual([
      ['open', undefined, 'boolean'],
      ['label', 'string | undefined', undefined],
    ]);
  });

  it('retains JSX roots nested in conditional component returns', () => {
    const source = [
      'export function MarkdownBlock(properties: { open: boolean }) {',
      '  return properties.open ? <p>content</p> : <span>closed</span>;',
      '}',
    ].join('\n');
    const ast = createGenericAst(parseForgeSource('MarkdownBlock.tsx', source), 'component', 'MarkdownBlock');

    expect(ast.component?.returnNode?.tagKind).toBe('fragment');
    const child = ast.component?.returnNode?.children[0];
    expect(child?.kind).toBe('expression-node');
    expect(child?.kind === 'expression-node' ? child.nested.map((node) => node.tag) : []).toEqual(['p', 'span']);
  });

  it('infers shared component intentions without selecting a framework', () => {
    const source = [
      'import { Dynamic, Slot, hasSlot, useEffect, useMemo, useRef, useState } from "@mission-platform/forge";',
      'interface CardProperties { title: string; active?: boolean }',
      'export function ForgeCard(properties: CardProperties) {',
      '  const [count, setCount] = useState(0);',
      '  const element = useRef<HTMLDivElement>(null);',
      '  const label = useMemo(() => `${properties.title}:${count}`, [count]);',
      '  useEffect(() => () => element.current?.focus(), []);',
      '  return <div ref={element} onClick={() => setCount(count + 1)}>{hasSlot("footer") && <Slot name="footer" />}<Dynamic is="button" /></div>;',
      '}',
    ].join('\n');
    const parsed = parseForgeSource('ForgeCard.tsx', source);
    const semantic = inferSemanticModule(parsed, 'component', 'ForgeCard');

    expect(semantic.intentions.props.map((prop) => prop.name)).toEqual(['title', 'active']);
    expect(semantic.intentions.state[0]?.setterName).toBe('setCount');
    expect(semantic.intentions.refs[0]?.name).toBe('element');
    expect(semantic.intentions.memos[0]?.name).toBe('label');
    expect(semantic.intentions.effects).toHaveLength(1);
    expect(semantic.intentions.slots.map((slot) => slot.name)).toEqual(['footer', 'footer']);
    expect(semantic.intentions.dynamicNodes).toHaveLength(1);
    expect(semantic.intentions.events[0]?.name).toBe('click');
    expect(semantic.intentions.renderTree[0]?.tag).toBe('div');
    expect(semantic.fileName).toBe('ForgeCard.tsx');
  });
});
