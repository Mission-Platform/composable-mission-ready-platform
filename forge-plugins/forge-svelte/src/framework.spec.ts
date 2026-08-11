import { MP_STATIC_ATTR } from "@mission-platform/forge-plugin-api/compiler/optimize.js";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vitest";

import {
  booleanAttribute,
  component,
  dynamicNode,
  element,
  expressionAttribute,
  expressionChild,
  listKey,
  moduleImport,
  prop,
  semanticModule,
  slot,
  statement,
  stringAttribute,
  textChild,
} from "./ir-test-helpers.js";

import {
  emitSvelteHookModule,
  emitSvelteModule,
  forgeSvelteFramework,
} from ".";

import type {
  GeneratedModule,
  SemanticModule,
  TargetContext,
} from "@mission-platform/forge-plugin-api";

const NEUTRAL = "@mission-platform/forge";

function context(parts: Partial<TargetContext> = {}): TargetContext {
  return {
    framework: "svelte",
    moduleKind: "component",
    componentName: "Fixture",
    componentFolders: new Set(),
    ...parts,
  };
}

/** Drive the plugin end to end: `lower` → `optimize` → `generate`. */
function generate(
  module: SemanticModule,
  parts: Partial<TargetContext> = {},
): GeneratedModule {
  const framework = forgeSvelteFramework();
  const target = context(parts);
  const lowered = framework.lower(module, target);
  const optimized = framework.optimize(lowered, { neutral: {} });
  return framework.generate(optimized, target);
}

/** The `<script>` block of a generated `.svelte` module. */
function script(code: string): string {
  return code.slice(code.indexOf(">") + 1, code.indexOf("</script>"));
}

/** The markup that follows the `<script>` block. */
function markup(code: string): string {
  return code.slice(code.indexOf("</script>") + "</script>".length).trim();
}

function expectCompiles(code: string): void {
  expect(() => compile(code, { filename: "fixture.svelte" })).not.toThrow();
}

