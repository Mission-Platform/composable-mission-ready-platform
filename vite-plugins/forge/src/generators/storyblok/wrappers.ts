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

/** Render a SolidJS blok wrapper module for an analysed component. */
function emitSolidBlokWrapper(
  analyzed: AnalyzedStoryblokComponent,
  publicName: string,
  componentsImport: string,
): string {
  const slots = analyzed.fields.filter((entry) => entry.isSlot);
  // Solid props are reactive — read `properties.blok.<field>` at the use site
  // (never destructure), mirroring the React binding otherwise.
  const propertyBindings = analyzed.fields
    .filter((entry) => !entry.isSlot)
    .map((entry) => `      ${entry.prop}={properties.blok.${entry.prop}}`);

  const defaultSlot = slots.find((entry) => entry.slotName === 'default');
  const namedSlots = slots.filter((entry) => entry.slotName !== 'default');
  const namedSlotBindings = namedSlots.map((slot) => `      ${slot.prop}={renderBloks(properties.blok.${slot.prop})}`);

  const openingProperties = [`      {...storyblokEditable(properties.blok)}`, ...propertyBindings, ...namedSlotBindings];

  const body =
    defaultSlot === undefined
      ? [`    <${publicName}`, ...openingProperties, `    />`]
      : [
          `    <${publicName}`,
          ...openingProperties,
          `    >`,
          `      {renderBloks(properties.blok.${defaultSlot.prop})}`,
          `    </${publicName}>`,
        ];

  const lines = [
    `import { For } from 'solid-js';`,
    `import { StoryblokComponent, storyblokEditable, type SbBlokData } from '@storyblok/solid';`,
    ``,
    `import { ${publicName} } from '${componentsImport}';`,
    ``,
    `export interface ${publicName}BlokProperties {`,
    `  blok: ${emitBlokDataType(analyzed)};`,
    `}`,
    ``,
  ];

  if (slots.length > 0) {
    // Solid's `<For>` keys the nested bloks by identity for stable reconciliation.
    lines.push(
      `const renderBloks = (items: unknown) =>`,
      `  Array.isArray(items) ? (`,
      `    <For each={items as SbBlokData[]}>{(nested) => <StoryblokComponent blok={nested} />}</For>`,
      `  ) : null;`,
      ``,
    );
  }

  lines.push(
    `export function ${publicName}Blok(properties: ${publicName}BlokProperties) {`,
    `  return (`,
    ...body,
    `  );`,
    `}`,
    ``,
  );

  return lines.join('\n');
}

/** Render a `{#each}` loop of `<StoryblokComponent>` for a Svelte wrapper's `bloks` field. */
function svelteBlokEach(field: string, indent: string): string[] {
  return [
    `${indent}{#each (blok.${field} ?? []) as nested (nested._uid)}`,
    `${indent}  <StoryblokComponent blok={nested} />`,
    `${indent}{/each}`,
  ];
}

/** Render a Svelte 5 blok wrapper SFC for an analysed component. */
function emitSvelteBlokWrapper(
  analyzed: AnalyzedStoryblokComponent,
  publicName: string,
  componentsImport: string,
): string {
  const propertyBindings = analyzed.fields
    .filter((entry) => !entry.isSlot)
    .map((entry) => `      ${entry.prop}={blok.${entry.prop}}`);

  const slots = analyzed.fields.filter((entry) => entry.isSlot);
  const defaultSlot = slots.find((entry) => entry.slotName === 'default');
  const namedSlots = slots.filter((entry) => entry.slotName !== 'default');

  const children: string[] = [];
  // Named slots are passed as Svelte 5 snippet props; the default slot renders
  // its bloks as the component's direct children.
  for (const slot of namedSlots) {
    children.push(
      `      {#snippet ${slot.slotName}()}`,
      ...svelteBlokEach(slot.prop, '        '),
      `      {/snippet}`,
    );
  }
  if (defaultSlot !== undefined) {
    children.push(...svelteBlokEach(defaultSlot.prop, '      '));
  }

  const componentTag =
    children.length === 0
      ? [`    <${publicName}`, ...propertyBindings, `    />`]
      : [`    <${publicName}`, ...propertyBindings, `    >`, ...children, `    </${publicName}>`];

  return [
    `<script lang="ts">`,
    `  import { StoryblokComponent, storyblokEditable, type SbBlokData } from '@storyblok/svelte';`,
    ``,
    `  import { ${publicName} } from '${componentsImport}';`,
    ``,
    `  const { blok }: { blok: ${emitBlokDataType(analyzed)} } = $props();`,
    `</script>`,
    ``,
    // `storyblokEditable` is a Svelte action; it attaches to an element, so the
    // component is wrapped in a `display: contents` host that adds no layout box.
    `<div use:storyblokEditable={blok} style="display: contents;">`,
    ...componentTag,
    `</div>`,
    ``,
  ].join('\n');
}

