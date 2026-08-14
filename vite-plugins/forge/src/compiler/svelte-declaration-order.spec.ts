/**
 * End-to-end regression gate for Svelte component initialization order.
 *
 * Neutral setup declarations can seed a later `useState` call. The Svelte
 * output must retain that source order; otherwise `$state(initialView)` runs
 * before `initialView` exists and the component throws in its temporal dead
 * zone during render.
 */
import { describe, expect, it } from 'vitest';

import { forgeSvelteFramework } from '../../../../forge-plugins/forge-svelte/src';

import { compileComponentModule } from './compiler-test-helpers';

const CALENDAR_INITIALIZATION_SOURCE = `
import { useState } from '@mission-platform/forge';

export function ForgeCalendar(properties: { value?: number }) {
  const initialBase = properties.value ?? 1;
  const initialView = initialBase + 1;
  const [view, setView] = useState(initialView);

  return <button onClick={() => setView(view + 1)}>{view}</button>;
}
`;

describe('Svelte declaration-order regression gate', () => {
  it('emits setup prerequisites before a state initializer that reads them', () => {
    const compiled = compileComponentModule(CALENDAR_INITIALIZATION_SOURCE, {
      framework: forgeSvelteFramework(),
      componentName: 'ForgeCalendar',
    });

    const initialBase = compiled.code.indexOf('const initialBase =');
    const initialView = compiled.code.indexOf('const initialView =');
    const state = compiled.code.indexOf('let view = $state(initialView);');

    expect(initialBase).toBeGreaterThan(-1);
    expect(initialView).toBeGreaterThan(initialBase);
    expect(state).toBeGreaterThan(initialView);
  });
});