describe("Svelte Forge framework package", () => {
  it("exposes separate Vite and Rolldown compiler bundles", () => {
    const framework = forgeSvelteFramework();
    expect(framework.id).toBe("svelte");
    expect(framework.outputLanguage).toBe("svelte");
    expect(framework.build.vite?.({})).toHaveLength(1);
    expect(framework.build.tsdown?.({})).toHaveLength(1);
  });

  it("lowers state, derived values and effects into runes", () => {
    const button = element("button", {
      attributes: [expressionAttribute("onClick", "() => setCount(count + 1)")],
      children: [expressionChild("doubled")],
      source: "<button onClick={() => setCount(count + 1)}>{doubled}</button>",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [
          statement("const [count, setCount] = useState(0);"),
          statement("const doubled = useMemo(() => count * 2, [count]);"),
          statement(
            "useEffect(() => { document.title = String(count); }, [count]);",
            "expression",
          ),
        ],
        returned: { expression: button.expression!.text, nodes: [button] },
      }),
    });

    const generated = generate(module);

    expect(script(generated.code)).toContain("let count = $state(0);");
    expect(script(generated.code)).toContain(
      "const doubled = $derived.by(() => count * 2);",
    );
    expect(script(generated.code)).toContain(
      "$effect(() => { document.title = String(count); });",
    );
    expect(markup(generated.code)).toBe(
      "<button onclick={() => count = count + 1}>{doubled}</button>",
    );
    expectCompiles(generated.code);
  });

  it("folds destructured defaults into the $props() contract and types it", () => {
    const section = element("section", {
      attributes: [expressionAttribute("className", "variant")],
      children: [textChild("body")],
      source: "<section className={variant}>body</section>",
    });
    const module = semanticModule({
      declarations: [
        statement(
          "interface FixtureProperties {\n  variant?: string;\n}",
          "interface",
          {
            name: "FixtureProperties",
            exported: true,
          },
        ),
      ],
      component: component({
        name: "Fixture",
        parameter: "properties",
        parameterType: "Readonly<FixtureProperties>",
        body: [statement("const { variant = 'neutral' } = properties;")],
        returned: { expression: section.expression!.text, nodes: [section] },
      }),
      props: [prop("variant", { type: "string" })],
    });

    const generated = generate(module);

    expect(script(generated.code)).toContain("interface FixtureProperties");
    expect(script(generated.code)).toContain(
      "let { variant = 'neutral', children }: Readonly<FixtureProperties> = $props();",
    );
    expect(markup(generated.code)).toBe(
      "<section class={variant}>body</section>",
    );
    expectCompiles(generated.code);
  });

  it("renders slots as snippet props and presence checks as null comparisons", () => {
    const marker = element("Slot", {
      selfClosing: true,
      attributes: [stringAttribute("name", "footer")],
      source: '<Slot name="footer" />',
    });
    const host = element("section", {
      children: [
        expressionChild("hasSlot('footer') && <Slot name=\"footer\" />", [
          marker,
        ]),
      ],
      source:
        "<section>{hasSlot('footer') && <Slot name=\"footer\" />}</section>",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        returned: { expression: host.expression!.text, nodes: [host] },
      }),
      slots: [slot("footer")],
    });

    const generated = generate(module);

    expect(script(generated.code)).toContain(
      "let { footer, children } = $props();",
    );
    expect(markup(generated.code)).toBe(
      "<section>{#if footer != null}{@render footer?.()}{/if}</section>",
    );
    expectCompiles(generated.code);
  });

  it("binds refs with bind:this and lowers event handlers to Svelte 5 attributes", () => {
    const input = element("input", {
      selfClosing: true,
      attributes: [
        expressionAttribute("ref", "inputRef"),
        expressionAttribute(
          "onChange",
          "(event) => properties.onChange?.(event)",
        ),
        expressionAttribute("disabled", "inputRef.current === null"),
      ],
      source:
        "<input ref={inputRef} onChange={(event) => properties.onChange?.(event)} disabled={inputRef.current === null} />",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [statement("const inputRef = useRef<HTMLInputElement>(null);")],
        returned: { expression: input.expression!.text, nodes: [input] },
      }),
    });

    const generated = generate(module);

    expect(script(generated.code)).toContain(
      "let inputRef = $state<HTMLInputElement>();",
    );
    expect(markup(generated.code)).toBe(
      "<input bind:this={inputRef} onchange={(event) => onChange?.(event)} disabled={inputRef === null} />",
    );
    expectCompiles(generated.code);
  });

  it("lowers a function-typed useRef to a reassignable $state cell", () => {
    // Regression: the type argument of `useRef<(() => void) | undefined>(…)`
    // opens a parenthesis before the call's own argument list, which used to
    // hide the `useRef` call — the binding stayed a `const` and every later
    // assignment made Svelte reject the module with `constant_assignment`.
    const host = element("div", {
      children: [expressionChild("label")],
      source: "<div>{label}</div>",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [
          statement(
            "const disposeReference = useRef<(() => void) | undefined>(undefined);",
          ),
          statement("const label = properties.label;"),
          statement(
            "useEffect(() => { disposeReference.current?.(); disposeReference.current = attach().dispose; }, []);",
            "expression",
          ),
        ],
        returned: { expression: host.expression!.text, nodes: [host] },
      }),
      props: [prop("label")],
    });

    const generated = generate(module);

    expect(script(generated.code)).toContain(
      "let disposeReference = $state<(() => void)>();",
    );
    expect(script(generated.code)).not.toContain("const disposeReference");
    // The `.current` indirection still collapses onto the bare cell.
    expect(script(generated.code)).toContain("disposeReference?.()");
    expect(script(generated.code)).toContain(
      "disposeReference = attach().dispose;",
    );
    expectCompiles(generated.code);
  });

  it("keeps a nested generic ref type intact", () => {
    const host = element("div", { selfClosing: true, source: "<div />" });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [
          statement(
            "const cacheReference = useRef<Map<string, Array<number>> | null>(null);",
          ),
        ],
        returned: { expression: host.expression!.text, nodes: [host] },
      }),
    });

    expect(script(generate(module).code)).toContain(
      "let cacheReference = $state<Map<string, Array<number>>>();",
    );
  });

  it("lowers a dynamic component marker to <svelte:component>", () => {
    const marker = element("Dynamic", {
      selfClosing: true,
      attributes: [
        expressionAttribute("is", "Icon"),
        stringAttribute("aria-hidden", "true"),
      ],
      source: '<Dynamic is={Icon} aria-hidden="true" />',
    });
    const module = semanticModule({
      imports: [
        moduleImport("import { Icon } from './icon';", "./icon", {
          valueNames: ["Icon"],
        }),
      ],
      component: component({
        name: "Fixture",
        parameter: "properties",
        returned: { expression: marker.expression!.text, nodes: [marker] },
      }),
      dynamicNodes: [dynamicNode("Icon")],
    });

    const generated = generate(module);

    expect(markup(generated.code)).toBe(
      '<svelte:component this={Icon} aria-hidden="true" />',
    );
    expect(script(generated.code)).toContain("import { Icon } from './icon';");
  });

  it("lowers a mapped list to a keyed {#each} block", () => {
    const item = element("li", {
      attributes: [expressionAttribute("key", "row.id")],
      children: [expressionChild("row.label")],
      source: "<li key={row.id}>{row.label}</li>",
    });
    const list = element("ul", {
      children: [
        expressionChild(
          "rows.map((row) => <li key={row.id}>{row.label}</li>)",
          [item],
        ),
      ],
      source: "<ul>{rows.map((row) => <li key={row.id}>{row.label}</li>)}</ul>",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [statement("const rows = properties.rows;")],
        returned: { expression: list.expression!.text, nodes: [list] },
      }),
      props: [prop("rows")],
    });

    const generated = generate(module);

    expect(markup(generated.code)).toBe(
      "<ul>{#each rows as row (row.id)}<li>{row.label}</li>{/each}</ul>",
    );
    expectCompiles(generated.code);
  });

  it("renders an optional-chained iteration as an {#each} over a coalesced list", () => {
    // Regression: `tokens?.map(…)` puts the optional-chaining `?` on the target
    // side of the `.map`, so the list expression used to be printed as
    // `tokens?` — a dangling operator Svelte rejects with `js_parse_error`.
    const item = element("MarkdownInline", {
      selfClosing: true,
      attributes: [
        expressionAttribute("key", "index"),
        expressionAttribute("token", "child"),
      ],
      source: "<MarkdownInline key={index} token={child} />",
    });
    const host = element("strong", {
      children: [
        expressionChild(
          "token.tokens?.map((child, index) => <MarkdownInline key={index} token={child} />)",
          [item],
        ),
      ],
      source:
        "<strong>{token.tokens?.map((child, index) => <MarkdownInline key={index} token={child} />)}</strong>",
    });
    const module = semanticModule({
      imports: [
        moduleImport(
          "import { MarkdownInline } from './markdown-inline';",
          "./markdown-inline",
          {
            valueNames: ["MarkdownInline"],
          },
        ),
      ],
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [statement("const token = properties.token;")],
        returned: { expression: host.expression!.text, nodes: [host] },
      }),
      props: [prop("token")],
    });

    const generated = generate(module);

    expect(markup(generated.code)).toBe(
      "<strong>{#each token.tokens ?? [] as child, index (index)}<MarkdownInline token={child} />{/each}</strong>",
    );
    expect(markup(generated.code)).not.toContain("tokens?");
    expectCompiles(generated.code);
  });

  it("carries an exported interface and a multi-line named import into the script", () => {
    const host = element("section", {
      children: [expressionChild("rows.length")],
      source: "<section>{rows.length}</section>",
    });
    const module = semanticModule({
      imports: [
        moduleImport(
          "import {\n  formatCell,\n  type CellValue,\n  normalizeRow,\n} from './table-utils';",
          "./table-utils",
          {
            valueNames: ["formatCell", "normalizeRow"],
            typeNames: ["CellValue"],
          },
        ),
      ],
      declarations: [
        statement(
          "export interface FixtureProperties {\n  /** The rows to render. */\n  rows: readonly CellValue[];\n}",
          "interface",
          { name: "FixtureProperties", exported: true },
        ),
      ],
      component: component({
        name: "Fixture",
        parameter: "properties",
        parameterType: "Readonly<FixtureProperties>",
        body: [statement("const rows = properties.rows;")],
        returned: { expression: host.expression!.text, nodes: [host] },
      }),
      props: [prop("rows", { type: "readonly CellValue[]" })],
    });

    const generated = generate(module);

    expect(script(generated.code)).toContain(
      "export interface FixtureProperties",
    );
    expect(script(generated.code)).toContain("} from './table-utils';");
    expect(script(generated.code)).toContain(
      "let { rows, children }: Readonly<FixtureProperties> = $props();",
    );
    expectCompiles(generated.code);
  });

  it("uses an inferred stable key when the element declares none", () => {
    const item = element("li", {
      children: [expressionChild("row.label")],
      source: "<li>{row.label}</li>",
    });
    const list = element("ul", {
      children: [
        expressionChild("rows.map((row) => <li>{row.label}</li>)", [item]),
      ],
      source: "<ul>{rows.map((row) => <li>{row.label}</li>)}</ul>",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        returned: { expression: list.expression!.text, nodes: [list] },
      }),
      listKeys: [listKey("rows", "row.id", true)],
    });

    expect(markup(generate(module).code)).toContain(
      "{#each rows as row (row.id)}",
    );
  });

  it("hoists a static subtree into a snippet rendered at its use site", () => {
    const banner = element("header", {
      attributes: [
        booleanAttribute(MP_STATIC_ATTR),
        stringAttribute("class", "banner"),
      ],
      children: [textChild("Mission")],
      source: '<header class="banner">Mission</header>',
    });
    const root = element("section", {
      children: [banner, expressionChild("label")],
      source:
        '<section><header class="banner">Mission</header>{label}</section>',
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [statement("const label = properties.label;")],
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
      props: [prop("label")],
    });

    const generated = generate(module);

    expect(markup(generated.code)).toContain(
      '{#snippet __mpHoist_0()}<header class="banner">Mission</header>{/snippet}',
    );
    expect(markup(generated.code)).toContain(
      "<section>{@render __mpHoist_0()}{label}</section>",
    );
    // The neutral marker name never reaches generated markup.
    expect(generated.code).not.toContain("__mpStatic");
    expect(markup(generated.code)).not.toMatch(
      new RegExp(`<[^>]*${MP_STATIC_ATTR}`),
    );
    expectCompiles(generated.code);
  });

  it("flattens a sibling component import to its generated .svelte module", () => {
    const child = element("ForgeTypography", {
      selfClosing: true,
      attributes: [stringAttribute("variant", "body")],
      source: '<ForgeTypography variant="body" />',
    });
    const module = semanticModule({
      imports: [
        moduleImport(
          "import { ForgeTypography, type TypographyVariant } from '../forge-typography';",
          "../forge-typography",
          { valueNames: ["ForgeTypography"], typeNames: ["TypographyVariant"] },
        ),
      ],
      component: component({
        name: "Fixture",
        parameter: "properties",
        returned: { expression: child.expression!.text, nodes: [child] },
      }),
    });

    const generated = generate(module, {
      componentFolders: new Set(["forge-typography"]),
    });

    expect(script(generated.code)).toContain(
      "import ForgeTypography from './forge-typography.svelte';",
    );
    expect(script(generated.code)).toContain(
      "import type { TypographyVariant } from './forge-typography.svelte';",
    );
  });

  it("redirects the neutral JSX types to the co-located module and keeps runtime values", () => {
    const root = element("div", {
      attributes: [
        expressionAttribute("className", "classNames('root', { active })"),
      ],
      children: [],
      source: "<div className={classNames('root', { active })} />",
      selfClosing: true,
    });
    const module = semanticModule({
      imports: [
        moduleImport(
          "import { classNames, type MpElement, type MpRenderProperty } from '@mission-platform/forge';",
          NEUTRAL,
          {
            valueNames: ["classNames"],
            typeNames: ["MpElement", "MpRenderProperty"],
          },
        ),
      ],
      declarations: [
        statement(
          "interface FixtureProperties {\n  active?: boolean;\n  renderItem?: MpRenderProperty<{ value: string }>;\n}",
          "interface",
          { name: "FixtureProperties" },
        ),
      ],
      component: component({
        name: "Fixture",
        parameter: "properties",
        parameterType: "Readonly<FixtureProperties>",
        body: [statement("const active = properties.active;")],
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
      props: [prop("active")],
    });

    const generated = generate(module);

    expect(script(generated.code)).toContain(
      "import { classNames } from '@mission-platform/forge';",
    );
    expect(script(generated.code)).toContain(
      "import type { MpRenderProperty } from './mp-jsx-types';",
    );
    expect(script(generated.code)).not.toContain("MpElement");
    // The props interface inherits nothing and carries no catch-all key.
    expect(script(generated.code)).toContain("interface FixtureProperties {");
    expect(generated.code).not.toContain("extends MpProperties");
    expect(generated.code).not.toContain("[key: string]:");
    expect(markup(generated.code)).toBe("<div class={['root', { active }]} />");
  });

  it("folds an early return into a leading {#if} branch", () => {
    const empty = element("p", {
      children: [textChild("Nothing")],
      source: "<p>Nothing</p>",
    });
    const filled = element("ul", {
      children: [],
      source: "<ul />",
      selfClosing: true,
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [
          statement(
            "if (properties.rows.length === 0) return <p>Nothing</p>;",
            "other",
            {
              renderNodes: [empty],
            },
          ),
        ],
        returned: { expression: filled.expression!.text, nodes: [filled] },
      }),
    });

    const generated = generate(module);

    expect(markup(generated.code)).toBe(
      "{#if rows.length === 0}<p>Nothing</p>{:else}<ul />{/if}",
    );
    expectCompiles(generated.code);
  });

  it("emits a hook module as plain TypeScript with rewritten imports", () => {
    const module = semanticModule({
      moduleKind: "composable",
      fileName: "use-counter.ts",
      imports: [
        moduleImport(
          "import { hasSlot, useState } from '@mission-platform/forge';",
          NEUTRAL,
          {
            valueNames: ["hasSlot", "useState"],
          },
        ),
        moduleImport(
          "import { MapContext } from '../components/map-context';",
          "../components/map-context",
          {
            valueNames: ["MapContext"],
          },
        ),
      ],
      declarations: [
        statement(
          "export function useCounter(): number {\n  const [count] = useState(0);\n  return count;\n}",
          "function",
          { name: "useCounter", exported: true },
        ),
      ],
    });

    const generated = generate(module, { moduleKind: "composable" });

    expect(generated.lang).toBe("ts");
    expect(generated.code).toContain(
      "import { useState } from '@mission-platform/forge';",
    );
    expect(generated.code).not.toContain("hasSlot");
    expect(generated.code).toContain(
      "import { MapContext } from './map-context';",
    );
    expect(generated.code).toContain("export function useCounter(): number {");
  });

  it("lowers HtmlContent to Svelte raw HTML markup", () => {
    const node = element("HtmlContent", {
      selfClosing: true,
      attributes: [
        expressionAttribute("html", "properties.markup"),
        stringAttribute("className", "host"),
        stringAttribute("aria-label", "trusted"),
      ],
      source:
        '<HtmlContent html={properties.markup} className="host" aria-label="trusted" />',
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        returned: { expression: node.expression!.text, nodes: [node] },
      }),
    });

    const generated = generate(module);

    expect(markup(generated.code)).toBe(
      '<div class="host" aria-label="trusted">{@html markup}</div>',
    );
    expect(markup(generated.code)).not.toContain("<HtmlContent");
    expectCompiles(generated.code);
  });

  it("aliases a computed local that shares a prop name", () => {
    const root = element("div", {
      selfClosing: true,
      attributes: [expressionAttribute("aria-label", "labels.toolbar")],
      source: "<div aria-label={labels.toolbar} />",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [statement("const labels = resolveLabels(properties.labels);")],
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
    });

    const generated = generate(module);

    expect(script(generated.code)).toContain(
      "let { labels: labelsProp, children } = $props();",
    );
    expect(script(generated.code)).toContain(
      "const labels = resolveLabels(labelsProp);",
    );
    expectCompiles(generated.code);
  });

  it("emits directly from a module without a pre-computed plan", () => {
    const root = element("span", {
      children: [textChild("direct")],
      source: "<span>direct</span>",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
    });

    expect(emitSvelteModule(module, "Fixture").code).toContain(
      "<span>direct</span>",
    );
  });

  it("emits an empty hook module for a module with nothing to carry over", () => {
    expect(
      emitSvelteHookModule(semanticModule({ moduleKind: "composable" })),
    ).toBe("");
  });
});
