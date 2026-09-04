/**
 * End-to-end regression gate for Svelte hyperscript slot markers.
 *
 * Neutral components such as ForgeVerticalLayout compose their slots with
 * `h(Slot, { name: 'start-header' })` rather than direct `<Slot />` JSX. The
 * call form is still a compile-time marker and must never survive as a runtime
 * component reference.
 */
import { describe, expect, it } from 'vitest';

import { forgeSvelteFramework } from '../../../../../compiler/plugins/forge-svelte/src';

import { compileComponentModule } from './compiler-test-helpers';

const SVELTE_FRAMEWORK = forgeSvelteFramework();

const SLOT_SOURCE = `
import { h, Slot } from '@mission-platform/forge-jsx';

export function SlotFixture() {
  return h(
    'section',
    {},
    h(Slot, { name: 'start-header' }),
    h(Slot, {}, h('p', {}, 'Default fallback')),
  );
}
`;

describe('Svelte hyperscript slot regression gate', () => {
  it('lowers default and named h(Slot, ...) calls to snippet renders', () => {
    const compiled = compileComponentModule(SLOT_SOURCE, {
      framework: SVELTE_FRAMEWORK,
      componentName: 'SlotFixture',
    });

    expect(compiled.code).not.toContain('this={Slot}');
    expect(compiled.code).not.toMatch(/\bSlot\b/);
    // Every slot value is normalized to a snippet so primitive `MpChild` values
    // render as escaped text rather than being called (`… is not a function`).
    expect(compiled.code).toContain('{@render __mpSlotValueSnippet(startHeader)}');
    expect(compiled.code).toContain('{@render __mpSlotValueSnippet(children)}');
  });

  it('preserves h(Slot, ...) fallback children when the snippet is absent', () => {
    const compiled = compileComponentModule(SLOT_SOURCE, {
      framework: SVELTE_FRAMEWORK,
      componentName: 'SlotFixture',
    });

    expect(compiled.code).toContain(
      "{#if children != null}{@render __mpSlotValueSnippet(children)}{:else}<p>{'Default fallback'}</p>{/if}",
    );
  });
});
