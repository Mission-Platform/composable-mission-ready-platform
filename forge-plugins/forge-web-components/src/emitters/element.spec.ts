import { describe, expect, it } from "vitest";

import {
  booleanAttribute,
  component,
  effect,
  element,
  elementRef,
  expressionAttribute,
  expressionChild,
  memo,
  prop,
  semanticModule,
  state,
  statement,
  textChild,
} from "../ir-test-helpers.ts";
import {
  lowerWebComponentsPlan,
  type WebComponentsLoweredModule,
} from "../lower.ts";
import { optimizeWebComponentsPlan } from "../optimize.ts";

import { synthesiseElementClass } from "./element.ts";

import type { SemanticModule } from "@mission-platform/forge-plugin-api";

const NO_FOLDERS: ReadonlySet<string> = new Set();

/** Lower a fixture module into the plan the printer consumes. */
function lower(
  module: SemanticModule,
  name = "ForgeFixture",
): WebComponentsLoweredModule {
  return lowerWebComponentsPlan(module, {
    framework: "web-components",
    moduleKind: module.moduleKind,
    componentName: name,
    componentFolders: NO_FOLDERS,
  });
}

function synthesise(module: SemanticModule, name = "ForgeFixture"): string {
  return synthesiseElementClass(lower(module, name));
}

/** The component's own props interface, retained beside the generated class. */
const BUTTON_PROPERTIES = statement(
  [
    "export interface ButtonProperties {",
    "  variant?: Variant;",
    "  disabled?: boolean;",
    "}",
  ].join("\n"),
  "interface",
  { name: "ButtonProperties", exported: true },
);

/** Print the plan the pipeline would hand the emitter, optimizations included. */
function synthesiseOptimized(
  module: SemanticModule,
  name = "ForgeFixture",
): string {
  return synthesiseElementClass(
    optimizeWebComponentsPlan(lower(module, name), { neutral: {} }),
  );
}

