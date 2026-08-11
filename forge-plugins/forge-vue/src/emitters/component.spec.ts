import { describe, expect, it } from "vitest";

import {
  component,
  element,
  expressionAttribute,
  expressionChild,
  listKey,
  memo,
  moduleImport,
  prop,
  semanticModule,
  slot,
  state,
  statement,
  stringAttribute,
  templateRef,
  textChild,
} from "../ir-test-helpers.js";
import { lowerVueModule } from "../lower.js";
import { optimizeVueModule } from "../optimize.js";

import { emitVueModule } from "./component.js";

import type { VueLoweredModule } from "../lower.js";
import type {
  GenericJsxAttribute,
  SemanticModule,
  TargetContext,
} from "@mission-platform/forge-plugin-api";

const CONTEXT: TargetContext = {
  framework: "vue",
  moduleKind: "component",
  componentName: "Fixture",
};

/** The neutral import every fixture module declares. */
const NEUTRAL_IMPORT = moduleImport(
  "import type { MpElement } from '@mission-platform/forge';",
  "@mission-platform/forge",
  { typeNames: ["MpElement"], typeOnly: true },
);

/** Lower and optimize a fixture the way the pipeline does. */
function planFor(
  module: SemanticModule,
  staticMarking = true,
): VueLoweredModule | undefined {
  const optimized = optimizeVueModule(lowerVueModule(module, CONTEXT), {
    neutral: { staticMarking, stableKeyInference: true },
  });
  return optimized.lowered?.framework === "vue"
    ? (optimized.lowered as VueLoweredModule)
    : undefined;
}

