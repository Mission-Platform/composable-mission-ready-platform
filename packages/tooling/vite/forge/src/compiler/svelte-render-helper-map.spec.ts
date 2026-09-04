/**
 * End-to-end regression gate for Svelte JSX-returning render helpers whose body
 * is an expression `.map(...)` iteration — including block-bodied callbacks with
 * leading local constants (the ForgeMenu/ForgeMenubar `renderItems` shape).
 *
 * `ForgeTabs` builds its panels through a node-returning render helper:
 *
 *   const renderPanels = (): MpElement[] =>
 *     tabs.map((tab) => <div id={`panel-${tab.id}`}>{panel?.({ tab })}</div>);
 *   return <div>{renderPanels()}</div>;
 *
 * The helper must lower to a `{#snippet renderPanels()}` containing an `{#each}`
 * and be invoked via `{@render renderPanels()}` — never left as a bare
 * `renderPanels()` call against a stripped local (`renderPanels is not defined`).
 *
 * The each-row markup must stay INLINE inside the `{#each}` and must NOT be
 * hoisted into a parameterless top-level `{#snippet}`: the row reads the each
 * local `tab`, and a hoisted parameterless snippet cannot close over it, so
 * hoisting would throw `ReferenceError: tab is not defined` at render time. The
 * render-prop type (`panel?: (context: { tab: Tab }) => MpElement`) must not
 * leak its `tab` type-property name into the hoist-safety top-level set.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { forgeSvelteFramework } from '../../../../../compiler/plugins/forge-svelte/src';

import { compileComponentModule } from './compiler-test-helpers';

const SVELTE_FRAMEWORK = forgeSvelteFramework();
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../../');

function source(relativePath: string): string {
  return readFileSync(path.join(REPOSITORY_ROOT, relativePath), 'utf8');
}

const HELPER_SOURCE = `
import { h, type MpElement, useState } from '@mission-platform/forge-jsx';

interface Tab {
  id: string;
  label: string;
}

interface PanelProperties {
  tabs: Tab[];
  panel?: (context: { tab: Tab }) => MpElement;
}

export function PanelFixture(properties: Readonly<PanelProperties>): MpElement {
  const { tabs } = properties;
  const [activeId] = useState(tabs[0]?.id ?? '');

  const renderPanels = (): MpElement[] =>
    tabs.map((tab) => (
      <div key={tab.id} id={\`panel-\${tab.id}\`} hidden={activeId !== tab.id} role="tabpanel">
        {properties.panel?.({ tab })}
      </div>
    ));

  return <div>{renderPanels()}</div>;
}
`;

const BLOCK_BODIED_MENU_SOURCE = `
import { h, type MpElement } from '@mission-platform/forge-jsx';

type IconDirection = 'left' | 'right' | 'down';

interface MenuNode {
  label: string;
  icon?: string;
  disabled?: boolean;
  href?: string;
  children?: MenuNode[];
}

interface MenuProperties {
  items: MenuNode[];
}

export function MenuFixture(properties: Readonly<MenuProperties>): MpElement {
  const { items } = properties;
  const isPathOpen = (path: string): boolean => path.length > 0;

  const renderIcon = (item: MenuNode): MpElement | undefined =>
    item.icon ? (
      <span aria-hidden="true" className="icon">
        {item.icon}
      </span>
    ) : undefined;

  // ForgeMenu/ForgeMenubar shape: block-bodied .map with leading typed consts,
  // nested helper calls, and recursive renderItems(...).
  const renderItems = (entries: MenuNode[], parentPath: string, nested: boolean): MpElement[] =>
    entries.map((item, index) => {
      const path = parentPath === '' ? \`\${index}\` : \`\${parentPath}.\${index}\`;
      const hasChildren = Boolean(item.children && item.children.length > 0);
      const open = hasChildren && isPathOpen(path);
      // Nested: right when closed, left when open.
      const chevronDirection: IconDirection = nested ? (open ? 'left' : 'right') : open ? 'down' : 'right';
      return (
        <li key={path} role="none" data-direction={chevronDirection}>
          {renderIcon(item)}
          <span>{item.label}</span>
          {open ? (
            <menu role="menu">{renderItems(item.children as MenuNode[], path, true)}</menu>
          ) : undefined}
        </li>
      );
    });

  return <menu role="menubar">{renderItems(items, '', false)}</menu>;
}
`;

describe('Svelte render helper .map regression gate', () => {
  it('lowers a .map render helper to a {#snippet} + {#each} invoked by name', () => {
    const compiled = compileComponentModule(HELPER_SOURCE, {
      framework: SVELTE_FRAMEWORK,
      componentName: 'PanelFixture',
    });

    // The helper is a real snippet, invoked by name — never a stripped local.
    expect(compiled.code).toContain('{#snippet renderPanels()}');
    expect(compiled.code).toContain('{@render renderPanels()}');
    expect(compiled.code).toMatch(/{#each tabs as tab \(tab\.id\)}/);
  });

  it('keeps the each-row inline so the each-local `tab` is never hoisted out of scope', () => {
    const compiled = compileComponentModule(HELPER_SOURCE, {
      framework: SVELTE_FRAMEWORK,
      componentName: 'PanelFixture',
    });

    // The panel <div> reads `tab`; it must live inside `{#each tabs as tab}` and
    // never be lifted into a parameterless hoisted snippet that cannot see it.
    expect(compiled.code).toMatch(/{#each tabs as tab \(tab\.id\)}<div[^]*?panel-\$\{tab\.id\}/);
    // No hoisted (parameterless) snippet body may reference the each-local `tab`.
    // The negative lookahead keeps the scan within a single snippet body so it
    // never bleeds into the legitimate `{#snippet renderPanels()}` each-block.
    expect(compiled.code).not.toMatch(/{#snippet __mpHoist_\d+\(\)}(?:(?!\{\/snippet\}).)*\btab\b/s);
  });

  it('lowers a block-bodied .map helper with typed consts, nested helpers, and recursion', () => {
    // Regression: ForgeMenu/ForgeMenubar use
    //   entries.map((item, index) => { const path = …; return <li/>; })
    // which used to be rejected by isSnippetRenderableMarkup, leaving a bare
    // {renderItems(...)} hole against a stripped local.
    const compiled = compileComponentModule(BLOCK_BODIED_MENU_SOURCE, {
      framework: SVELTE_FRAMEWORK,
      componentName: 'MenuFixture',
    });

    expect(compiled.code).toContain('{#snippet renderItems(entries, parentPath, nested)}');
    expect(compiled.code).toContain('{#snippet renderIcon(item)}');
    expect(compiled.code).toMatch(/{#each entries as item, index/);
    expect(compiled.code).toContain('{@const path =');
    expect(compiled.code).toContain('{@const hasChildren =');
    expect(compiled.code).toContain('{@const open =');
    expect(compiled.code).toContain('{@const chevronDirection =');
    expect(compiled.code).toContain('{@render renderIcon(item)}');
    expect(compiled.code).toContain('{@render renderItems(item.children, path, true)}');
    expect(compiled.code).toContain("{@render renderItems(items, '', false)}");
    expect(compiled.code).not.toMatch(/\{renderItems\(/);
    expect(compiled.code).not.toContain('const renderItems =');
  });

  it('lowers the production ForgeMenu renderItems block-bodied map helper', () => {
    const compiled = compileComponentModule(
      source('packages/ui/components/src/components/molecules/forge-menu/forge-menu.tsx'),
      { framework: SVELTE_FRAMEWORK, componentName: 'ForgeMenu' },
    );

    expect(compiled.code).toContain('{#snippet renderItems(entries, parentPath, nested)}');
    expect(compiled.code).toContain("{@render renderItems(items, '', false)}");
    expect(compiled.code).toContain('{@render renderItems(item.children, path, true)}');
    expect(compiled.code).not.toMatch(/\{renderItems\(/);
  });
});
