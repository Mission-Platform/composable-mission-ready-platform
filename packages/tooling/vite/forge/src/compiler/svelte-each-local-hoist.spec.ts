/**
 * End-to-end regression gate for Svelte static-subtree hoisting.
 *
 * A neutral component that builds a value-position list with
 * `const rows = [<row/>, ...items.map((item) => <row … />)]` and later renders
 * `{rows}` must compile to a Svelte `{#each items as item}` block whose row
 * markup stays *inline*. If the row is lifted into a top-level parameterless
 * `{#snippet}` it closes over the each-local `item`, which does not exist at the
 * component top level, and the story throws
 * `ReferenceError: <local> is not defined` at render time.
 *
 * The specific trigger (regressed `@mission-platform/forms` `ForgeSelect`) was a
 * JSDoc comment on the option interface containing the word "option": the
 * hoist-safety scan treated the commented word as a real top-level binding and
 * wrongly cleared the each-local row for hoisting. This gate compiles the exact
 * shape through the real compiler + Svelte lowering/emission pipeline.
 */
import { describe, expect, it } from 'vitest';

import { forgeSvelteFramework } from '../../../../../compiler/plugins/forge-svelte/src';

import { compileComponentModule } from './compiler-test-helpers';

const SVELTE_FRAMEWORK = forgeSvelteFramework();

const SELECT_SOURCE = `
import { type MpChild } from '@mission-platform/forge';

export interface SelectOption {
  /** The value chosen when the option is selected. */
  label: string;
  value: string;
  /** Disable just this option. */
  disabled?: boolean;
}

export function ForgeSelect(properties: { options?: SelectOption[]; placeholder?: string }) {
  const { options = [], placeholder } = properties;
  const nativeOptions: MpChild[] = [
    <option key="__placeholder__" value="">
      {placeholder}
    </option>,
    ...options.map((option) => (
      <option key={option.value} disabled={option.disabled} value={option.value}>
        {option.label}
      </option>
    )),
  ];
  return <select>{nativeOptions}</select>;
}
`;

/** Every top-level `{#snippet name()}…{/snippet}` body in a Svelte module. */
function topLevelSnippets(code: string): { name: string; body: string }[] {
  const snippets: { name: string; body: string }[] = [];
  const pattern = /\{#snippet\s+([A-Za-z0-9_$]+)\(\)\}([\s\S]*?)\{\/snippet\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code)) !== null) {
    snippets.push({ name: match[1] ?? '', body: match[2] ?? '' });
  }
  return snippets;
}

/** Whether a snippet body reads the each-local `option` without owning an `{#each … as option}`. */
function readsUnboundEachLocal(body: string): boolean {
  const reads = /(?<![.\w<])(?<!<\/)option(?=[.\s)\]}])/.test(body);
  const ownsEach = /\{#each[^}]*\bas\s+option\b/.test(body);
  return reads && !ownsEach;
}

describe('Svelte each-local hoisting regression gate', () => {
  it('does not hoist a `.map` row that closes over an each-local into a top-level snippet', () => {
    const compiled = compileComponentModule(SELECT_SOURCE, {
      framework: SVELTE_FRAMEWORK,
      componentName: 'ForgeSelect',
    });

    const dangling = topLevelSnippets(compiled.code).filter((snippet) => readsUnboundEachLocal(snippet.body));

    expect(dangling.map((snippet) => snippet.name)).toEqual([]);
  });

  it('keeps the each-local row inline under `{#each options as option}`', () => {
    const compiled = compileComponentModule(SELECT_SOURCE, {
      framework: SVELTE_FRAMEWORK,
      componentName: 'ForgeSelect',
    });

    expect(compiled.code).toContain('{#each options as option');
    expect(compiled.code).toMatch(/\{#each options as option[^}]*\}<option/);
  });
});
