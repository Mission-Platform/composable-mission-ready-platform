import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeCommandPalette } from './forge-command-palette';

import type { CommandPaletteCommand } from './forge-command-palette';

const ReactCommandPalette = toReactComponent(ForgeCommandPalette, 'CommandPalette');
const VueCommandPalette = toVueComponent(ForgeCommandPalette, 'CommandPalette');

const commands: CommandPaletteCommand[] = [
  { id: 'open', label: 'Open project', description: 'Open a saved project', shortcut: '⌘ O' },
  { id: 'settings', label: 'Settings', group: 'Navigate' },
];

describe('ForgeCommandPalette authors the same component for React and Vue', () => {
  it('renders an accessible open command list on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactCommandPalette, { commands, modelValue: true, open: true, label: 'Commands' }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueCommandPalette, { commands, modelValue: true, open: true, label: 'Commands' }),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-label="Commands"');
      expect(html).toContain('role="listbox"');
      expect(html).toContain('Open project');
      expect(html).toContain('Settings');
      expect(html).toContain('⌘ O');
    }
  });

  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(createElement(ReactCommandPalette, { commands, modelValue: false, open: false }));
    expect(html).not.toContain('role="dialog"');
  });

  it('exposes an expanded combobox and unique list ids for multiple instances', () => {
    const first = renderToStaticMarkup(createElement(ReactCommandPalette, { commands, modelValue: true, open: true }));
    const second = renderToStaticMarkup(createElement(ReactCommandPalette, { commands, modelValue: true, open: true }));

    expect(first).toContain('role="combobox"');
    expect(first).toContain('aria-expanded="true"');
    const firstListId = first.match(/aria-controls="([^"]+)"/)?.[1];
    const secondListId = second.match(/aria-controls="([^"]+)"/)?.[1];
    expect(firstListId).toBeDefined();
    expect(secondListId).toBeDefined();
    expect(firstListId).not.toBe(secondListId);
  });

  it('supports grouped, limited, and loading command results', () => {
    const html = renderToStaticMarkup(
      createElement(ReactCommandPalette, {
        commands: [
          { id: 'one', label: 'First', group: 'Projects' },
          { id: 'two', label: 'Second', group: 'Projects' },
        ],
        modelValue: true,
        groups: [{ id: 'Projects', label: 'Projects' }],
        maxResults: 1,
        open: true,
      }),
    );

    expect(html).toContain('Projects');
    expect(html).toContain('First');
    expect(html).not.toContain('Second');

    const loading = renderToStaticMarkup(
      createElement(ReactCommandPalette, {
        commands,
        modelValue: true,
        loading: true,
        open: true,
      }),
    );
    expect(loading).toContain('role="status"');
  });

  it('advertises the Cmd/Ctrl-K global shortcut', () => {
    const html = renderToStaticMarkup(createElement(ReactCommandPalette, { commands, modelValue: false }));
    expect(html).toContain('⌘/Ctrl K');
  });
});

afterEach(() => {
  document.body.replaceChildren();
});
