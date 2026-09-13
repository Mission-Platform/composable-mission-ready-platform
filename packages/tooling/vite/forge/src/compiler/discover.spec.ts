import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { CompilerDiagnosticError } from '@mission-platform/forge-plugin-api';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DUPLICATE_COMPONENT_TARGET,
  discoverComponents,
  discoverComponentsFromGraph,
  discoverHelperExports,
  discoverHelperExportsFromGraph,
} from './discover';
import { buildForgeFileGraph } from './graph';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const BARREL = `
export { ForgeBadge, type BadgeProperties } from './forge-badge';
export { ForgeToast, type ToastProperties, type ToastVariant } from './forge-toast';
export { ForgeToastContainer, type ToastContainerProperties } from './forge-toast-container';
export {
  clearToasts,
  showToast,
  useToast,
  type ToastOptions,
  type ToastPosition,
} from './toast-store';
`;

const NESTED_BARREL = `
export { ForgeBadge, type BadgeProperties } from './atoms/forge-badge';
export { ForgeQuote, type QuoteProperties } from './molecules/forge-quote';
export {
  clearToasts,
  showToast,
  useToast,
  type ToastOptions,
  type ToastPosition,
} from './toast-store';
`;

describe('discoverComponents', () => {
  it('projects nested export chains and helpers from canonical source nodes', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-discover-'));
    temporaryDirectories.push(root);
    const files: Record<string, string> = {
      'components/index.ts': `export { ForgeBadge, type BadgeProperties } from './atoms/forge-badge';\nexport { useToast } from '@/composables/use-toast';`,
      'components/atoms/forge-badge/index.ts': `export { ForgeBadge, type BadgeProperties } from './forge-badge';`,
      'components/atoms/forge-badge/forge-badge.tsx': `export interface BadgeProperties { tone: string; }\nexport function ForgeBadge() { return null; }`,
      'composables/use-toast.ts': `export function useToast() { return undefined; }`,
    };
    await Promise.all(
      Object.entries(files).map(async ([relativePath, source]) => {
        const filePath = path.join(root, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, source);
      }),
    );

    const graph = buildForgeFileGraph({ entry: path.join(root, 'components/index.ts'), sourceRoot: root });
    const components = discoverComponentsFromGraph(graph);
    const helpers = discoverHelperExportsFromGraph(graph, new Set(components.map((component) => component.folder)));

    expect(components).toEqual([
      expect.objectContaining({
        neutralName: 'ForgeBadge',
        publicName: 'Badge',
        folder: 'forge-badge',
        sourceDir: 'atoms/forge-badge',
        sourcePath: path.join(root, 'components/atoms/forge-badge/forge-badge.tsx'),
        typeExports: ['BadgeProperties'],
        propertiesType: 'BadgeProperties',
      }),
    ]);
    expect(helpers).toEqual([
      expect.objectContaining({
        base: 'use-toast',
        relativePath: 'composables/use-toast',
        sourcePath: path.join(root, 'composables/use-toast.ts'),
        values: [{ localName: 'useToast', exportedName: 'useToast' }],
      }),
    ]);
  });

  it('distinguishes component functions from co-located context and helper exports in mixed modules', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-discover-mixed-'));
    temporaryDirectories.push(root);
    const files: Record<string, string> = {
      'components/index.ts': [
        'export {',
        '  ForgeForm,',
        '  FormContext,',
        '  defaultFormContext,',
        '  useFormContext,',
        '  type ForgeFormProps,',
        '  type ForgeFormProperties,',
        '  type FormContextValue,',
        "} from './organisms/forge-form';",
      ].join('\n'),
      'components/organisms/forge-form/index.ts': [
        'export {',
        '  ForgeForm,',
        '  FormContext,',
        '  defaultFormContext,',
        '  useFormContext,',
        '  type ForgeFormProps,',
        '  type ForgeFormProperties,',
        '  type FormContextValue,',
        "} from './forge-form';",
      ].join('\n'),
      'components/organisms/forge-form/forge-form.tsx': [
        'export interface FormContextValue { state: Record<string, unknown>; }',
        'export interface ForgeFormProps { id?: string; }',
        'export interface ForgeFormProperties extends ForgeFormProps { name?: string; }',
        'export const defaultFormContext: FormContextValue = { state: {} };',
        'export const FormContext = { current: defaultFormContext };',
        'export function useFormContext() { return FormContext.current; }',
        'export function ForgeForm(props: ForgeFormProperties) { return <form id={props.id} />; }',
      ].join('\n'),
    };
    await Promise.all(
      Object.entries(files).map(async ([relativePath, source]) => {
        const filePath = path.join(root, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, source);
      }),
    );

    const graph = buildForgeFileGraph({ entry: path.join(root, 'components/index.ts'), sourceRoot: root });
    const components = discoverComponentsFromGraph(graph);
    const helpers = discoverHelperExportsFromGraph(graph, new Set(components.map((component) => component.folder)));

    expect(components).toEqual([
      expect.objectContaining({
        neutralName: 'ForgeForm',
        publicName: 'Form',
        folder: 'forge-form',
        sourceDir: 'organisms/forge-form',
        sourcePath: path.join(root, 'components/organisms/forge-form/forge-form.tsx'),
      }),
    ]);
    expect(components.map((component) => component.neutralName)).toEqual(['ForgeForm']);

    expect(helpers).toEqual([
      expect.objectContaining({
        base: 'forge-form',
        relativePath: 'organisms/forge-form/forge-form',
        sourcePath: path.join(root, 'components/organisms/forge-form/forge-form.tsx'),
        values: [
          { localName: 'FormContext', exportedName: 'FormContext' },
          { localName: 'defaultFormContext', exportedName: 'defaultFormContext' },
          { localName: 'useFormContext', exportedName: 'useFormContext' },
        ],
        types: [{ localName: 'FormContextValue', exportedName: 'FormContextValue' }],
      }),
    ]);
  });

  it('classifies PascalCase function exports as components even without explicit JSX returns', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-discover-func-'));
    temporaryDirectories.push(root);
    const files: Record<string, string> = {
      'components/index.ts': [
        "export { ForgeCard } from './forge-card';",
        "export { ForgeEmpty } from './forge-empty';",
      ].join('\n'),
      'components/forge-card.tsx': 'export function ForgeCard() {}\n',
      'components/forge-empty.tsx': 'export const ForgeEmpty = () => {};\n',
    };
    await Promise.all(
      Object.entries(files).map(async ([relativePath, source]) => {
        const filePath = path.join(root, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, source);
      }),
    );

    const graph = buildForgeFileGraph({ entry: path.join(root, 'components/index.ts'), sourceRoot: root });
    const components = discoverComponentsFromGraph(graph);

    expect(components.map((c) => c.neutralName)).toEqual(['ForgeCard', 'ForgeEmpty']);
  });

  it('matches type-only exports from composable modules', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-discover-composable-types-'));
    temporaryDirectories.push(root);
    const files: Record<string, string> = {
      'components/index.ts': "export { useLayer, type UseLayerOptions } from '../composables/use-layer';\n",
      'composables/use-layer.ts':
        'export interface UseLayerOptions { layer: string; }\nexport function useLayer(): void {}\n',
    };
    await Promise.all(
      Object.entries(files).map(async ([relativePath, source]) => {
        const filePath = path.join(root, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, source);
      }),
    );

    const graph = buildForgeFileGraph({ entry: path.join(root, 'components/index.ts'), sourceRoot: root });
    const helpers = discoverHelperExportsFromGraph(graph, new Set());

    expect(helpers).toEqual([
      expect.objectContaining({
        base: 'use-layer',
        values: [{ localName: 'useLayer', exportedName: 'useLayer' }],
        types: [{ localName: 'UseLayerOptions', exportedName: 'UseLayerOptions' }],
        sourcePath: path.join(root, 'composables/use-layer.ts'),
      }),
    ]);
  });

  it('preserves PascalCase provider and helper function exports from non-component helper modules', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-discover-provider-helper-'));
    temporaryDirectories.push(root);
    const files: Record<string, string> = {
      'components/index.ts':
        "export { IconSpriteContext, IconSpriteProvider, useIconHref } from '../sprite/provider';\n",
      'sprite/provider.ts': [
        'export const IconSpriteContext = { src: undefined };',
        'export function IconSpriteProvider(props: { src?: string }) { return props; }',
        'export function useIconHref(id: string) { return id; }',
      ].join('\n'),
    };
    await Promise.all(
      Object.entries(files).map(async ([relativePath, source]) => {
        const filePath = path.join(root, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, source);
      }),
    );

    const graph = buildForgeFileGraph({ entry: path.join(root, 'components/index.ts'), sourceRoot: root });
    const components = discoverComponentsFromGraph(graph);
    const helpers = discoverHelperExportsFromGraph(graph, new Set(components.map((c) => c.folder)));

    expect(components).toEqual([]);
    expect(helpers).toEqual([
      expect.objectContaining({
        base: 'provider',
        values: [
          { localName: 'IconSpriteContext', exportedName: 'IconSpriteContext' },
          { localName: 'IconSpriteProvider', exportedName: 'IconSpriteProvider' },
          { localName: 'useIconHref', exportedName: 'useIconHref' },
        ],
        sourcePath: path.join(root, 'sprite/provider.ts'),
      }),
    ]);
  });

  it('keeps folder as the basename and sourceDir flat for a flat re-export', () => {
    const components = discoverComponents(BARREL);
    const badge = components.find((component) => component.neutralName === 'ForgeBadge');

    expect(badge).toMatchObject({
      neutralName: 'ForgeBadge',
      publicName: 'Badge',
      folder: 'forge-badge',
      sourceDir: 'forge-badge',
      propertiesType: 'BadgeProperties',
    });
  });

  it('keeps folder as the basename and sourceDir nested for an atomic-design re-export', () => {
    const components = discoverComponents(NESTED_BARREL);

    expect(components.map((component) => [component.folder, component.sourceDir])).toEqual([
      ['forge-badge', 'atoms/forge-badge'],
      ['forge-quote', 'molecules/forge-quote'],
    ]);
    expect(components.find((component) => component.neutralName === 'ForgeBadge')).toMatchObject({
      publicName: 'Badge',
      folder: 'forge-badge',
      sourceDir: 'atoms/forge-badge',
      propertiesType: 'BadgeProperties',
    });
  });

  it('disambiguates components in different source directories that share identical folder basenames in graph discovery', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-discover-disambiguate-'));
    temporaryDirectories.push(root);
    const files: Record<string, string> = {
      'components/index.ts': [
        "export { ForgeButton as AtomButton, type AtomButtonProperties } from './atoms/forge-button/forge-button';",
        "export { ForgeMoleculeButton as MoleculeButton, type MoleculeButtonProperties } from './molecules/forge-button/forge-button';",
      ].join('\n'),
      'components/atoms/forge-button/forge-button.tsx':
        'export interface AtomButtonProperties { tone: string; }\nexport function ForgeButton() { return null; }\n',
      'components/molecules/forge-button/forge-button.tsx':
        'export interface MoleculeButtonProperties { size: string; }\nexport function ForgeMoleculeButton() { return null; }\n',
    };
    await Promise.all(
      Object.entries(files).map(async ([relativePath, source]) => {
        const filePath = path.join(root, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, source);
      }),
    );

    const graph = buildForgeFileGraph({ entry: path.join(root, 'components/index.ts'), sourceRoot: root });
    const components = discoverComponentsFromGraph(graph);

    expect(components).toEqual([
      expect.objectContaining({
        neutralName: 'ForgeButton',
        publicName: 'AtomButton',
        folder: 'atoms-forge-button',
        sourceDir: 'atoms/forge-button',
        sourcePath: path.join(root, 'components/atoms/forge-button/forge-button.tsx'),
      }),
      expect.objectContaining({
        neutralName: 'ForgeMoleculeButton',
        publicName: 'MoleculeButton',
        folder: 'molecules-forge-button',
        sourceDir: 'molecules/forge-button',
        sourcePath: path.join(root, 'components/molecules/forge-button/forge-button.tsx'),
      }),
    ]);
  });

  it('disambiguates flat component files in different source directories that share identical basenames', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-discover-flat-disambiguate-'));
    temporaryDirectories.push(root);
    const files: Record<string, string> = {
      'components/index.ts': [
        "export { ForgeAtomButton } from './atoms/button';",
        "export { ForgeMoleculeButton } from './molecules/button';",
      ].join('\n'),
      'components/atoms/button.tsx': 'export function ForgeAtomButton() { return null; }\n',
      'components/molecules/button.tsx': 'export function ForgeMoleculeButton() { return null; }\n',
    };
    await Promise.all(
      Object.entries(files).map(async ([relativePath, source]) => {
        const filePath = path.join(root, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, source);
      }),
    );

    const graph = buildForgeFileGraph({ entry: path.join(root, 'components/index.ts'), sourceRoot: root });
    const components = discoverComponentsFromGraph(graph);

    expect(components).toEqual([
      expect.objectContaining({
        neutralName: 'ForgeAtomButton',
        folder: 'atoms-button',
        sourceDir: 'atoms',
        sourcePath: path.join(root, 'components/atoms/button.tsx'),
      }),
      expect.objectContaining({
        neutralName: 'ForgeMoleculeButton',
        folder: 'molecules-button',
        sourceDir: 'molecules',
        sourcePath: path.join(root, 'components/molecules/button.tsx'),
      }),
    ]);
  });

  it('disambiguates components in different source directories that share identical basenames in barrel discovery', () => {
    const collidingBarrel = [
      "export { ForgeAtomButton, type AtomButtonProperties } from './atoms/forge-button';",
      "export { ForgeMoleculeButton, type MoleculeButtonProperties } from './molecules/forge-button';",
    ].join('\n');
    const components = discoverComponents(collidingBarrel);

    expect(components.map((component) => [component.folder, component.sourceDir])).toEqual([
      ['atoms-forge-button', 'atoms/forge-button'],
      ['molecules-forge-button', 'molecules/forge-button'],
    ]);
  });

  it('throws DUPLICATE_COMPONENT_TARGET diagnostic when component targets collide in the same directory and cannot be disambiguated', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-discover-duplicate-target-'));
    temporaryDirectories.push(root);
    const files: Record<string, string> = {
      'components/index.ts': [
        "export { ForgeButtonA } from './button';",
        "export { ForgeButtonB } from './button/button';",
      ].join('\n'),
      'components/button.tsx': 'export function ForgeButtonA() { return null; }\n',
      'components/button/button.tsx': 'export function ForgeButtonB() { return null; }\n',
    };
    await Promise.all(
      Object.entries(files).map(async ([relativePath, source]) => {
        const filePath = path.join(root, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, source);
      }),
    );

    const graph = buildForgeFileGraph({ entry: path.join(root, 'components/index.ts'), sourceRoot: root });
    expect(() => discoverComponentsFromGraph(graph)).toThrow(CompilerDiagnosticError);
    try {
      discoverComponentsFromGraph(graph);
    } catch (error) {
      expect(error).toBeInstanceOf(CompilerDiagnosticError);
      const diagnosticError = error as CompilerDiagnosticError;
      expect(diagnosticError.diagnostics[0]?.code).toBe(DUPLICATE_COMPONENT_TARGET);
    }
  });
});