describe("the element class synthesis", () => {
  it("emits an empty element when the module has no component", () => {
    const source = synthesise(semanticModule({}), "ForgeEmpty");

    expect(source).toContain(
      "export class ForgeEmptyElement extends ForgeElement {",
    );
    expect(source).toContain("return html`<slot></slot>`;");
    expect(source).toContain(
      "customElements.define('forge-empty', ForgeEmptyElement);",
    );
  });

  it("types a reactive property from its declared prop type", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span", {
            children: [expressionChild("properties.label")],
          }),
        }),
        props: [prop("label", "string")],
      }),
    );

    expect(source).toContain("  declare label: string;");
    expect(source).toContain("    label: {},");
    expect(source).toContain("return html`<span>${this.label}</span>`;");
  });

  it("widens an optional prop with undefined", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span"),
        }),
        props: [prop("variant", "'solid' | 'ghost'", true)],
      }),
    );

    expect(source).toContain(
      "  declare variant: 'solid' | 'ghost' | undefined;",
    );
  });

  it("falls back to unknown for a prop with no declared type", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span", {
            attributes: [expressionAttribute("title", "properties.hint")],
          }),
        }),
      }),
    );

    // Discovered from the render tree rather than declared, so it has no type.
    expect(source).toContain("  declare hint: unknown;");
  });

  it("annotates each property against the component own props interface", () => {
    const source = synthesise(
      semanticModule({
        declarations: [BUTTON_PROPERTIES],
        component: component({
          name: "ForgeButton",
          parameter: "properties",
          parameterType: "ButtonProperties",
          returnNode: element("button", {
            attributes: [expressionAttribute("title", "properties.variant")],
            children: [expressionChild("properties.disabled")],
          }),
        }),
      }),
      "ForgeButton",
    );

    expect(source).toContain("  declare variant: ButtonProperties['variant'];");
    expect(source).toContain(
      "  declare disabled: ButtonProperties['disabled'];",
    );
    expect(source).not.toContain("unknown");
    expect(source).not.toMatch(/\bany\b/u);
  });

  it("annotates the static properties map with the runtime contract", () => {
    const source = synthesise(
      semanticModule({
        declarations: [BUTTON_PROPERTIES],
        component: component({
          name: "ForgeButton",
          parameter: "properties",
          parameterType: "ButtonProperties",
          returnNode: element("button", {
            attributes: [expressionAttribute("title", "properties.variant")],
          }),
        }),
        state: [
          state("open", "setOpen", {
            inferredType: "boolean",
            initializer: "false",
          }),
        ],
      }),
      "ForgeButton",
    );

    // Not the props type: `ForgeElement` declares the member as
    // `Record<string, PropertyDeclaration>` and the values are descriptors.
    expect(source).toContain(
      "  static readonly properties: Record<string, PropertyDeclaration> = {",
    );
    expect(source).toContain("    variant: {},");
    expect(source).toContain("    open: { state: true },");
    expect(source).not.toContain(
      "static readonly properties: ButtonProperties",
    );
  });

  it("seeds a lifted useId field once per element instance", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeField",
          parameter: "properties",
          body: [statement("const generatedId = useId();")],
          returnNode: element("input", {
            attributes: [expressionAttribute("id", "generatedId")],
          }),
        }),
      }),
      "ForgeField",
    );

    expect(source).toContain("  readonly generatedId: string;");
    expect(source).toContain("    this.generatedId = useId();");
    // A field initializer, never a render-head statement.
    expect(source).not.toContain("    const generatedId = useId();");
    expect(source).toContain(
      "return html`<input id=${this.generatedId}></input>`;",
    );
  });

  it("never declares the slotted children prop", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("div", {
            children: [expressionChild("properties.children")],
          }),
        }),
        props: [prop("children", "MpChild", true)],
      }),
    );

    expect(source).not.toContain("children:");
    expect(source).toContain("${this.children}");
  });

  it("types a state field from an explicit useState type argument", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [statement("const [mode, setMode] = useState<Mode>('idle');")],
          returnNode: element("span"),
        }),
        state: [
          state("mode", "setMode", { type: "Mode", initializer: "'idle'" }),
        ],
      }),
    );

    expect(source).toContain("  declare mode: Mode;");
    expect(source).toContain("    this.mode = 'idle';");
    expect(source).toContain("    mode: { state: true },");
  });

  it("types a state field from a declared variable type when useState carries none", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span"),
        }),
        state: [
          state("label", "setLabel", {
            type: "string | undefined",
            initializer: "undefined",
          }),
        ],
      }),
    );

    expect(source).toContain("  declare label: string | undefined;");
  });

  it("types a state field from its literal initializer", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span"),
        }),
        state: [
          state("open", "setOpen", {
            inferredType: "boolean",
            initializer: "false",
          }),
          state("count", "setCount", {
            inferredType: "number",
            initializer: "0",
          }),
          state("rows", "setRows", {
            inferredType: "unknown[]",
            initializer: "[]",
          }),
        ],
      }),
    );

    expect(source).toContain("  declare open: boolean;");
    expect(source).toContain("    this.open = false;");
    expect(source).toContain("  declare count: number;");
    expect(source).toContain("    this.count = 0;");
    expect(source).toContain("  declare rows: unknown[];");
    expect(source).toContain("    this.rows = [];");
  });

  it("falls back to unknown for untyped state and widens an unseeded cell", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span"),
        }),
        state: [
          state("payload", "setPayload", { initializer: "buildPayload()" }),
          state("selection", "setSelection", { type: "Selection" }),
        ],
      }),
    );

    expect(source).toContain("  declare payload: unknown;");
    expect(source).toContain("    this.payload = buildPayload();");
    expect(source).toContain("  declare selection: Selection | undefined;");
  });

  it("declares a state/property name collision once, as the reactive property", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement("const [label, setLabel] = useState(properties.label);"),
          ],
          returnNode: element("span", { children: [expressionChild("label")] }),
        }),
        props: [prop("label", "string")],
        state: [
          state("label", "setLabel", { initializer: "properties.label" }),
        ],
      }),
    );

    expect(source.match(/^\s+(?:declare\s+)?label:/gmu)).toHaveLength(2); // the static entry + the field
    expect(source).toContain("    label: {},");
    expect(source).not.toContain("label: { state: true }");
    expect(source).toContain("  declare label: string;");
  });

  it("keeps the render head but drops hook declarations, returns and no-ops", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement("const [open, setOpen] = useState(false);"),
            statement("void properties;", "expression"),
            statement("const heading = properties.label.toUpperCase();"),
            statement("return <span />;", "return"),
          ],
          returnNode: element("span", {
            children: [expressionChild("heading")],
          }),
        }),
        props: [prop("label", "string")],
        state: [
          state("open", "setOpen", {
            inferredType: "boolean",
            initializer: "false",
          }),
        ],
      }),
    );

    expect(source).toContain("    const heading = this.label.toUpperCase();");
    expect(source).not.toContain("useState");
    expect(source).not.toContain("void properties;");
    expect(source).not.toContain("return <span />;");
  });

  it("hoists a fully static return tree to a module-level template", () => {
    const source = synthesiseOptimized(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          returnNode: element("span", {
            attributes: [booleanAttribute("__mpStatic")],
            children: [textChild("static")],
          }),
        }),
      }),
    );

    expect(source).toContain(
      "const __mpStaticTpl_0 = html`<span>static</span>`;",
    );
    expect(source).toContain("    return __mpStaticTpl_0;");
  });

  it("prints derived getters, ref cells and lifecycle callbacks", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span"),
        }),
        props: [prop("items", "readonly string[]")],
        memos: [memo("total", "() => items.length", ["items"])],
        refs: [elementRef("wrapper", "HTMLElement | null", "null")],
        effects: [effect("() => { start(); }", "() => stop()")],
      }),
    );

    expect(source).toContain(
      "  readonly wrapper: { current: HTMLElement | null };",
    );
    expect(source).toContain("    this.wrapper = { current: null };");
    expect(source).toContain(
      "  __mpCleanup0: (() => void) | undefined = undefined;",
    );
    expect(source).toContain("  get total() {");
    expect(source).toContain("    return this.items.length;");
    expect(source).toContain("  connectedCallback() {");
    expect(source).toContain("    super.connectedCallback();");
    expect(source).toContain("    this.__mpCleanup0 = (() => { start(); })();");
    expect(source).toContain("  disconnectedCallback() {");
    expect(source).toContain("    this.__mpCleanup0?.();");
    // `HTMLElement` declares no `disconnectedCallback`, so there is nothing to chain to.
    expect(source).not.toContain("super.disconnectedCallback();");
    expect(source).not.toMatch(/\bany\b/u);
  });

  it("prints a block-bodied memo as the getter body rather than a returned object", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement(
              "const [sortKey, setSortKey] = useState<string | undefined>(undefined);",
            ),
          ],
          returnNode: element("span"),
        }),
        props: [prop("rows", "readonly Row[]")],
        state: [state("sortKey", "setSortKey", { type: "string | undefined" })],
        memos: [
          memo(
            "sortedRows",
            [
              "() => {",
              "    if (sortKey === undefined) {",
              "      return rows;",
              "    }",
              "    return sort(rows, sortKey);",
              "  }",
            ].join("\n"),
            ["rows", "sortKey"],
          ),
        ],
      }),
    );

    expect(source).toContain(
      [
        "  get sortedRows() {",
        "    if (this.sortKey === undefined) {",
        "      return this.rows;",
        "    }",
        "    return sort(this.rows, this.sortKey);",
        "  }",
      ].join("\n"),
    );
    // The block's own brace must never be wrapped in a `return`.
    expect(source).not.toContain("    return {");
  });

  it("declares a property for every member destructured in the component body", () => {
    // The frontend reports no prop here: the parameter is a whole props object,
    // so the members are only visible in the body pattern. Without them the class
    // came out empty — no `static properties`, no fields, no adopted attributes.
    const source = synthesise(
      semanticModule({
        declarations: [
          statement(
            "export interface AvatarProperties {\n  src?: string;\n  alt?: string;\n}",
            "interface",
            {
              name: "AvatarProperties",
              exported: true,
            },
          ),
        ],
        component: component({
          name: "ForgeAvatar",
          parameter: "properties",
          parameterType: "Readonly<AvatarProperties>",
          body: [statement("const { src, alt = '' } = properties;")],
          returnNode: element("img", {
            attributes: [
              expressionAttribute("src", "src"),
              expressionAttribute("alt", "alt"),
            ],
          }),
        }),
      }),
      "ForgeAvatar",
    );

    expect(source).toContain("    src: {},");
    expect(source).toContain("    alt: {},");
    expect(source).toContain("  declare src: AvatarProperties['src'];");
    expect(source).toContain("  declare alt: AvatarProperties['alt'];");
    // The pattern itself stays the render head's binding, so its default holds…
    expect(source).toContain("    const { src, alt = '' } = this;");
    // …and the bare reads are left bare, resolving to that local.
    expect(source).toContain("return html`<img src=${src} alt=${alt}></img>`;");
  });

  it("replays a body props pattern inside a lifted effect and memo", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement("const { code, language = 'plaintext' } = properties;"),
          ],
          returnNode: element("pre", {
            children: [expressionChild("highlighted")],
          }),
        }),
        memos: [memo("highlighted", "() => highlight(code, language)")],
        effects: [effect("() => { report(language); }")],
      }),
    );

    // Both scopes live outside `render()`, so each restores the locals it reads —
    // with the authored default, and only the entries it needs.
    expect(source).toContain(
      "    const { code, language = 'plaintext' } = this;\n    return highlight(code, language);",
    );
    expect(source).toContain("    const { language = 'plaintext' } = this;");
    expect(source).not.toMatch(/get highlighted\(\) \{\n {4}return \{/u);
  });

  it("declares and replays a props pattern given in the parameter, defaults included", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "{ label, size = 'md' }",
          parameterType: "Readonly<FixtureProperties>",
          returnNode: element("span", {
            attributes: [expressionAttribute("data-size", "size")],
            children: [expressionChild("label")],
          }),
        }),
        props: [prop("label", "string"), prop("size", "Size", true, "'md'")],
      }),
    );

    expect(source).toContain("    label: {},");
    expect(source).toContain("    size: {},");
    // No body statement carries the parameter pattern, so the head is given one.
    expect(source).toContain("    const { label, size = 'md' } = this;");
    expect(source).toContain(
      "return html`<span data-size=${size}>${label}</span>`;",
    );
  });

  it("keeps a nested props pattern intact, registering only its outer member", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement("const { range: { start, end = 0 } } = properties;"),
          ],
          returnNode: element("span", { children: [expressionChild("start")] }),
        }),
      }),
    );

    // `range` is the attribute-backed property; `start`/`end` are locals of the
    // nested pattern and must not be rewritten to fields of their own.
    expect(source).toContain("    range: {},");
    expect(source).not.toContain("    start: {},");
    expect(source).toContain("    const { range: { start, end = 0 } } = this;");
    expect(source).toContain("return html`<span>${start}</span>`;");
  });

  it("seeds a ref that reads a destructured prop in setup, with the pattern replayed", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [statement("const { modelValue = 0 } = properties;")],
          returnNode: element("span", {
            children: [expressionChild("modelValue")],
          }),
        }),
        refs: [elementRef("latest", "number", "modelValue")],
      }),
    );

    // The seed reads a name only `render()` holds, so it is deferred to `setup()`
    // — which runs after the host's attributes are adopted, so the cell is seeded
    // from the element's real property rather than from an unset one. The pattern
    // is replayed there, keeping its default.
    expect(source).toContain("  declare latest: { current: number };");
    expect(source).toContain(
      "  setup() {\n    const { modelValue = 0 } = this;\n    this.latest = { current: modelValue };\n  }",
    );
    expect(source).not.toContain("constructor()");
  });

  it("folds a destructured prop into a constructor seed when the head cannot be replayed", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement("const { modelValue = 0 } = properties;"),
            // A `let` may be reassigned further down the head, so replaying it
            // is unsound and every seed keeps its constructor position.
            statement("let scale = 2;"),
          ],
          returnNode: element("span", {
            children: [expressionChild("modelValue")],
          }),
        }),
        refs: [elementRef("latest", "number", "modelValue * scale")],
      }),
    );

    // A field-position seed has no statement slot for the replay, so the default
    // is folded in — and read as `this['x']`, which a declaration-only field
    // allows (`this.x` would be `TS2729 — used before its initialization`).
    expect(source).toContain("  readonly latest: { current: number };");
    expect(source).toContain(
      "    this.latest = { current: (this['modelValue'] ?? 0) * scale };",
    );
    expect(source).not.toContain("  setup() {");
  });

  it("declares no field for a property that collides with an HTMLElement member", () => {
    const source = synthesise(
      semanticModule({
        declarations: [
          statement(
            "export interface FixtureProperties {\n  id?: string;\n  ariaLabel?: string;\n  ariaLabelMax?: number;\n}",
            "interface",
            { name: "FixtureProperties", exported: true },
          ),
        ],
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          parameterType: "FixtureProperties",
          returnNode: element("span", {
            attributes: [
              expressionAttribute("id", "properties.id"),
              expressionAttribute("aria-label", "properties.ariaLabel"),
              expressionAttribute("data-max", "properties.ariaLabelMax"),
            ],
          }),
        }),
      }),
    );

    // Registered so the runtime still installs its accessor and observes the
    // attribute — the generated runtime behaviour is unchanged…
    expect(source).toContain("    id: {},");
    expect(source).toContain("    ariaLabel: {},");
    // …but no field, since `Props['id']` is not assignable to `HTMLElement.id`.
    expect(source).not.toMatch(/^\s+declare id:/mu);
    expect(source).not.toMatch(/^\s+declare ariaLabel:/mu);
    // A lookalike that is *not* a DOM member keeps its own typed field.
    expect(source).toContain(
      "  declare ariaLabelMax: FixtureProperties['ariaLabelMax'];",
    );
  });

  it("never seeds a reactive member with a field initializer", () => {
    const source = synthesiseOptimized(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [statement("const generatedId = useId();")],
          returnNode: element("span", { children: [expressionChild("count")] }),
        }),
        props: [prop("label", "string")],
        state: [
          state("count", "setCount", { type: "number", initializer: "0" }),
          state("rows", "setRows", { type: "string[]", initializer: "[]" }),
        ],
        refs: [elementRef("host", "HTMLElement | null", "null")],
      }),
    );

    // `ForgeElement.finalize()` installs a prototype accessor for every
    // `static properties` key; an own field would shadow it and the element
    // would stop re-rendering on a write.
    const registered = [...source.matchAll(/^ {4}(\w+): \{/gmu)].map(
      (match) => match[1],
    );
    expect(registered).toEqual(["label", "count", "rows"]);
    for (const name of registered) {
      expect(source).not.toMatch(
        new RegExp(String.raw`^\s+(?:declare |readonly )*${name}[^\n]*=`, "mu"),
      );
    }
    // Seeded through the accessor instead, in declaration order.
    expect(source).toContain("  constructor() {");
    expect(source.indexOf("    this.count = 0;")).toBeLessThan(
      source.indexOf("    this.rows = [];"),
    );
    expect(source.indexOf("    this.rows = [];")).toBeLessThan(
      source.indexOf("    this.generatedId = useId();"),
    );
    expect(source.indexOf("    this.generatedId = useId();")).toBeLessThan(
      source.indexOf("    this.host = { current: null };"),
    );
  });

  it("emits no constructor when nothing needs seeding", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span", {
            children: [expressionChild("properties.label")],
          }),
        }),
        props: [prop("label", "string")],
      }),
    );

    expect(source).not.toContain("constructor()");
  });

  it("promotes a render-head function read by an effect to a stable field", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement(
              "const scrollToBottom = (): void => { host.current?.scrollTo(0, 0); };",
            ),
            statement(
              "useEffect(() => { scrollToBottom(); }, []);",
              "expression",
            ),
          ],
          returnNode: element("div", {
            attributes: [expressionAttribute("@scroll", "scrollToBottom")],
          }),
        }),
        refs: [elementRef("host", "HTMLElement | null", "null")],
        effects: [effect("() => { scrollToBottom(); }")],
      }),
    );

    // A field, not a getter: an `addEventListener` / `removeEventListener` pair
    // has to see the same function object.
    expect(source).toContain(
      "  readonly scrollToBottom = (): void => { this.host.current?.scrollTo(0, 0); };",
    );
    expect(source).toContain("    (() => { this.scrollToBottom(); })();");
    // …and the render head no longer declares it.
    expect(source).not.toContain("    const scrollToBottom =");
    expect(source).toContain("@scroll=${this.scrollToBottom}");
  });

  it("promotes a pure render-head derivation read by a lifted scope to a getter", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "{ slides = [], loop = false }",
          body: [statement("const slideCount = slides.length;")],
          returnNode: element("span", {
            children: [expressionChild("slideCount")],
          }),
        }),
        effects: [effect("() => { report(slideCount, loop); }")],
      }),
    );

    // The getter re-states the props pattern it reads, so the default survives.
    expect(source).toContain("  get slideCount() {");
    expect(source).toContain("    const { slides = [] } = this;");
    expect(source).toContain("    return slides.length;");
    expect(source).toContain("report(this.slideCount, loop)");
    expect(source).not.toContain("    const slideCount =");
  });

  it("leaves a render-head constant whose initializer may have an effect in render", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement("const initial = parseTime(properties.modelValue);"),
          ],
          returnNode: element("span", {
            children: [expressionChild("initial.hours")],
          }),
        }),
        state: [
          state("hours", "setHours", {
            type: "number",
            initializer: "initial.h",
          }),
        ],
      }),
    );

    // `parseTime(…)` cannot be proved effect-free, so the statement keeps its
    // place and evaluation order rather than being recomputed in a getter.
    expect(source).toContain("    const initial = parseTime(this.modelValue);");
    expect(source).not.toContain("  get initial()");
  });

  it("refuses a promotion that would read a constant left behind", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [
            statement("const parsed = parseTime(properties.modelValue);"),
            statement("const hours = parsed.hours;"),
          ],
          returnNode: element("span", { children: [expressionChild("hours")] }),
        }),
        effects: [effect("() => { report(hours); }")],
      }),
    );

    // `hours` is pure on its own, but it reads `parsed`, which stays in render.
    expect(source).not.toContain("  get hours()");
    expect(source).toContain("    const hours = parsed.hours;");
  });

  it("lowers a hasSlot check in the template and in a lifted scope", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          body: [statement("const hasHeader = hasSlot('header');")],
          returnNode: element("div", {
            children: [expressionChild("hasSlot() ? 'yes' : 'no'")],
          }),
        }),
        memos: [memo("headerVisible", "() => hasSlot('header')")],
      }),
    );

    expect(source).toContain(
      "    const hasHeader = hasSlotContent(this, 'header');",
    );
    expect(source).toContain("    return hasSlotContent(this, 'header');");
    expect(source).toContain("hasSlotContent(this)");
    expect(source).not.toContain("hasSlot(");
  });

  it("never emits an any annotation", () => {
    const source = synthesise(
      semanticModule({
        component: component({
          name: "ForgeFixture",
          parameter: "properties",
          returnNode: element("span", {
            children: [expressionChild("properties.hint")],
          }),
        }),
        props: [prop("label", "string"), prop("variant", "string", true)],
        state: [
          state("open", "setOpen", {
            inferredType: "boolean",
            initializer: "false",
          }),
          state("bag", "setBag"),
        ],
      }),
    );

    expect(source).not.toMatch(/\bany\b/u);
  });
});
