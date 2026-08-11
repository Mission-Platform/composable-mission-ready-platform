import { describe, expect, it } from "vitest";

import {
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
  state,
  statement,
  stringAttribute,
  textChild,
} from "./ir-test-helpers.js";
import { isSvelteLowered, lowerSvelteModule } from "./lower.js";

import type { SvelteLoweredModule } from "./lower.js";
import type {
  SemanticModule,
  TargetContext,
} from "@mission-platform/forge-plugin-api";

const CONTEXT: TargetContext = {
  framework: "svelte",
  moduleKind: "component",
  componentName: "Fixture",
  componentFolders: new Set(),
};

function plan(
  module: SemanticModule,
  context: TargetContext = CONTEXT,
): SvelteLoweredModule {
  return lowerSvelteModule(module, context).lowered;
}

describe("lowerSvelteModule", () => {
  it("discriminates its own plan and rejects a foreign one", () => {
    const root = element("span", {
      children: [textChild("x")],
      source: "<span>x</span>",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
    });
    const intentions = lowerSvelteModule(module, CONTEXT);

    expect(intentions.framework).toBe("svelte");
    expect(isSvelteLowered(intentions.lowered)).toBe(true);
    expect(isSvelteLowered(undefined)).toBe(false);
    expect(
      isSvelteLowered({ framework: "vue", appliedOptimizations: [] }),
    ).toBe(false);
    expect(intentions.lowered.appliedOptimizations).toEqual([]);
  });

  it("turns state, memos, effects and refs into rune decisions", () => {
    const root = element("div", { selfClosing: true, source: "<div />" });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [
          statement("const [count, setCount] = useState(0);"),
          statement("const doubled = useMemo(() => count * 2, [count]);"),
          statement("const gutter = useMemo(() => 'wide', []);"),
          statement("const hostRef = useRef<HTMLDivElement | null>(null);"),
          statement(
            "useEffect(() => { track(count); }, [count]);",
            "expression",
          ),
          statement("useEffect(() => { mount(); }, []);", "expression"),
        ],
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
      state: [state("count", "setCount", { inferredType: "number" })],
    });

    const lowered = plan(module);

    expect(lowered.runeState).toEqual([
      { name: "count", setter: "setCount", type: "number", initializer: "0" },
    ]);
    expect(lowered.derived).toEqual([
      { name: "doubled", expression: "() => count * 2", kind: "derived-by" },
      { name: "gutter", expression: "'wide'", kind: "const" },
    ]);
    expect(lowered.bindings).toEqual([
      {
        name: "hostRef",
        elementType: "HTMLDivElement",
        initializer: undefined,
      },
    ]);
    expect(lowered.effects.map((entry) => entry.lifecycle)).toEqual([
      "effect",
      "mount",
    ]);
    expect(lowered.script.setterNames.get("setCount")).toBe("count");
    expect(lowered.script.refNames.has("hostRef")).toBe(true);
  });

  it("resolves a state type from the declared type, the inferred one, then unknown", () => {
    const root = element("div", { selfClosing: true, source: "<div />" });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [
          statement("const [label, setLabel] = useState('');"),
          statement("const [size, setSize] = useState(1);"),
          statement("const [payload, setPayload] = useState();"),
        ],
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
      state: [
        state("label", "setLabel", { type: "string", inferredType: "number" }),
        state("size", "setSize", { inferredType: "number" }),
      ],
    });

    expect(plan(module).runeState.map((entry) => entry.type)).toEqual([
      "string",
      "number",
      "unknown",
    ]);
  });

  it("states the $props() contract, its defaults and its optionality", () => {
    const root = element("p", {
      attributes: [expressionAttribute("title", "label")],
      children: [textChild("body")],
      source: "<p title={label}>body</p>",
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        parameterType: "FixtureProperties",
        body: [statement("const { label = 'none' } = properties;")],
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
      props: [prop("label", { type: "string", optional: false })],
    });

    const lowered = plan(module);

    expect(lowered.script.propsParameter).toBe("properties");
    expect(lowered.script.propsType).toBe("FixtureProperties");
    expect(lowered.propsContract).toEqual([
      {
        name: "label",
        local: "label",
        optional: false,
        type: "string",
        defaultValue: "'none'",
      },
      {
        name: "children",
        local: "children",
        optional: true,
        type: undefined,
        defaultValue: undefined,
      },
    ]);
  });

  it("records the imports the plan needs, including the mount lifecycle", () => {
    const root = element("div", {
      attributes: [expressionAttribute("className", "classNames('root')")],
      selfClosing: true,
      source: "<div className={classNames('root')} />",
    });
    const module = semanticModule({
      imports: [
        moduleImport(
          "import { classNames, type MpRenderProperty } from '@mission-platform/forge';",
          "@mission-platform/forge",
          { valueNames: ["classNames"], typeNames: ["MpRenderProperty"] },
        ),
      ],
      component: component({
        name: "Fixture",
        parameter: "properties",
        body: [statement("useEffect(() => { mount(); }, []);", "expression")],
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
    });

    expect(plan(module).svelteImports).toEqual([
      {
        module: "@mission-platform/forge",
        names: ["classNames"],
        typeOnly: false,
        reason: "runtime-values",
      },
      {
        module: "./mp-jsx-types",
        names: ["MpRenderProperty"],
        typeOnly: true,
        reason: "local-jsx-types",
      },
      {
        module: "svelte",
        names: ["onMount"],
        typeOnly: false,
        reason: "lifecycle",
      },
    ]);
  });

  it("carries slots, dynamic hosts, list keys and static subtrees into the plan", () => {
    const marker = element("Slot", {
      selfClosing: true,
      attributes: [stringAttribute("name", "footer")],
      source: '<Slot name="footer" />',
    });
    const host = element("Dynamic", {
      selfClosing: true,
      attributes: [expressionAttribute("is", "tag")],
      source: "<Dynamic is={tag} />",
    });
    const root = element("section", {
      attributes: [stringAttribute("__mpStatic", "true")],
      children: [marker, host, expressionChild("hasSlot('aside')")],
      source:
        '<section __mpStatic="true"><Slot name="footer" /><Dynamic is={tag} />{hasSlot(\'aside\')}</section>',
    });
    const module = semanticModule({
      component: component({
        name: "Fixture",
        parameter: "properties",
        returned: { expression: root.expression!.text, nodes: [root] },
      }),
      slots: [slot("footer")],
      dynamicNodes: [dynamicNode("tag")],
      listKeys: [
        listKey("rows", "row.id", true),
        listKey("cells", undefined, false),
      ],
    });

    const lowered = plan(module);

    expect(lowered.slots).toEqual([
      { name: "footer", snippet: "footer", presenceChecked: false },
      { name: "aside", snippet: "aside", presenceChecked: true },
    ]);
    expect(lowered.dynamicNodes).toEqual([
      { expression: "tag", host: "svelte:element", span: { start: 0, end: 0 } },
    ]);
    expect(lowered.listKeys).toEqual([
      { source: "rows", key: "row.id", stable: true },
      { source: "cells", key: undefined, stable: false },
    ]);
    expect(lowered.staticSubtrees.map((entry) => entry.name)).toEqual([
      "__mpHoist_0",
    ]);
    expect(lowered.hoistedStatic).toEqual([]);
  });

  it("keeps a composable module free of component decisions", () => {
    const module = semanticModule({
      moduleKind: "composable",
      declarations: [
        statement(
          "export function useCounter(): number {\n  return 1;\n}",
          "function",
        ),
      ],
    });

    const lowered = plan(module, { ...CONTEXT, moduleKind: "composable" });

    expect(lowered.moduleKind).toBe("composable");
    expect(lowered.runeState).toEqual([]);
    expect(lowered.propsContract).toEqual([
      {
        name: "children",
        local: "children",
        optional: true,
        type: undefined,
        defaultValue: undefined,
      },
    ]);
  });
});
