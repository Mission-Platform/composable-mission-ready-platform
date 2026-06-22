/**
 * Framework blok-wrapper emitters for the Storyblok target.
 *
 * Alongside the blok configuration (see `analyze.ts`), each neutral component
 * gets a thin framework wrapper — a React `.tsx` module or a Vue `.vue` SFC —
 * that takes Storyblok's `blok` prop, forwards each schema field to the matching
 * prop of the **built** framework component (imported from the package's
 * `./react` / `./vue` subpath), tags it editable (`storyblokEditable(blok)` /
 * `v-editable="blok"`), and renders each `bloks` field through
 * `StoryblokComponent`.
 */
import type { AnalyzedField, AnalyzedStoryblokComponent } from './types.js';
import type { JsxFramework } from '../../compiler/compile.js';

/** Options for {@link emitStoryblokBlokWrapper}. */
export interface StoryblokBlokWrapperOptions {
  /** The framework the wrapper targets. */
  framework: JsxFramework;
  /** Import specifier the wrapper imports the built component from (e.g. `@scope/pkg/vue`). */
  componentsImport: string;
}

/** Map an analysed field to the TypeScript type its `blok` value carries. */
function fieldDataType(entry: AnalyzedField): string {
  if (entry.isSlot) {
    return 'SbBlokData[]';
  }
  switch (entry.field.type) {
    case 'boolean': {
      return 'boolean';
    }
    case 'number': {
      return 'number';
    }
    case 'option': {
      const options = entry.field.options ?? [];
      return options.length > 0 ? options.map((option) => `'${option.value}'`).join(' | ') : 'string';
    }
    default: {
      return 'string';
    }
  }
}

/**
 * Build the typed `blok` prop type for a wrapper — `SbBlokData & { … }` with one
 * member per analysed schema field (literal-union `option`s, `SbBlokData[]` for
 * nestable `bloks`), so consumers get a precise interface instead of an open
 * `SbBlokData & Record<string, unknown>`. A field-less component degrades to the
 * bare `SbBlokData`.
 */
export function emitBlokDataType(analyzed: AnalyzedStoryblokComponent): string {
  if (analyzed.fields.length === 0) {
    return 'SbBlokData';
  }
  const members = analyzed.fields.map((entry) => {
    const optional = entry.field.required === true ? '' : '?';
    return `${entry.prop}${optional}: ${fieldDataType(entry)}`;
  });
  return `SbBlokData & { ${members.join('; ')} }`;
}

/** Render a `<StoryblokComponent v-for=…>` loop binding a Vue wrapper's `bloks` field. */
function vueBlokSlotLoop(field: string): string {
  return [
    `      <StoryblokComponent`,
    `        v-for="nested in (blok.${field} as SbBlokData[] | undefined) ?? []"`,
    `        :key="nested._uid"`,
    `        :blok="nested"`,
    `      />`,
  ].join('\n');
}

/** Render a Vue blok wrapper SFC for an analysed component. */
function emitVueBlokWrapper(
  analyzed: AnalyzedStoryblokComponent,
  publicName: string,
  componentsImport: string,
): string {
  const propertyBindings = analyzed.fields
    .filter((entry) => !entry.isSlot)
    .map((entry) => `    :${entry.prop}="blok.${entry.prop}"`);

  const defaultSlot = analyzed.fields.find((entry) => entry.isSlot && entry.slotName === 'default');
  const namedSlots = analyzed.fields.filter((entry) => entry.isSlot && entry.slotName !== 'default');

  const children: string[] = [];
  if (defaultSlot !== undefined) {
    children.push(vueBlokSlotLoop(defaultSlot.prop));
  }
  for (const slot of namedSlots) {
    children.push(`      <template #${slot.slotName}>`, vueBlokSlotLoop(slot.prop), `      </template>`);
  }

  const openingTagLines = [`    v-editable="blok"`, ...propertyBindings];
  const opening =
    children.length === 0
      ? [`  <${publicName}`, ...openingTagLines, `  />`]
      : [`  <${publicName}`, ...openingTagLines, `  >`, ...children, `  </${publicName}>`];

  return [
    `<script setup lang="ts">`,
    `import type { SbBlokData } from '@storyblok/vue';`,
    ``,
    `import { ${publicName} } from '${componentsImport}';`,
    ``,
    `defineProps<{ blok: ${emitBlokDataType(analyzed)} }>();`,
    `</script>`,
    ``,
    `<template>`,
    ...opening,
    `</template>`,
    ``,
  ].join('\n');
}

/** Render a React blok wrapper module for an analysed component. */
function emitReactBlokWrapper(
  analyzed: AnalyzedStoryblokComponent,
  publicName: string,
  componentsImport: string,
): string {
  const slots = analyzed.fields.filter((entry) => entry.isSlot);
  const propertyBindings = analyzed.fields
    .filter((entry) => !entry.isSlot)
    .map((entry) => `      ${entry.prop}={blok.${entry.prop}}`);

  const defaultSlot = slots.find((entry) => entry.slotName === 'default');
  const namedSlots = slots.filter((entry) => entry.slotName !== 'default');

  // Named slots map onto props of the built component; the default slot is the
  // wrapper element's children.
  const namedSlotBindings = namedSlots.map((slot) => `      ${slot.prop}={renderBloks(blok.${slot.prop})}`);

  const openingProperties = [`      {...storyblokEditable(blok)}`, ...propertyBindings, ...namedSlotBindings];

  const body =
    defaultSlot === undefined
      ? [`    <${publicName}`, ...openingProperties, `    />`]
      : [
          `    <${publicName}`,
          ...openingProperties,
          `    >`,
          `      {renderBloks(blok.${defaultSlot.prop})}`,
          `    </${publicName}>`,
        ];

  const lines = [
    `import { createElement as h } from 'react';`,
    `import { StoryblokComponent, storyblokEditable, type SbBlokData } from '@storyblok/react';`,
    ``,
    `import { ${publicName} } from '${componentsImport}';`,
    ``,
    `export interface ${publicName}BlokProperties {`,
    `  blok: ${emitBlokDataType(analyzed)};`,
    `}`,
    ``,
  ];

  if (slots.length > 0) {
    lines.push(
      `const renderBloks = (items: unknown): unknown =>`,
      `  Array.isArray(items)`,
      `    ? items.map((nested: SbBlokData) => <StoryblokComponent blok={nested} key={nested._uid} />)`,
      `    : null;`,
      ``,
    );
  }

  lines.push(
    `export function ${publicName}Blok({ blok }: ${publicName}BlokProperties) {`,
    `  return (`,
    ...body,
    `  );`,
    `}`,
    ``,
  );

  return lines.join('\n');
}

/**
 * Emit the framework blok wrapper source (a React `.tsx` module or a Vue `.vue`
 * SFC) that binds Storyblok's `blok` prop onto the built framework component.
 */
export function emitStoryblokBlokWrapper(
  analyzed: AnalyzedStoryblokComponent,
  publicName: string,
  options: StoryblokBlokWrapperOptions,
): string {
  return options.framework === 'react'
    ? emitReactBlokWrapper(analyzed, publicName, options.componentsImport)
    : emitVueBlokWrapper(analyzed, publicName, options.componentsImport);
}
