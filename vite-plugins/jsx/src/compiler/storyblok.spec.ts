import { describe, expect, it } from 'vitest';

import {
  analyzeStoryblokComponent,
  emitBlokDataType,
  emitStoryblokBlokWrapper,
  emitStoryblokComponent,
  toDisplayName,
  toTechnicalName,
} from '../generators/storyblok';

import { parseTsx } from './ast';

const BADGE = [
  "import { classNames, h, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  "export type BadgeVariant = 'default' | 'primary' | 'secondary';",
  "export type BadgeSize = 'sm' | 'md' | 'lg';",
  '',
  'export interface BadgeProperties extends MpProperties {',
  '  /** Visual tone of the badge. */',
  '  variant?: BadgeVariant;',
  '  /** Size step driving padding and font size. */',
  '  size?: BadgeSize;',
  '  /** Use a fully rounded ("pill") shape. */',
  '  pill?: boolean;',
  '}',
  '',
  'export function BaseBadge(properties: BadgeProperties): MpElement {',
  "  const variant = properties.variant ?? 'default';",
  "  const size = properties.size ?? 'md';",
  '  return <span class="badge">{properties.children}</span>;',
  '}',
].join('\n');

const BUTTON = [
  "import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  "export type ButtonVariant = 'primary' | 'secondary' | 'ghost';",
  '',
  'export interface ButtonProperties extends MpProperties {',
  '  /** Visual tone of the button. */',
  '  variant?: ButtonVariant;',
  '  /** Disable interaction. */',
  '  disabled?: boolean;',
  '  /** Optional count rendered as a trailing pill badge. */',
  '  badge?: string | number;',
  '  /** Click handler forwarded to the underlying button. */',
  '  onClick?: (event: unknown) => void;',
  '}',
  '',
  'export function BaseButton(properties: ButtonProperties): MpElement {',
  "  const variant = properties.variant ?? 'primary';",
  '  return <button class="button">{properties.children}</button>;',
  '}',
].join('\n');

const GRID = [
  "import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface GridProperties extends MpProperties {',
  '  /** Number of rows. */',
  '  rows?: number;',
  '}',
  '',
  'export function BaseGrid(properties: GridProperties): MpElement {',
  '  const rows = properties.rows ?? 3;',
  '  return <div class="grid">{properties.children}</div>;',
  '}',
].join('\n');

const LAYOUT = [
  "import { h, Slot, type MpChild, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface LayoutProperties extends MpProperties {',
  '  /** Stick the header to the top. */',
  '  sticky?: boolean;',
  '  /** Header content. */',
  '  header?: MpChild;',
  '}',
  '',
  'export function BaseLayout(properties: LayoutProperties): MpElement {',
  '  return (',
  '    <div class="layout">',
  '      <div class="layout__header"><Slot name="header" /></div>',
  '      <main class="layout__content"><Slot /></main>',
  '    </div>',
  '  );',
  '}',
].join('\n');

const badgeNames = { neutralName: 'BaseBadge', publicName: 'Badge', propertiesType: 'BadgeProperties' };
const buttonNames = { neutralName: 'BaseButton', publicName: 'Button', propertiesType: 'ButtonProperties' };
const gridNames = { neutralName: 'BaseGrid', publicName: 'Grid', propertiesType: 'GridProperties' };
const layoutNames = { neutralName: 'BaseLayout', publicName: 'Layout', propertiesType: 'LayoutProperties' };

describe('the Storyblok name helpers', () => {
  it('derives technical (snake_case) names', () => {
    expect(toTechnicalName('Badge')).toBe('badge');
    expect(toTechnicalName('InView')).toBe('in_view');
  });

  it('derives display (spaced) names', () => {
    expect(toDisplayName('Badge')).toBe('Badge');
    expect(toDisplayName('InView')).toBe('In View');
  });
});