/** Render a native Web-Component blok wrapper module for an analysed component. */
function emitWebComponentBlokWrapper(
  analyzed: AnalyzedStoryblokComponent,
  publicName: string,
  componentsImport: string,
): string {
  const nonSlotFields = analyzed.fields.filter((entry) => !entry.isSlot);
  const slots = analyzed.fields.filter((entry) => entry.isSlot);
  const technicalName = analyzed.component.name;

  const propertyAssignments = nonSlotFields.map(
    (entry) => `    (element as Record<string, unknown>).${entry.prop} = blok.${entry.prop};`,
  );

  const slotAppends = slots.map((entry) => {
    const slotAttribute = entry.slotName === 'default' ? '' : `, '${entry.slotName}'`;
    return `    appendBloks(element, blok.${entry.prop}${slotAttribute});`;
  });

  return [
    // Side-effect import registers every built custom element (`<base-…>`).
    `import '${componentsImport}';`,
    `import { storyblokEditable, type SbBlokData } from '@storyblok/js';`,
    ``,
    `import { ${publicName} } from '${componentsImport}';`,
    ``,
    `export interface ${publicName}BlokProperties {`,
    `  blok: ${emitBlokDataType(analyzed)};`,
    `}`,
    ``,
    // Nested bloks render through their own `<technical>-blok` wrapper element,
    // registered by this same entry; a named slot sets the `slot` attribute.
    `function appendBloks(host: HTMLElement, items: unknown, slot?: string): void {`,
    `  if (!Array.isArray(items)) {`,
    `    return;`,
    `  }`,
    `  for (const nested of items as SbBlokData[]) {`,
    '    const child = document.createElement(`${nested.component}-blok`) as HTMLElement & { blok?: SbBlokData };',
    `    child.blok = nested;`,
    `    if (slot !== undefined) {`,
    `      child.setAttribute('slot', slot);`,
    `    }`,
    `    host.append(child);`,
    `  }`,
    `}`,
    ``,
    // The wrapper is itself a custom element: assign `.blok`, and it renders the
    // built component with fields as properties + Storyblok's editable attributes.
    `export class ${publicName}Blok extends HTMLElement {`,
    `  #blok?: ${emitBlokDataType(analyzed)};`,
    ``,
    `  set blok(value: ${emitBlokDataType(analyzed)}) {`,
    `    this.#blok = value;`,
    `    this.render();`,
    `  }`,
    ``,
    `  get blok(): ${emitBlokDataType(analyzed)} | undefined {`,
    `    return this.#blok;`,
    `  }`,
    ``,
    `  connectedCallback(): void {`,
    `    this.render();`,
    `  }`,
    ``,
    `  private render(): void {`,
    `    const blok = this.#blok;`,
    `    if (blok === undefined) {`,
    `      return;`,
    `    }`,
    `    const element = new ${publicName}();`,
    ...propertyAssignments,
    `    for (const [name, value] of Object.entries(storyblokEditable(blok))) {`,
    `      element.setAttribute(name, String(value));`,
    `    }`,
    ...slotAppends,
    `    this.replaceChildren(element);`,
    `  }`,
    `}`,
    ``,
    `if (customElements.get('${technicalName}-blok') === undefined) {`,
    `  customElements.define('${technicalName}-blok', ${publicName}Blok);`,
    `}`,
    ``,
  ].join('\n');
}

/**
 * Emit the framework blok wrapper source that binds Storyblok's `blok` prop onto
 * the built framework component: a React/Solid `.tsx` module, a Vue/Svelte SFC,
 * or a native Web-Component (`.ts`) custom element.
 */
export function emitStoryblokBlokWrapper(
  analyzed: AnalyzedStoryblokComponent,
  publicName: string,
  options: StoryblokBlokWrapperOptions,
): string {
  switch (options.framework) {
    case 'react': {
      return emitReactBlokWrapper(analyzed, publicName, options.componentsImport);
    }
    case 'solid': {
      return emitSolidBlokWrapper(analyzed, publicName, options.componentsImport);
    }
    case 'svelte': {
      return emitSvelteBlokWrapper(analyzed, publicName, options.componentsImport);
    }
    case 'web-components': {
      return emitWebComponentBlokWrapper(analyzed, publicName, options.componentsImport);
    }
    default: {
      return emitVueBlokWrapper(analyzed, publicName, options.componentsImport);
    }
  }
}
