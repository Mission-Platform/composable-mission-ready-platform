/**
 * Repo-wide Vue **template render-safety** audit — a standing regression gate.
 *
 * Both checks here catch output that reads plausibly, compiles cleanly, and then
 * throws out of the render function in the browser — the failure mode a
 * substring assertion cannot see.
 *
 * The emitter drops the neutral consts the markup consumes structurally: a
 * children-derived const becomes `<slot />`, a markup-producing const is inlined
 * where it is used. A template that still *reads* such a const compiles to a
 * `_ctx.<name>` lookup — Vue's fallback for an identifier no binding declares —
 * which is `undefined` at render time. That failure is silent in every test that
 * only inspects the emitted text, and fatal in the browser: reading
 * `_ctx.childList.length` throws out of the render function and the component
 * renders nothing at all (`ForgeBackgroundVideo` shipped exactly this way).
 *
 * So the first check compiles every neutral component to Vue, runs the real
 * `compileScript` with the template inlined — the same production shape the
 * build emits — and fails on any `_ctx.<name>` that is not one of Vue's own
 * `$`-prefixed instance properties (`$attrs`, `$slots`, …).
 *
 * The second check covers the mirror-image mistake: interpolating a **VNode**.
 * `{{ variantIcon(variant) }}` hands the element to `toDisplayString`, which
 * JSON-serialises its circular structure and throws (`ForgeAlertBanner` and
 * `ForgeToast` both shipped that way); such a call belongs in a
 * `<component :is>` host.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { compileScript, parse } from 'vue/compiler-sfc';

import { forgeVueFramework } from '../../../../forge-plugins/forge-vue/src';

import { compileComponentModule } from './compiler-test-helpers';

const COMPONENTS_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/components/src/components',
);

const VUE_FRAMEWORK = forgeVueFramework();

/** Convert a kebab-case component folder to its PascalCase exported name. */
function pascalCase(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Every `{atoms,molecules,organisms,templates}/<name>/<name>.tsx` neutral component source. */
function discoverComponents(): { name: string; source: string }[] {
  const found: { name: string; source: string }[] = [];
  for (const group of ['atoms', 'molecules', 'organisms', 'templates']) {
    const groupDirectory = path.join(COMPONENTS_ROOT, group);
    let entries: string[];
    try {
      entries = readdirSync(groupDirectory);
    } catch {
      continue;
    }
    for (const name of entries) {
      const componentDirectory = path.join(groupDirectory, name);
      if (!statSync(componentDirectory).isDirectory()) {
        continue;
      }
      try {
        found.push({ name, source: readFileSync(path.join(componentDirectory, `${name}.tsx`), 'utf8') });
      } catch {
        // Not a `<name>/<name>.tsx` component folder — skip.
      }
    }
  }
  return found;
}

/**
 * The identifiers a compiled SFC reaches through `_ctx` — Vue's fallback for a
 * name no binding declares. Its own `$`-prefixed instance properties are the
 * legitimate uses and are excluded.
 */
function danglingBindings(code: string, componentName: string): string[] {
  const parsed = parse(code, { filename: `${componentName}.vue` });
  const [error] = parsed.errors;
  if (error !== undefined) {
    throw new Error(`${componentName}.vue does not parse: ${error.message}\n\n${code}`);
  }
  // `inlineTemplate` compiles the template into `setup`, which is the shape the
  // production build emits — and the shape in which an unresolved identifier
  // shows up as a `_ctx` read.
  const compiled = compileScript(parsed.descriptor, { id: componentName, inlineTemplate: true });
  const names = new Set<string>();
  for (const [, name] of compiled.content.matchAll(/\b_ctx\.([A-Za-z_$][\w$]*)/g)) {
    if (name !== undefined && !name.startsWith('$')) {
      names.add(name);
    }
  }
  return [...names];
}

/**
 * The node-returning functions a compiled SFC declares — the return annotation
 * of a `function` declaration or of a const-bound arrow.
 */
function nodeReturningFunctions(code: string): Set<string> {
  const names = new Set<string>();
  const returnType = String.raw`(?:MpChild|MpChildren|MpElement|MpNode|MpRenderProperty)`;
  for (const [, name] of code.matchAll(
    new RegExp(String.raw`function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*:\s*${returnType}\b`, 'g'),
  )) {
    if (name !== undefined) {
      names.add(name);
    }
  }
  for (const [, name] of code.matchAll(
    new RegExp(String.raw`const\s+([A-Za-z_$][\w$]*)\s*=\s*\([^)]*\)\s*:\s*${returnType}\b\s*=>`, 'g'),
  )) {
    if (name !== undefined) {
      names.add(name);
    }
  }
  return names;
}

/** The `{{ … }}` interpolations that call one of the SFC's node-returning functions. */
function interpolatedNodes(code: string): string[] {
  const template = /<template>([\s\S]*?)<\/template>/.exec(code)?.[1] ?? '';
  const functions = nodeReturningFunctions(code);
  const found = new Set<string>();
  for (const [whole, expression] of template.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    for (const name of functions) {
      if (new RegExp(String.raw`(?<![\w$.])${name}\s*\(`).test(expression ?? '')) {
        found.add(whole.trim());
      }
    }
  }
  return [...found];
}

describe('Vue template render-safety audit (no template throws out of its render function)', () => {
  const components = discoverComponents();

  it('discovers the component library', () => {
    // A sanity check so a broken path can never make the gate vacuously pass.
    expect(components.length).toBeGreaterThan(50);
  });

  it('no compiled component reads an identifier the script never declares', () => {
    const dangling: Record<string, string[]> = {};
    for (const { name, source } of components) {
      const componentName = pascalCase(name);
      const compiled = compileComponentModule(source, { framework: VUE_FRAMEWORK, componentName });
      const unresolved = danglingBindings(compiled.code, componentName);
      if (unresolved.length > 0) {
        dangling[name] = unresolved;
      }
    }
    expect(dangling).toEqual({});
  }, 60_000);

  it('no compiled component interpolates a node-returning call', () => {
    const interpolated: Record<string, string[]> = {};
    for (const { name, source } of components) {
      const compiled = compileComponentModule(source, { framework: VUE_FRAMEWORK, componentName: pascalCase(name) });
      const hits = interpolatedNodes(compiled.code);
      if (hits.length > 0) {
        interpolated[name] = hits;
      }
    }
    expect(interpolated).toEqual({});
  }, 60_000);
});