describe('emitStoryblokComponent maps the props interface to a blok schema', () => {
  const badge = emitStoryblokComponent(parseTsx('base-badge.tsx', BADGE), badgeNames);

  it('emits a nestable, non-root component object with technical + display names', () => {
    expect(badge.name).toBe('badge');
    expect(badge.display_name).toBe('Badge');
    expect(badge.is_nestable).toBe(true);
    expect(badge.is_root).toBe(false);
    expect(badge.real_name).toBe('badge');
  });

  it('turns string-literal union (type alias) props into option fields with self options', () => {
    expect(badge.schema.variant.type).toBe('option');
    expect(badge.schema.variant.options).toEqual([
      { name: 'default', value: 'default' },
      { name: 'primary', value: 'primary' },
      { name: 'secondary', value: 'secondary' },
    ]);
  });

  it('captures JSDoc as the field description and `?? default` as the default value', () => {
    expect(badge.schema.variant.description).toBe('Visual tone of the badge.');
    expect(badge.schema.variant.default_value).toBe('default');
    expect(badge.schema.size.default_value).toBe('md');
  });

  it('maps boolean props to boolean fields', () => {
    expect(badge.schema.pill.type).toBe('boolean');
  });

  it('exposes the default slot (`children`) as a trailing nestable `bloks` field', () => {
    expect(badge.schema.content.type).toBe('bloks');
    expect(badge.schema.content.pos).toBe(3);
  });
});

describe('emitStoryblokComponent handles primitives and drops callbacks', () => {
  const button = emitStoryblokComponent(parseTsx('base-button.tsx', BUTTON), buttonNames);
  const grid = emitStoryblokComponent(parseTsx('base-grid.tsx', GRID), gridNames);

  it('drops function (callback) props such as `onClick`', () => {
    expect(button.schema.onClick).toBeUndefined();
  });

  it('degrades a `string | number` union to a free-text field', () => {
    expect(button.schema.badge.type).toBe('text');
    expect(button.schema.badge.translatable).toBe(true);
  });

  it('maps number props to number fields and records numeric defaults', () => {
    expect(grid.schema.rows.type).toBe('number');
    expect(grid.schema.rows.default_value).toBe(3);
  });
});

describe('emitStoryblokComponent maps `MpChild` props to named-slot `bloks` fields', () => {
  const layout = emitStoryblokComponent(parseTsx('base-layout.tsx', LAYOUT), layoutNames);

  it('keeps the boolean prop and exposes the `MpChild` prop as `bloks`', () => {
    expect(layout.schema.sticky.type).toBe('boolean');
    expect(layout.schema.header.type).toBe('bloks');
  });

  it('still appends the default-slot `content` bloks field', () => {
    expect(layout.schema.content.type).toBe('bloks');
  });
});

describe('the Vue blok wrapper emitter', () => {
  const analyzed = analyzeStoryblokComponent(parseTsx('base-badge.tsx', BADGE), badgeNames);
  const vue = emitStoryblokBlokWrapper(analyzed, 'Badge', {
    framework: 'vue',
    componentsImport: '@mission-platform/components/vue',
  });

  it('emits a `<script setup>` SFC importing the built component', () => {
    expect(vue).toContain('<script setup lang="ts">');
    expect(vue).toContain("import { Badge } from '@mission-platform/components/vue';");
  });

  it('types the `blok` prop with the precise per-field interface', () => {
    expect(vue).toContain(
      "defineProps<{ blok: SbBlokData & { variant?: 'default' | 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'; pill?: boolean; content?: SbBlokData[] } }>();",
    );
    expect(vue).not.toContain('Record<string, unknown>');
  });

  it('tags the component editable and binds each non-slot field', () => {
    expect(vue).toContain('v-editable="blok"');
    expect(vue).toContain(':variant="blok.variant"');
    expect(vue).toContain(':size="blok.size"');
    expect(vue).toContain(':pill="blok.pill"');
  });

  it('renders the default slot bloks via StoryblokComponent', () => {
    expect(vue).toContain('<StoryblokComponent');
    expect(vue).toContain('v-for="nested in (blok.content as SbBlokData[] | undefined) ?? []"');
    expect(vue).toContain(':blok="nested"');
  });
});

describe('the Vue blok wrapper emitter handles named slots', () => {
  const analyzed = analyzeStoryblokComponent(parseTsx('base-layout.tsx', LAYOUT), layoutNames);
  const vue = emitStoryblokBlokWrapper(analyzed, 'Layout', {
    framework: 'vue',
    componentsImport: '@mission-platform/components/vue',
  });

  it('routes a named-slot bloks field into the matching `<template #name>`', () => {
    expect(vue).toContain('<template #header>');
    expect(vue).toContain('v-for="nested in (blok.header as SbBlokData[] | undefined) ?? []"');
  });
});