describe("the Vue component emitter builds an SFC from the generic AST", () => {
  it("declares props, options and the template from the recorded render tree", () => {
    const module = semanticModule({
      imports: [NEUTRAL_IMPORT],
      declarations: [
        statement(
          "interface FixtureProperties {\n  label: string;\n}",
          "interface",
          {
            name: "FixtureProperties",
          },
        ),
      ],
      component: component({
        name: "Fixture",
        parameter: "properties",
        parameterType: "Readonly<FixtureProperties>",
        returnNode: element("span", {
          attributes: [stringAttribute("className", "fixture")],
          children: [expressionChild("properties.label")],
        }),
      }),
      props: [prop("label", "string")],
    });

    const code = emitVueModule(module, "Fixture").code;

    expect(code).toContain('<script setup lang="ts">');
    expect(code).toContain(
      "defineOptions({ name: 'Fixture', inheritAttrs: false });",
    );
    expect(code).toContain("const properties = defineProps<{");
    expect(code).toContain("label: string;");
    expect(code).toContain('<span class="fixture" v-bind="$attrs">');
    expect(code).toContain("{{ properties.label }}");
    // The props interface is carried through verbatim: it inherits nothing (the
    // neutral props base is gone) and declares no catch-all index signature, so
    // excess-property checking and `keyof` stay meaningful in the SFC.
    expect(code).toContain("interface FixtureProperties {");
    expect(code).not.toContain("extends MpProperties");
    expect(code).not.toContain("[key: string]:");
  });

  it("lowers state to a `ref` and reads it as `.value`", () => {
    const module = semanticModule({
      component: component({
        name: "Counter",
        parameter: "properties",
        body: [statement("const [count, setCount] = useState(0);")],
        returnNode: element("button", {
          attributes: [
            expressionAttribute("onClick", "() => setCount(count + 1)"),
          ],
          children: [expressionChild("count")],
        }),
      }),
      state: [state("count", "setCount", { initializer: "0" })],
    });

    const code = emitVueModule(module, "Counter").code;

    expect(code).toContain("import { ref } from 'vue';");
    expect(code).toContain("const count = ref(0);");
    expect(code).toContain("{{ count }}");
    // Vue's template compiler assigns through the exposed `ref`, so the inline
    // listener writes the bare binding (the `.value` is script-side only).
    expect(code).toContain("count = count + 1");
  });

  it("lifts a derived declaration to a reactive `computed`", () => {
    const module = semanticModule({
      component: component({
        name: "Sum",
        parameter: "properties",
        body: [
          statement("const [count, setCount] = useState(0);"),
          statement("const doubled = count * 2;"),
        ],
        returnNode: element("output", {
          children: [expressionChild("doubled")],
        }),
      }),
      state: [state("count", "setCount", { initializer: "0" })],
    });

    const code = emitVueModule(module, "Sum").code;

    expect(code).toContain("const doubled = computed(() => count.value * 2);");
    expect(code).toContain("{{ doubled }}");
    expect(code).toContain("computed");
  });

  it("routes an effect through the generated `mpEffect` helper", () => {
    const module = semanticModule({
      component: component({
        name: "Logger",
        parameter: "properties",
        body: [
          statement(
            "useEffect(() => { console.log(properties.label); }, [properties.label]);",
            "expression",
          ),
        ],
        returnNode: element("div", { selfClosing: true }),
      }),
      props: [prop("label", "string")],
      effects: [
        {
          body: {
            kind: "source-backed-expression",
            syntax: "expression",
            text: "() => { console.log(properties.label); }",
            span: { start: 0, end: 0 },
          },
          dependencies: [
            {
              kind: "source-backed-expression",
              syntax: "expression",
              text: "properties.label",
              span: { start: 0, end: 0 },
            },
          ],
          span: { start: 0, end: 0 },
        },
      ],
    });

    const code = emitVueModule(module, "Logger").code;

    expect(code).toContain(
      "mpEffect(() => { console.log(properties.label); }, () => [properties.label]);",
    );
    expect(code).toContain("import { mpEffect } from");
  });

  it("binds an element ref as a string template ref", () => {
    const module = semanticModule({
      component: component({
        name: "Focus",
        parameter: "properties",
        body: [
          statement("const inputRef = useRef<HTMLInputElement | null>(null);"),
        ],
        returnNode: element("input", {
          selfClosing: true,
          attributes: [expressionAttribute("ref", "inputRef")],
        }),
      }),
      refs: [templateRef("inputRef", "HTMLInputElement | null", "null")],
    });

    const code = emitVueModule(module, "Focus").code;

    expect(code).toContain(
      "const inputRef = useTemplateRef<HTMLInputElement>('inputRef');",
    );
    expect(code).toContain('ref="inputRef"');
    expect(code).not.toContain("shallowRef");
  });

  it("declares `on<Event>` props with `defineEmits` and emits from the template", () => {
    const module = semanticModule({
      declarations: [
        statement(
          "interface FixtureProperties {\n  onChange?: (value: string) => void;\n}",
          "interface",
          { name: "FixtureProperties" },
        ),
      ],
      component: component({
        name: "Field",
        parameter: "properties",
        parameterType: "Readonly<FixtureProperties>",
        returnNode: element("input", {
          selfClosing: true,
          attributes: [
            expressionAttribute(
              "onInput",
              '() => properties.onChange?.("next")',
            ),
          ],
        }),
      }),
      props: [prop("onChange", "(value: string) => void", { optional: true })],
    });

    const code = emitVueModule(module, "Field").code;

    expect(code).toContain("const emit = defineEmits<{");
    expect(code).toContain("change: [value: string];");
    expect(code).toContain("@input=");
    expect(code).not.toContain("onChange?: (value: string) => void;\n}>");
  });

  it("renders `children` and named slot content as `<slot>` elements", () => {
    const module = semanticModule({
      component: component({
        name: "Panel",
        parameter: "properties",
        returnNode: element("section", {
          children: [expressionChild("properties.children")],
        }),
      }),
      props: [prop("children", "MpChildren", { optional: true })],
      slots: [slot("default")],
    });

    const code = emitVueModule(module, "Panel").code;

    expect(code).toContain("<slot />");
    expect(code).not.toContain("children:");
  });

  it("renders a children nullish fallback structurally instead of stringifying slot vnodes", () => {
    const module = semanticModule({
      component: component({
        name: "LinkText",
        parameter: "properties",
        returnNode: element("a", {
          children: [expressionChild("properties.children ?? properties.href")],
        }),
      }),
      props: [
        prop("children", "MpChildren", { optional: true }),
        prop("href", "string", { optional: true }),
      ],
      slots: [slot("default")],
    });

    const code = emitVueModule(module, "LinkText").code;

    expect(code).toContain('<slot v-if="$slots.default" />');
    expect(code).toContain("<template v-else>{{ properties.href }}</template>");
    expect(code).not.toContain("{{ $slots.default?.()");
  });

  it("renders a dynamic tag as `<component :is>`", () => {
    const module = semanticModule({
      component: component({
        name: "Dynamic",
        parameter: "properties",
        returnNode: element("Dynamic", {
          attributes: [expressionAttribute("is", "properties.as")],
          children: [textChild("Go")],
        }),
      }),
      props: [prop("as", "string")],
      dynamicNodes: ["properties.as"],
    });

    const code = emitVueModule(module, "Dynamic").code;

    expect(code).toContain('<component :is="properties.as"');
  });

  it("converts a `.map()` projection into `v-for` with its `:key`", () => {
    const module = semanticModule({
      component: component({
        name: "List",
        parameter: "properties",
        returnNode: element("ul", {
          children: [
            expressionChild(
              "properties.items.map((item) => <li key={item.id}>{item.label}</li>)",
              [
                element("li", {
                  attributes: [expressionAttribute("key", "item.id")],
                  children: [expressionChild("item.label")],
                  source: "<li key={item.id}>{item.label}</li>",
                }),
              ],
            ),
          ],
        }),
      }),
      props: [prop("items", "readonly { id: string; label: string }[]")],
      listKeys: [listKey("properties.items", "item.id", true)],
    });

    const code = emitVueModule(module, "List").code;

    expect(code).toContain('v-for="item in properties.items"');
    expect(code).toContain(':key="item.id"');
    expect(code).toContain("{{ item.label }}");
  });

  it("renders a hoisted static subtree with `v-once` only when the plan hoists it", () => {
    const staticMarker: GenericJsxAttribute = {
      kind: "jsx-attribute",
      name: "__mpStatic",
      span: { start: 0, end: 0 },
    };
    const build = (): SemanticModule =>
      semanticModule({
        component: component({
          name: "Static",
          parameter: "properties",
          returnNode: element("div", {
            children: [
              element("p", {
                attributes: [staticMarker],
                children: [textChild("Fixed")],
              }),
            ],
          }),
        }),
        staticSubtrees: [{ start: 1, end: 2 }],
      });

    const hoisted = emitVueModule(
      build(),
      "Static",
      undefined,
      planFor(build(), true),
    ).code;
    const plain = emitVueModule(
      build(),
      "Static",
      undefined,
      planFor(build(), false),
    ).code;

    expect(hoisted).toContain("<p v-once>");
    expect(plain).not.toContain("v-once");
    expect(plain).toContain("<p>");
    expect(hoisted).not.toContain("__mpStatic");
  });

  it("emits never-reassigned state as a plain `const`, dropping the `ref` import", () => {
    const module = semanticModule({
      component: component({
        name: "Fixed",
        parameter: "properties",
        body: [statement('const [title] = useState("Mission");')],
        returnNode: element("h1", { children: [expressionChild("title")] }),
      }),
      state: [state("title", undefined, { initializer: '"Mission"' })],
    });

    const code = emitVueModule(
      module,
      "Fixed",
      undefined,
      planFor(module),
    ).code;

    expect(code).toContain('const title = "Mission";');
    expect(code).not.toContain("from 'vue'");
    expect(code).toContain("{{ title }}");
  });

  it("collapses duplicate computed factories onto a single declaration", () => {
    const module = semanticModule({
      component: component({
        name: "Twice",
        parameter: "properties",
        body: [
          statement(
            "const first = useMemo(() => properties.items.length, [properties.items]);",
          ),
          statement(
            "const second = useMemo(() => properties.items.length, [properties.items]);",
          ),
        ],
        returnNode: element("p", {
          children: [expressionChild("first"), expressionChild("second")],
        }),
      }),
      props: [prop("items", "readonly string[]")],
      memos: [
        memo("first", "() => properties.items.length", ["properties.items"]),
        memo("second", "() => properties.items.length", ["properties.items"]),
      ],
    });

    const code = emitVueModule(
      module,
      "Twice",
      undefined,
      planFor(module),
    ).code;

    expect(code).toContain(
      "const first = computed(() => properties.items.length);",
    );
    expect(code).toContain("const second = first;");
    expect(code.match(/computed\(/g)).toHaveLength(1);
  });

  it("imports a sibling component from its generated `.vue` module", () => {
    const module = semanticModule({
      imports: [
        NEUTRAL_IMPORT,
        moduleImport("import Badge from '../forge-badge';", "../forge-badge", {
          valueNames: ["Badge"],
        }),
      ],
      component: component({
        name: "Host",
        parameter: "properties",
        returnNode: element("div", {
          children: [element("Badge", { selfClosing: true })],
        }),
      }),
    });

    const code = emitVueModule(module, "Host", new Set(["forge-badge"])).code;

    expect(code).toContain("import Badge from './forge-badge.vue';");
    expect(code).toContain("<Badge />");
  });

  it("falls back to a render closure when the markup cannot be expressed", () => {
    const module = semanticModule({
      component: component({
        name: "Imperative",
        parameter: "properties",
        returnExpression: "buildTree(properties.items)",
      }),
      props: [prop("items", "readonly string[]")],
    });

    const code = emitVueModule(module, "Imperative").code;

    expect(code).toContain("const render = () => {");
    expect(code).toContain("return buildTree(properties.items);");
    expect(code).toContain('<render v-bind="$attrs" />');
    expect(code).toContain("native <template> unavailable");
  });
});
