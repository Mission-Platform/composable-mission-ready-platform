import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { deriveFlintModuleId } from "./identity.js";
import { parseFlint } from "./parser.js";

describe("Flint flat source modules", () => {
  it("parses file-scoped declarations and keeps source imports separate from capabilities", () => {
    const result = parseFlint(
      'import "./math.flint" as math;\nimport capability "clock.now" as now() -> i64;\nexport fn current() -> i64 { return now(); }',
      "/workspace/app/src/runtime.flint",
      { root: "/workspace/app" },
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module).toMatchObject({
      name: "src/runtime",
      sourceImports: [{ source: "./math.flint", alias: "math" }],
      imports: [{ capability: "clock.now", alias: "now" }],
    });
  });

  it("parses canonical .flintc regions and preserves their source spans", () => {
    const source = `<script>
export struct ButtonProperties { label: string; }
</script>
<template>
  <button>{label}</button>
</template>
<style>
  .button { color: red; }
</style>`;
    const result = parseFlint(source, "/workspace/app/button.flintc");

    expect(result.diagnostics).toEqual([]);
    expect(result.fileKind).toBe("component");
    expect(result.component?.regions.map(({ region }) => region)).toEqual([
      "script",
      "template",
      "style",
    ]);
    expect(result.module).toMatchObject({
      fileKind: "component",
      template: {
        kind: "markup-block",
        root: { kind: "markup-element", tag: "button" },
      },
      styleCompanions: [
        {
          bindingName: "styles",
          classMap: [{ className: "button" }],
        },
      ],
      componentRegions: [
        {
          region: "script",
          content: expect.stringContaining("ButtonProperties"),
        },
        { region: "template", content: expect.stringContaining("<button>") },
        { region: "style", content: expect.stringContaining("color: red") },
      ],
    });
    const template = result.component?.regions.find(
      ({ region }) => region === "template",
    );
    expect(template?.contentSpan.start).toBe(source.indexOf("\n  <button>"));
    expect(template?.span.end).toBe(
      source.indexOf("</template>") + "</template>".length,
    );
  });

  it("skips CSS comment delimiters without corrupting at-rules", () => {
    const result = parseFlint(
      `<script></script>
<template><select class="forge-select" /></template>
<style>
/** The chevron is the write-once; comment contains { and } delimiters. */
@property --forge-select-field-gap { syntax: "*"; inherits: true; }
.forge-select { gap: bind(fieldGap, --forge-select-field-gap); }
</style>`,
      "forge-select.flintc",
    );
    if (result.module === undefined) throw new Error("Expected style module");
    const style = result.module.styleCompanions?.[0];

    expect(result.diagnostics).toEqual([]);
    expect(style?.atRules).toMatchObject([
      { name: "property", prelude: "--forge-select-field-gap" },
    ]);
    expect(style?.rules).toMatchObject([{ selector: ".forge-select" }]);
    expect(style?.rules[0]?.declarations).toMatchObject([
      { property: "gap", binding: { property: "fieldGap" } },
    ]);
  });

  it("uses template markup as the component render root", () => {
    const result = parseFlint(
      `<script>export fn Button() -> Element { return html! { <old /> }; }</script>
<template><button class="new" /></template>
<style>.new { color: red; }</style>`,
      "button.flintc",
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.component?.template?.root).toMatchObject({
      kind: "markup-element",
      tag: "button",
    });
    expect(result.module?.template?.root).toMatchObject({
      kind: "markup-element",
      tag: "button",
    });
  });

  it("preserves authored template text and parses ternary interpolations", () => {
    const source = `<script>export fn Card(enabled: bool) -> Element { return html! { <div /> }; }</script>
<template><p>hello,\n  world {enabled ? "yes" : "no"}</p></template>
<style></style>`;
    const result = parseFlint(source, "card.flintc");
    const paragraph = result.module?.template?.root;

    expect(
      result.diagnostics.filter(({ severity }) => severity === "error"),
    ).toEqual([]);
    if (paragraph?.kind !== "markup-element")
      throw new Error("Expected paragraph element");
    expect(paragraph.children[0]).toMatchObject({
      kind: "markup-text",
      text: "hello,\n  world ",
    });
    expect(paragraph.children[1]).toMatchObject({
      kind: "markup-expression",
      expression: {
        kind: "match",
        value: { kind: "identifier", name: "enabled" },
        arms: [
          { value: { kind: "literal", value: "yes" } },
          { value: { kind: "literal", value: "no" } },
        ],
      },
    });
  });

  it("preserves significant whitespace between text and interpolation nodes", () => {
    const result = parseFlint(
      `<template><p>Hi {a} and {b}!</p><p>{a} {b}</p><p><b>x</b> <i>y</i></p></template>`,
      "whitespace.flintc",
    );
    const paragraphs = result.module?.template?.children;
    expect(paragraphs?.[0]).toMatchObject({
      kind: "markup-element",
      children: [
        { kind: "markup-text", text: "Hi " },
        { kind: "markup-expression" },
        { kind: "markup-text", text: " and " },
        { kind: "markup-expression" },
        { kind: "markup-text", text: "!" },
      ],
    });
    expect(paragraphs?.[1]).toMatchObject({
      kind: "markup-element",
      children: [
        { kind: "markup-expression" },
        { kind: "markup-text", text: " " },
        { kind: "markup-expression" },
      ],
    });
    expect(paragraphs?.[2]).toMatchObject({
      kind: "markup-element",
      children: [
        { kind: "markup-element", tag: "b" },
        { kind: "markup-text", text: " " },
        { kind: "markup-element", tag: "i" },
      ],
    });
  });

  it("parses direct template directives and canonical slot attributes", () => {
    const result = parseFlint(
      `<script>export fn Avatar(show: bool, label: string) -> Element { return html! { <div /> }; }</script>
<template><img #if={show} /><span #elseif={label} /><p #else /><Card #slot:children={{title: label}} /></template>
<style>.avatar { display: block; }</style>`,
      "avatar.flintc",
    );

    expect(
      result.diagnostics.filter(({ severity }) => severity === "error"),
    ).toEqual([]);
    expect(result.module?.template?.children).toMatchObject([
      {
        kind: "markup-conditional",
        condition: { kind: "identifier", name: "show" },
        elseif: [{ condition: { kind: "identifier", name: "label" } }],
        fallback: [{ tag: "p" }],
      },
      {
        kind: "markup-element",
        tag: "Card",
        attributes: [
          {
            kind: "markup-slot-attribute",
            name: "default",
            payload: { kind: "object" },
          },
        ],
      },
    ]);
  });

  describe("Expression parser loops and call chaining", () => {
    const invalidCases = ["f()()", "a.b()(1)", "(g)(1)", "[1, 2](0)"];
    const indexCases = [
      "items[0].label.slice(a, b)",
      "items[0].label.trim().toUpperCase()",
      "items[0].label.trim().length",
    ];

    interface ProbeOutcome {
      readonly expression: string;
      readonly context: "script" | "text" | "attribute";
      readonly errors: readonly {
        readonly code: string;
        readonly start: number;
        readonly end: number;
      }[];
      readonly kind: string | undefined;
      readonly source: string;
    }

    interface EnumProbeOutcome {
      readonly source: string;
      readonly variants: readonly string[];
      readonly errors: readonly {
        readonly code: string;
        readonly start: number;
        readonly end: number;
      }[];
    }

    interface ProbeResult {
      readonly expressions: readonly ProbeOutcome[];
      readonly enums: readonly EnumProbeOutcome[];
    }

    // The loops under test are synchronous, so Vitest timeouts cannot interrupt
    // a regression. Run current parser source in a child process that is killed
    // after 5 seconds, independent of whether this package's dist has been built.
    const parserRoot = fileURLToPath(new URL("..", import.meta.url));
    const probeCacheDir = mkdtempSync(join(tmpdir(), "flint-parser-probe-"));
    afterAll(() => {
      rmSync(probeCacheDir, { recursive: true, force: true });
    });
    const probeScript = `
      import { createServer } from "vite";
      const server = await createServer({
        root: ${JSON.stringify(parserRoot)},
        configFile: false,
        server: { middlewareMode: true },
        appType: "custom",
        logLevel: "silent",
        cacheDir: ${JSON.stringify(probeCacheDir)},
      });
      try {
      const { parseFlint } = await server.ssrLoadModule("/src/index.ts");
      const input = JSON.parse(process.argv[1]);
      const wrap = (context, expression) => {
        const script = context === "script"
          ? "export fn setup() -> i64 { let a: i64 = " + expression + "; return 0; }"
          : "export fn setup() -> i64 { return 0; }";
        const template = context === "text"
          ? "<p>{" + expression + "}</p>"
          : context === "attribute"
            ? '<p title={' + expression + '} id="z"></p>'
            : "<p></p>";
        return "<script>" + script + "</script><template>" + template + "</template><style>.a { color: red; }</style>";
      };
      const expressions = [];
      for (const expression of input.expressions ?? []) {
        for (const context of ["script", "text", "attribute"]) {
          const source = wrap(context, expression);
          const result = parseFlint(source, "probe.flintc");
          const root = result.module?.template?.root;
          let kind;
          if (context === "text") kind = root?.children?.[0]?.expression?.kind;
          if (context === "attribute") kind = root?.attributes?.[0]?.value?.expression?.kind;
          expressions.push({
            expression,
            context,
            source,
            kind,
            errors: result.diagnostics
              .filter((d) => d.severity === "error")
              .map((d) => ({ code: d.code, start: d.span.start, end: d.span.end })),
          });
        }
      }
      const enums = (input.enumSources ?? []).map((source) => {
        const result = parseFlint(source, "enum-probe.flint");
        return {
          source,
          variants: result.module?.enums[0]?.variants.map(({ name }) => name) ?? [],
          errors: result.diagnostics
            .filter((diagnostic) => diagnostic.severity === "error")
            .map(({ code, span }) => ({ code, start: span.start, end: span.end })),
        };
      });
      process.stdout.write(JSON.stringify({ expressions, enums }));
      } finally {
        await server.close();
      }
    `;

    function probe(input: {
      readonly expressions?: readonly string[];
      readonly enumSources?: readonly string[];
    }): ProbeResult {
      const child = spawnSync(
        process.execPath,
        ["--input-type=module", "-e", probeScript, JSON.stringify(input)],
        {
          encoding: "utf8",
          timeout: 5000,
          killSignal: "SIGKILL",
          cwd: parserRoot,
        },
      );
      expect(
        child.error,
        "parser probe hung or failed to start",
      ).toBeUndefined();
      expect(child.status, child.stderr).toBe(0);
      return JSON.parse(child.stdout) as ProbeResult;
    }

    it("terminates and reports spanned errors for calls on non-index expressions", () => {
      const outcomes = probe({ expressions: invalidCases }).expressions;
      expect(outcomes).toHaveLength(invalidCases.length * 3);
      for (const outcome of outcomes) {
        expect(
          outcome.errors.length,
          `${outcome.expression} in ${outcome.context}`,
        ).toBeGreaterThan(0);
        for (const error of outcome.errors) {
          expect(error.end).toBeGreaterThanOrEqual(error.start);
          expect(error.end).toBeLessThanOrEqual(outcome.source.length);
        }
      }
      for (const outcome of outcomes.filter(
        ({ context }) => context !== "script",
      )) {
        expect(
          outcome.errors.map(({ code }) => code),
          `${outcome.expression} in ${outcome.context}`,
        ).toContain(
          outcome.context === "text"
            ? "FLINT-PARSE-MKP-004"
            : "FLINT-PARSE-MKP-008",
        );
      }
    });

    it("parses calls on indexed members without diagnostics", () => {
      const outcomes = probe({ expressions: indexCases }).expressions;
      expect(outcomes).toHaveLength(indexCases.length * 3);
      for (const outcome of outcomes) {
        expect(
          outcome.errors,
          `${outcome.expression} in ${outcome.context}`,
        ).toEqual([]);
        if (outcome.context !== "script") expect(outcome.kind).toBe("index");
      }
    });

    it("parses keyword enum variants and recovers from invalid variant tokens", () => {
      const sources = [
        "enum DefaultVariant { default }",
        "enum DisplayMode { overlay, inline }",
        "enum Recovered { 42, valid }",
      ];
      const outcomes = probe({ enumSources: sources }).enums;

      expect(outcomes).toHaveLength(sources.length);
      expect(outcomes[0]).toMatchObject({
        variants: ["default"],
        errors: [],
      });
      expect(outcomes[1]).toMatchObject({
        variants: ["overlay", "inline"],
        errors: [],
      });
      expect(outcomes[2]?.variants).toContain("valid");
      expect(outcomes[2]?.errors.length).toBeGreaterThan(0);
      for (const outcome of outcomes) {
        for (const error of outcome.errors) {
          expect(error.end).toBeGreaterThanOrEqual(error.start);
          expect(error.end).toBeLessThanOrEqual(outcome.source.length);
        }
      }
    });
  });

  it("preserves unknown hash directive names and their source spans", () => {
    const source = `<script></script><template><button #bogus={enabled} /></template><style></style>`;
    const result = parseFlint(source, "button.flintc");
    const button = result.module?.template?.root;

    expect(
      result.diagnostics.filter(({ severity }) => severity === "error"),
    ).toEqual([]);
    expect(button).toMatchObject({
      kind: "markup-element",
      attributes: [
        {
          kind: "markup-attribute",
          name: "#bogus",
          span: {
            start: source.indexOf("#bogus"),
            end: source.indexOf("}", source.indexOf("#bogus")) + 1,
          },
        },
      ],
    });
  });

  it("continues lowering supported hash directives", () => {
    const result = parseFlint(
      `<script></script><template><section><div #if={visible} /><p #else /><ul><li #for={items} /></ul><Card #slot:x={payload} /></section></template><style></style>`,
      "directives.flintc",
    );

    expect(
      result.diagnostics.filter(({ severity }) => severity === "error"),
    ).toEqual([]);
    expect(result.module?.template?.root).toMatchObject({
      kind: "markup-element",
      tag: "section",
      children: [
        {
          kind: "markup-conditional",
          condition: { kind: "identifier", name: "visible" },
          fallback: [{ kind: "markup-element", tag: "p" }],
        },
        {
          kind: "markup-element",
          tag: "ul",
          children: [{ kind: "markup-for" }],
        },
        {
          kind: "markup-element",
          tag: "Card",
          attributes: [{ kind: "markup-slot-attribute", name: "x" }],
        },
      ],
    });
  });

  it("does not parse non-hash punctuation as markup attributes", () => {
    const result = parseFlint(
      `<script></script><template><button @ , ; ( ) [ ] } . | : # disabled /></template><style></style>`,
      "punctuation.flintc",
    );
    const button = result.module?.template?.root;

    expect(
      result.diagnostics.filter(({ severity }) => severity === "error"),
    ).toEqual([]);
    expect(button).toMatchObject({
      kind: "markup-element",
      attributes: [{ kind: "markup-attribute", name: "disabled" }],
    });
  });

  it("parses iterable template directives with default loop bindings", () => {
    const result = parseFlint(
      `<script>export fn Breadcrumb(items: Item[]) -> Element { return html! { <nav /> }; }
export struct Item { label: string; }</script>
<template><ul><li #for={items}>{item.label}-{index}-{iterable.length}</li></ul></template>
<style>.item { display: block; }</style>`,
      "breadcrumb.flintc",
    );

    expect(
      result.diagnostics.filter(({ severity }) => severity === "error"),
    ).toEqual([]);
    expect(result.module?.template?.children).toMatchObject([
      {
        tag: "ul",
        children: [
          {
            kind: "markup-for",
            items: { kind: "identifier", name: "items" },
            directiveBindings: {
              itemName: "item",
              indexName: "index",
              iterableName: "iterable",
            },
          },
        ],
      },
    ]);
  });

  it("diagnoses brace-wrapped template roots without dropping their children", () => {
    const result = parseFlint(
      `<script></script><template>{<div class="known" />}</template><style>.known { color: red; }</style>`,
      "wrapped.flintc",
    );

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "FLINT-TEMPLATE-001" }),
    );
    expect(result.module?.template?.children).toMatchObject([
      { kind: "markup-element", tag: "div" },
    ]);
  });

  it("rejects component regions in regular .flint files", () => {
    const result = parseFlint(
      "<script>export struct Props { value: i32; }</script>",
      "/workspace/app/button.flint",
    );

    expect(result.fileKind).toBe("module");
    expect(result.component).toBeUndefined();
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("reports missing, duplicate, and out-of-order component regions", () => {
    const duplicate = parseFlint(
      "<script></script><script></script><template></template><style></style>",
      "duplicate.flintc",
    );
    const outOfOrder = parseFlint(
      "<template></template><script></script><style></style>",
      "order.flintc",
    );
    const missing = parseFlint(
      "<script></script><template></template>",
      "missing.flintc",
    );

    expect(duplicate.diagnostics).toContainEqual(
      expect.objectContaining({ code: "FLINT-COMPONENT-004" }),
    );
    expect(outOfOrder.diagnostics).toContainEqual(
      expect.objectContaining({ code: "FLINT-COMPONENT-005" }),
    );
    expect(missing.diagnostics).toContainEqual(
      expect.objectContaining({ code: "FLINT-COMPONENT-006" }),
    );
  });

  it("parses named and namespace source imports", () => {
    const result = parseFlint(
      'import { Item, Item as Alias } from "./items.flint";\nimport * as Module from "./module.flint";',
      "/workspace/app/main.flint",
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.sourceImports).toMatchObject([
      {
        bindingKind: "named",
        bindings: [
          { kind: "named", importedName: "Item", localName: "Item" },
          { kind: "named", importedName: "Item", localName: "Alias" },
        ],
      },
      {
        bindingKind: "namespace",
        bindings: [{ kind: "namespace", localName: "Module" }],
      },
    ]);
  });

  it("rejects default imports and duplicate named locals", () => {
    const result = parseFlint(
      'import Item from "./items.flint";\nimport { A, A as A } from "./items.flint";',
      "invalid-imports.flint",
    );

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "FLINT-PARSE-038" }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "FLINT-PARSE-032" }),
    );
  });

  it("parses css companion rules, at-rules, declarations, and property registrations", () => {
    const result = parseFlint(
      `export fn ForgeButton() -> Element {
        css! {
          @property --forge-button-color { syntax: "<color>"; inherits: true; initial-value: red; }
          .forge-button { color: var(--forge-button-color); }
        }
        return html! { <button /> };
      }`,
      "/workspace/app/forge-button.flint",
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.styleCompanions).toMatchObject([
      {
        propertyRegistrations: ["--forge-button-color"],
        rules: [
          {
            selector: ".forge-button",
            declarations: [
              { property: "color", value: "var(--forge-button-color)" },
            ],
          },
        ],
        atRules: [{ name: "property", prelude: "--forge-button-color" }],
      },
    ]);
  });

  it("builds a nested CSS class map for compile-time styles bindings", () => {
    const result = parseFlint(
      `export fn Button() -> Element {
        let styles = css! {
          .class-a { color: red; .class-b { background: red; } }
        };
        return html! { <button class={styles["class-a"]["class-b"]} /> };
      }`,
      "button.flint",
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.styleCompanions?.[0]).toMatchObject({
      bindingName: "styles",
      classMap: [
        {
          className: "class-a",
          children: [{ className: "class-b", children: [] }],
        },
      ],
      rules: [
        {
          selector: ".class-a",
          children: [{ selector: ".class-b" }],
        },
      ],
    });
  });

  it("diagnoses missing nested CSS class-map members", () => {
    const result = parseFlint(
      `export fn Button() -> Element {
        let styles = css! { .class-a { color: red; } }
        return styles["class-a"]["missing"];
      }`,
      "button.flint",
    );

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FLINT-CSS-001",
        message: "Unknown CSS class reference 'missing'.",
        severity: "warning",
        blocking: false,
      }),
    );
  });

  it("parses typed CSS property bindings and warns for missing static template classes", () => {
    const result = parseFlint(
      `<script>export struct Properties { layoutGap: string; }</script>
<template><div class="known missing" style={style["known"]} /></template>
<style>.known { gap: bind(layoutGap, --mp-layout-gap); }</style>`,
      "binding.flintc",
    );

    expect(
      result.module?.styleCompanions?.[0]?.rules[0]?.declarations[0],
    ).toMatchObject({
      property: "gap",
      value: "bind(layoutGap, --mp-layout-gap)",
      binding: {
        kind: "css-property-binding",
        property: "layoutGap",
        cssVariable: "--mp-layout-gap",
      },
    });
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FLINT-CSS-001",
        message: "Unknown CSS class reference 'missing'.",
        severity: "warning",
        blocking: false,
      }),
    );
  });

  it("retains every CSS binding in a composite declaration", () => {
    const result = parseFlint(
      `<template><div /></template>
<style>.card {
  border: bind(borderWidth, --mp-card-border-width) solid bind(borderColor, --mp-card-border-color);
  content: "bind(notAProperty, --mp-card-content)";
}</style>`,
      "composite-binding.flintc",
    );

    const declaration =
      result.module?.styleCompanions?.[0]?.rules[0]?.declarations[0];
    expect(declaration?.bindings).toMatchObject([
      { property: "borderWidth", cssVariable: "--mp-card-border-width" },
      { property: "borderColor", cssVariable: "--mp-card-border-color" },
    ]);
    expect(declaration?.binding).toMatchObject({ property: "borderWidth" });
    expect(
      result.module?.styleCompanions?.[0]?.rules[0]?.declarations[1]?.bindings,
    ).toBeUndefined();
  });

  it("records exact spans for each binding and leaves unbind calls untouched", () => {
    const source = `<template><div /></template>
<style>.card { border: bind(width, --mp-card-width) solid bind(color, --mp-card-color); content: "bind(text, --mp-card-text)"; value: unbind(value, --mp-card-value); }</style>`;
    const result = parseFlint(source, "binding-spans.flintc");
    const declarations =
      result.module?.styleCompanions?.[0]?.rules[0]?.declarations;
    const border = declarations?.[0];
    const expectedValue =
      "bind(width, --mp-card-width) solid bind(color, --mp-card-color)";
    const firstStart = source.indexOf("bind(width");
    const secondStart = source.indexOf("bind(color");
    expect(border?.value).toBe(expectedValue);
    expect(
      border?.bindings?.map(({ valueStart, valueEnd }) => [
        valueStart,
        valueEnd,
      ]),
    ).toEqual([
      [0, "bind(width, --mp-card-width)".length],
      ["bind(width, --mp-card-width) solid ".length, expectedValue.length],
    ]);
    expect(border?.bindings?.map(({ span }) => [span.start, span.end])).toEqual(
      [
        [firstStart, firstStart + "bind(width, --mp-card-width)".length],
        [secondStart, secondStart + "bind(color, --mp-card-color)".length],
      ],
    );
    expect(declarations?.[2]?.bindings).toBeUndefined();
  });

  it("diagnoses malformed bindings at their exact source span", () => {
    const source = `<template><div /></template>
<style>.card { color: bind(badName-x, --mp-card-color) bind(valid, --mp-card-valid); }</style>`;
    const result = parseFlint(source, "invalid-binding.flintc");
    const malformedStart = source.indexOf("bind(badName-x");
    const malformedEnd = source.indexOf(")", malformedStart) + 1;
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FLINT-CSS-002",
        fileName: "invalid-binding.flintc",
        severity: "error",
        blocking: true,
        span: expect.objectContaining({
          start: malformedStart,
          end: malformedEnd,
        }),
      }),
    );
    expect(
      result.module?.styleCompanions?.[0]?.rules[0]?.declarations[0]
        ?.invalidBindingSpans,
    ).toHaveLength(1);
  });

  it("preserves nested rules and nested at-rules around canonical bindings", () => {
    const result = parseFlint(
      `<script>export struct Properties { layoutGap: string; }</script>
      <template><button /></template>
      <style>
        .button {
          gap: bind(layoutGap, --mp-layout-gap);
          &:hover { color: red; }
          @media (min-width: 40rem) { .icon { display: block; } }
        }
      </style>`,
      "nested-binding.flintc",
    );

    const companion = result.module?.styleCompanions?.[0];
    expect(result.diagnostics).toEqual([]);
    expect(companion?.rules[0]).toMatchObject({
      selector: ".button",
      declarations: [{ value: "bind(layoutGap, --mp-layout-gap)" }],
      children: [
        { selector: "&:hover", declarations: [{ property: "color" }] },
      ],
    });
    expect(companion?.rules[0]?.atRules?.[0]).toMatchObject({
      name: "media",
      prelude: "(min-width: 40rem)",
      rules: [{ selector: ".icon", declarations: [{ property: "display" }] }],
    });
  });

  it("includes classes declared in at-rules nested inside a rule", () => {
    const result = parseFlint(
      `<script></script>
      <template><div class="card"><span class="title" /></div></template>
      <style>.card { @media (min-width: 40rem) { .title { color: red; } } }</style>`,
      "nested-at-rule-class-map.flintc",
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.styleCompanions?.[0]?.classMap).toMatchObject([
      {
        className: "card",
        children: [
          { className: "title", selector: expect.stringContaining(".title") },
        ],
      },
    ]);
  });

  it("reports legacy nested module syntax with a migration hint", () => {
    const result = parseFlint(
      "module legacy { export fn value() -> i32 { return 1; } }",
      "legacy.flint",
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "FLINT-PARSE-001" }),
    );
    expect(
      result.diagnostics.find(({ code }) => code === "FLINT-PARSE-001")?.hint,
    ).toContain("Remove");
  });

  it("normalizes Vite IDs and strips query strings", () => {
    expect(
      deriveFlintModuleId(
        String.raw`C:\workspace\app\src\main.flint?raw`,
        String.raw`C:\workspace\app`,
      ),
    ).toBe("src/main");
  });

  it("parses immutable aggregates, interface bounds, function values, and match arms", () => {
    const result = parseFlint(
      `
      struct Pair<T: Equatable> { first: T; second: i32; }
      enum Maybe<T> { None, Some(value: T), }
      interface Equatable<T> { fn equals(left: T, right: T) -> bool; }
      export fn select<T: Equatable>(value: T) -> i32 {
        return match value { case Some(x) => 1, _ => 0 };
      }
    `,
      "aggregates.flint",
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.structs[0]).toMatchObject({
      name: "Pair",
      immutable: true,
      genericParameters: [{ name: "T", bounds: ["Equatable"] }],
    });
    expect(result.module?.enums[0].variants).toHaveLength(2);
    expect(result.module?.interfaces[0].functions[0].name).toBe("equals");
    expect(result.module?.functions[0].genericParameters[0].name).toBe("T");
  });

  it("reserves record as a declaration keyword", () => {
    const declaration = parseFlint(
      "record EncodedQR { version: i32; size: i32; modules: u32[]; }",
      "record.flint",
    );
    expect(declaration.diagnostics).toEqual([]);
    expect(declaration.module?.structs[0]).toMatchObject({
      name: "EncodedQR",
      record: true,
    });

    const invalidParameter = parseFlint(
      "export fn read(record: u32) -> u32 { return 0; }",
      "reserved-record.flint",
    );
    expect(invalidParameter.diagnostics).toContainEqual(
      expect.objectContaining({ code: "FLINT-PARSE-015" }),
    );
  });

  it("parses qualified enum constructors", () => {
    const result = parseFlint(
      `enum Result<T, E> { Ok(value: T), Error(error: E), }
       export fn create(value: i32) -> Result<i32, string> { return Result::Ok(value); }`,
      "constructors.flint",
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0].body[0]).toMatchObject({
      kind: "return",
      value: {
        kind: "enum-value",
        type: { reference: "Result" },
        variant: "Ok",
        arguments: [{ kind: "identifier", name: "value" }],
      },
    });
  });

  it("preserves member access after an indexed expression", () => {
    const result = parseFlint(
      `struct Item { label: string; }
       export fn label(items: Item[], index: i32) -> string {
         return items[index].label;
       }
       export fn firstLabel(items: Item[]) -> string {
         return items[0].label;
       }`,
      "indexed-member.flint",
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0]?.body[0]).toMatchObject({
      kind: "return",
      value: {
        kind: "index",
        receiver: { kind: "identifier", name: "items" },
        index: { kind: "identifier", name: "index" },
        memberPath: ["label"],
      },
    });
    expect(result.module?.functions[1]?.body[0]).toMatchObject({
      kind: "return",
      value: {
        kind: "index",
        receiver: { kind: "identifier", name: "items" },
        index: { kind: "literal", value: 0 },
        memberPath: ["label"],
      },
    });
  });

  it("preserves calls after indexed member access in script and template expressions", () => {
    const result = parseFlint(
      `<script>
        struct Item { label: string; }
        export fn trimLabel(items: Item[], index: i32) -> string {
          return items[index].label.trim();
        }
        export fn trimFirstLabel(items: Item[]) -> string {
          return items[0].label.trim();
        }
      </script>
      <template>
        <p>{items[0].label.trim()}</p>
        <input title={items[0].label.trim()} />
      </template>
      <style>.root { color: red; }</style>`,
      "indexed-member-call.flintc",
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0]?.body[0]).toMatchObject({
      kind: "return",
      value: {
        kind: "index",
        index: { kind: "identifier", name: "index" },
        memberPath: ["label", "trim"],
        calls: [{ memberPathLength: 2, arguments: [] }],
      },
    });
    expect(result.module?.functions[1]?.body[0]).toMatchObject({
      kind: "return",
      value: {
        kind: "index",
        index: { kind: "literal", value: 0 },
        memberPath: ["label", "trim"],
        calls: [{ memberPathLength: 2, arguments: [] }],
      },
    });
    expect(result.module?.template?.children).toMatchObject([
      {
        kind: "markup-element",
        tag: "p",
        children: [
          {
            kind: "markup-expression",
            expression: {
              kind: "index",
              memberPath: ["label", "trim"],
              calls: [{ memberPathLength: 2, arguments: [] }],
            },
          },
        ],
      },
      {
        kind: "markup-element",
        tag: "input",
        attributes: [
          {
            kind: "markup-attribute",
            name: "title",
            value: {
              kind: "expression",
              expression: {
                kind: "index",
                memberPath: ["label", "trim"],
                calls: [{ memberPathLength: 2, arguments: [] }],
              },
            },
          },
        ],
      },
    ]);
  });

  it("parses pipeline expressions (|>)", () => {
    const result = parseFlint(
      `fn double(x: i32) -> i32 { return x * 2; }
       fn addOne(x: i32) -> i32 { return x + 1; }
       export fn run(x: i32) -> i32 {
         return x |> double |> addOne;
       }`,
      "pipeline.flint",
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[2].body[0]).toMatchObject({
      kind: "return",
      value: {
        kind: "binary",
        operator: "|>",
      },
    });
  });

  it("marks only explicitly typed local declarations in the AST", () => {
    const result = parseFlint(
      `export fn setup() -> unit {
        let inferred = 1;
        let annotated: i32 = inferred;
        return;
      }`,
      "let-types.flint",
    );

    expect(result.diagnostics).toEqual([]);
    const statements = result.module?.functions[0]?.body;
    expect(statements?.[0]).toMatchObject({
      kind: "let",
      name: "inferred",
    });
    expect(statements?.[1]).toMatchObject({
      kind: "let",
      name: "annotated",
      explicitType: true,
    });
    if (statements?.[0]?.kind !== "let") throw new Error("Expected let");
    expect(statements[0].explicitType).toBeUndefined();
  });

  it("parses attribute annotations (@macro, #[repr(...)], #[derive(...)])", () => {
    const result = parseFlint(
      `#[repr(C)]
       struct Point { x: i32; y: i32; }

       #[derive(Clone, Debug)]
       struct Rect { origin: Point; width: i32; height: i32; }

       @inline
       export fn area(r: Rect) -> i32 {
         return r.width * r.height;
       }`,
      "attrs.flint",
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.structs[0].c_struct).toBe(true);
    expect(result.module?.structs[1].attributes).toHaveLength(1);
    expect(result.module?.functions[0].attributes).toHaveLength(1);
  });

  it("parses embedded markup templates and expression interpolations", () => {
    const result = parseFlint(
      `
      export fn IconBell(size: string, color: string) -> Element {
        let sizeValue = 24;
        return html! {
          <div class="icon-bell">
            <svg
              aria-hidden="true"
              height={sizeValue}
              width={sizeValue}
              stroke={color}
              stroke-width={2}
              viewBox="0 0 24 24"
            >
              <use href="#icon-bell" />
            </svg>
          </div>
        };
      }
    `,
      "icon-bell.flint",
    );

    expect(result.diagnostics).toEqual([]);
    const fn = result.module?.functions[0];
    expect(fn).toBeDefined();
    const returnStmt = fn?.body[1];
    expect(returnStmt).toMatchObject({
      kind: "return",
      value: {
        kind: "markup-block",
        root: {
          kind: "markup-element",
          tag: "div",
          tagKind: "element",
          attributes: [
            {
              kind: "markup-attribute",
              name: "class",
              value: { kind: "string", value: "icon-bell" },
            },
          ],
        },
      },
    });
  });

  it("parses slots, dynamic components, and spread attributes", () => {
    const result = parseFlint(
      `
      export fn Card(props: CardProps) -> Element {
        return <Dynamic tag={props.as} class="card" {...props}>
          <Slot name="header" />
          <Slot>{props.children}</Slot>
        </Dynamic>;
      }
    `,
      "card.flint",
    );

    expect(result.diagnostics).toEqual([]);
    const fn = result.module?.functions[0];
    expect(fn).toBeDefined();
    expect(fn?.body[0]).toMatchObject({
      kind: "return",
      value: {
        kind: "markup-block",
        root: {
          kind: "markup-element",
          tag: "Dynamic",
          tagKind: "dynamic",
          attributes: [
            {
              kind: "markup-attribute",
              name: "tag",
            },
            {
              kind: "markup-attribute",
              name: "class",
              value: { kind: "string", value: "card" },
            },
            {
              kind: "markup-spread-attribute",
            },
          ],
          children: [
            {
              kind: "markup-slot",
              name: "header",
            },
            {
              kind: "markup-slot",
              name: "default",
            },
          ],
        },
      },
    });
  });

  it("parses the explicit setup, property, event, and model pipeline", () => {
    const result = parseFlint(
      `
      properties {
        readonly label: string;
        value: string;
      }
      emits {
        changed(value: string);
      }
      model value: string;

      export setup(value: string, label: string) -> string {
        return { display: value };
      }

      event fn onChange(next: string) -> unit {
        return;
      }

      emit fn changed(value: string) -> unit {
        return;
      }
      `,
      "setup-pipeline.flint",
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.propertyConfigurations).toMatchObject([
      {
        properties: [
          { name: "label", readonly: true },
          { name: "value", type: { name: "string" } },
        ],
      },
    ]);
    expect(result.module?.eventConfigurations).toMatchObject([
      { events: [{ name: "changed", parameters: [{ name: "value" }] }] },
    ]);
    expect(result.module?.models).toMatchObject([
      { name: "value", updateEventName: "update:value" },
    ]);
    expect(
      result.module?.functions.map(({ role, name }) => ({ role, name })),
    ).toEqual([
      { role: "setup", name: "setup" },
      { role: "event-handler", name: "onChange" },
      { role: "event-emitter", name: "changed" },
    ]);
  });

  it("reports setup contract mismatches at the declaration source", () => {
    const result = parseFlint(
      `
      properties {
        value: string;
        value: i32;
      }
      export setup(other: i32) -> i32 {
        return other;
      }
      emit fn changed(value: string) -> unit {
        return;
      }
      `,
      "invalid-setup-pipeline.flint",
    );

    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      "FLINT-SETUP-103",
      "FLINT-SETUP-106",
      "FLINT-SETUP-108",
      "FLINT-SETUP-108",
      "FLINT-SETUP-109",
    ]);
    expect(result.diagnostics.every(({ span }) => span.start >= 0)).toBe(true);
  });
});