describe('the React blok wrapper emitter', () => {
  const analyzed = analyzeStoryblokComponent(parseTsx('base-badge.tsx', BADGE), badgeNames);
  const react = emitStoryblokBlokWrapper(analyzed, 'Badge', {
    framework: 'react',
    componentsImport: '@mission-platform/components/react',
  });

  it('emits a function component importing the built component and Storyblok helpers', () => {
    expect(react).toContain("import { Badge } from '@mission-platform/components/react';");
    expect(react).toContain(
      "import { StoryblokComponent, storyblokEditable, type SbBlokData } from '@storyblok/react';",
    );
    expect(react).toContain('export function BadgeBlok({ blok }: BadgeBlokProperties) {');
  });

  it('types the `blok` prop with the precise per-field interface', () => {
    expect(react).toContain(
      "  blok: SbBlokData & { variant?: 'default' | 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'; pill?: boolean; content?: SbBlokData[] };",
    );
    expect(react).not.toContain('Record<string, unknown>');
  });

  it('spreads `storyblokEditable(blok)` and binds each non-slot field', () => {
    expect(react).toContain('{...storyblokEditable(blok)}');
    expect(react).toContain('variant={blok.variant}');
    expect(react).toContain('pill={blok.pill}');
  });

  it('renders the default slot bloks through the renderBloks helper', () => {
    expect(react).toContain('const renderBloks');
    expect(react).toContain('{renderBloks(blok.content)}');
  });
});

describe('the React blok wrapper emitter handles named slots', () => {
  const analyzed = analyzeStoryblokComponent(parseTsx('base-layout.tsx', LAYOUT), layoutNames);
  const react = emitStoryblokBlokWrapper(analyzed, 'Layout', {
    framework: 'react',
    componentsImport: '@mission-platform/components/react',
  });

  it('passes a named-slot bloks field as a prop of the built component', () => {
    expect(react).toContain('header={renderBloks(blok.header)}');
  });
});

const REQUIRED = [
  "import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';",
  '',
  'export interface RequiredProperties extends MpProperties {',
  '  /** Mandatory heading. */',
  '  heading: string;',
  '  /** Optional subheading. */',
  '  subheading?: string;',
  '}',
  '',
  'export function BaseRequired(properties: RequiredProperties): MpElement {',
  '  return <h1>{properties.heading}</h1>;',
  '}',
].join('\n');

const EMPTY = [
  "import { h, type MpElement } from '@mission-platform/jsx';",
  '',
  'export function BaseEmpty(): MpElement {',
  '  return <hr />;',
  '}',
].join('\n');

const requiredNames = { neutralName: 'BaseRequired', publicName: 'Required', propertiesType: 'RequiredProperties' };
const emptyNames = { neutralName: 'BaseEmpty', publicName: 'Empty', propertiesType: undefined };

describe('emitBlokDataType derives a precise `blok` interface', () => {
  it('maps each field kind to its TypeScript type', () => {
    const badge = analyzeStoryblokComponent(parseTsx('base-badge.tsx', BADGE), badgeNames);
    expect(emitBlokDataType(badge)).toBe(
      "SbBlokData & { variant?: 'default' | 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'; pill?: boolean; content?: SbBlokData[] }",
    );
  });

  it('maps number props and degrades a `string | number` union to `string`', () => {
    const button = analyzeStoryblokComponent(parseTsx('base-button.tsx', BUTTON), buttonNames);
    expect(emitBlokDataType(button)).toBe(
      "SbBlokData & { variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; badge?: string; content?: SbBlokData[] }",
    );
    const grid = analyzeStoryblokComponent(parseTsx('base-grid.tsx', GRID), gridNames);
    expect(emitBlokDataType(grid)).toBe('SbBlokData & { rows?: number; content?: SbBlokData[] }');
  });

  it('renders nestable (`bloks`) fields as `SbBlokData[]`', () => {
    const layout = analyzeStoryblokComponent(parseTsx('base-layout.tsx', LAYOUT), layoutNames);
    expect(emitBlokDataType(layout)).toBe(
      'SbBlokData & { sticky?: boolean; header?: SbBlokData[]; content?: SbBlokData[] }',
    );
  });

  it('keeps non-optional props required (no `?`)', () => {
    const required = analyzeStoryblokComponent(parseTsx('base-required.tsx', REQUIRED), requiredNames);
    expect(emitBlokDataType(required)).toBe('SbBlokData & { heading: string; subheading?: string }');
  });

  it('degrades a field-less component to the bare `SbBlokData`', () => {
    const empty = analyzeStoryblokComponent(parseTsx('base-empty.tsx', EMPTY), emptyNames);
    expect(emitBlokDataType(empty)).toBe('SbBlokData');
  });
});