describe('discoverHelperExports', () => {
  it('forwards non-component helper re-exports (value + type names)', () => {
    const components = discoverComponents(BARREL);
    const folders = new Set(components.map((component) => component.folder));
    const helpers = discoverHelperExports(BARREL, folders);

    expect(helpers).toHaveLength(1);
    expect(helpers[0]).toEqual({
      base: 'toast-store',
      relativePath: 'toast-store',
      values: [
        { localName: 'clearToasts', exportedName: 'clearToasts' },
        { localName: 'showToast', exportedName: 'showToast' },
        { localName: 'useToast', exportedName: 'useToast' },
      ],
      types: [
        { localName: 'ToastOptions', exportedName: 'ToastOptions' },
        { localName: 'ToastPosition', exportedName: 'ToastPosition' },
      ],
    });
  });

  it('preserves nested folder paths in relativePath while keeping base as the file name', () => {
    const nestedBarrel = `
export { useObservable } from './composables/use-observable';
export { useSubscribe, useSubscription, type Unsubscribable } from './composables/use-subscription';
export { innerDimensions, type Margin } from './utils/margins';
`;
    const helpers = discoverHelperExports(nestedBarrel, new Set());

    expect(helpers.map((helper) => [helper.base, helper.relativePath])).toEqual([
      ['use-observable', 'composables/use-observable'],
      ['use-subscription', 'composables/use-subscription'],
      ['margins', 'utils/margins'],
    ]);
  });

  it('never treats a component re-export as a helper', () => {
    const components = discoverComponents(BARREL);
    const folders = new Set(components.map((component) => component.folder));
    const helpers = discoverHelperExports(BARREL, folders);

    // The PascalCase component lines (forge-badge / forge-toast / forge-toast-container)
    // are excluded by the component-folder set.
    expect(helpers.map((helper) => helper.base)).not.toContain('forge-toast');
    expect(helpers.map((helper) => helper.base)).not.toContain('forge-toast-container');
    // …and the helper line never produces a phantom component.
    expect(components.map((component) => component.folder)).not.toContain('toast-store');
  });

  it('never treats a nested component re-export as a helper (folder is still the basename)', () => {
    const components = discoverComponents(NESTED_BARREL);
    const folders = new Set(components.map((component) => component.folder));
    const helpers = discoverHelperExports(NESTED_BARREL, folders);

    expect(folders.has('forge-badge')).toBe(true);
    expect(folders.has('forge-quote')).toBe(true);
    expect(helpers.map((helper) => helper.base)).toEqual(['toast-store']);
  });
});
