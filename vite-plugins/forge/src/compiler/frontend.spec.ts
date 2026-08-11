import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { createGenericAst, parseForgeSource, scriptKindForFileName, parseFrontendModule } from './frontends.js';
import { inferSemanticModule } from './infer.js';

describe('Forge source frontends', () => {
  it('selects TypeScript parser modes from source extensions', () => {
    expect(scriptKindForFileName('use-data.js')).toBe(ts.ScriptKind.JS);
    expect(scriptKindForFileName('use-data.jsx')).toBe(ts.ScriptKind.JSX);
    expect(scriptKindForFileName('use-data.ts')).toBe(ts.ScriptKind.TS);
    expect(scriptKindForFileName('ForgeCard.tsx')).toBe(ts.ScriptKind.TSX);
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
    expect(frontend.sourceFile.statements[0]?.getText()).toContain('import');
    expect(JSON.stringify(ast)).not.toContain('SourceFileObject');
    expect('sourceFile' in ast).toBe(false);
  });

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
    const sourceFile = parseForgeSource('ForgeCard.tsx', source);
    const semantic = inferSemanticModule(sourceFile, 'component', 'ForgeCard');

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