describe("Flint expression method chains and label for attributes", () => {
  const source = `<script>
properties { id: string; on: bool; }
export setup(id: string, on: bool) -> Element {
  let rootClass: string = ["a", on ? "b" : "", id].filter(Boolean).join(" ");
  return { rootClass: rootClass };
}
</script>
<template><label for={id} class={rootClass}>x</label></template>
<style>.a { color: red; }</style>`;

  it("keeps array literal receivers on chained member calls", () => {
    const result = parseFlint(source, "chain.flintc");
    expect(result.diagnostics).toEqual([]);
    const setup = result.module?.functions.find(({ role }) => role === "setup");
    const rootClass = setup?.body.find(
      (statement) => statement.kind === "let" && statement.name === "rootClass",
    );
    expect(rootClass).toMatchObject({
      kind: "let",
      value: {
        kind: "call",
        callee: "join",
        receiver: {
          kind: "call",
          callee: "filter",
          arguments: [{ kind: "identifier", name: "Boolean" }],
          receiver: { kind: "array-literal" },
        },
      },
    });
  });

  it("keeps a bare for attribute as an attribute and only #for as a loop", () => {
    const result = parseFlint(source, "chain.flintc");
    const template = JSON.stringify(result.module);
    expect(template).not.toContain('"kind":"markup-for"');
    expect(template).toContain('"name":"for"');
    const looped = parseFlint(
      "<template><ul #for={items}><li>{item}</li></ul></template>",
      "loop.flintc",
    );
    expect(JSON.stringify(looped.module)).toContain('"kind":"markup-for"');
  });

  it("preserves arguments in identifier-rooted chained calls", () => {
    const source =
      'export fn Test() -> unit { let value = items.filter(Boolean).join(","); let chained = a.b(1).c(2); return; }';
    const result = parseFlint(source, "identifier-chain.flint");
    const fn = result.module?.functions.find(({ name }) => name === "Test");
    const value = fn?.body.find(
      (statement) => statement.kind === "let" && statement.name === "value",
    );
    const chained = fn?.body.find(
      (statement) => statement.kind === "let" && statement.name === "chained",
    );

    expect(result.diagnostics).toEqual([]);
    expect(value).toMatchObject({
      value: {
        kind: "call",
        callee: "join",
        arguments: [{ kind: "literal", value: "," }],
        receiver: {
          kind: "call",
          callee: "items.filter",
          arguments: [{ kind: "identifier", name: "Boolean" }],
        },
      },
    });
    expect(chained).toMatchObject({
      value: {
        kind: "call",
        callee: "c",
        arguments: [{ kind: "literal", value: 2 }],
        receiver: {
          kind: "call",
          callee: "a.b",
          arguments: [{ kind: "literal", value: 1 }],
        },
      },
    });
  });

  it.each([
    ["[1, 2].length", "length"],
    ["(a + b).x", "x"],
    ["[1].map(f).length", "length"],
    ["a.b(1).c", "c"],
    ["f(1).x", "x"],
  ])("reports bounded member access for %s", (expression, member) => {
    const source = `export fn Test() -> unit { let value = ${expression}; return; }`;
    const result = parseFlint(source, "unsupported-member.flint");
    const diagnostic = result.diagnostics.find(
      ({ code }) => code === "FLINT-PARSE-127",
    );
    const memberStart = source.indexOf(`.${member}`) + 1;

    expect(diagnostic).toMatchObject({
      code: "FLINT-PARSE-127",
      severity: "error",
      blocking: true,
      phase: "parse",
      span: {
        start: memberStart,
        end: memberStart + member.length,
      },
    });
    expect(source.slice(diagnostic?.span.start, diagnostic?.span.end)).toBe(
      member,
    );
  });
});
