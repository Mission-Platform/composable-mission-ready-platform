import { describe, expect, it } from "vitest";

import {
  component,
  element,
  expressionAttribute,
  expressionChild,
  fragment,
  listKey,
  memo,
  moduleImport,
  reference,
  semanticModule,
  slot,
  state,
  statement,
  stringAttribute,
  textChild,
} from "../ir-test-helpers.js";
import { planSolidModule } from "../lower.js";

import { emitSolidModule } from "./module.js";

import type { SemanticModuleParts } from "../ir-test-helpers.js";

/** Emit a fixture, lowering it first so the emitted output reflects a real plan. */
function emit(parts: SemanticModuleParts): string {
  const module = semanticModule(parts);
  return emitSolidModule(module, { plan: planSolidModule(module) }).code;
}

describe("emitSolidModule", () => {
  it("prints a component from the generic AST without re-parsing", () => {
    const code = emit({
      imports: [
        moduleImport(
          "import { h } from '@mission-platform/forge';",
          "@mission-platform/forge",
          { valueNames: ["h"] },
        ),
      ],
      component: component({
        name: "Card",
        parameter: "properties",
        parameterType: "CardProperties",
        returnNode: element("section", {
          attributes: [stringAttribute("className", "card")],
          children: [textChild("Hello")],
        }),
      }),
    });

    expect(code).toContain(
      "export function Card(properties: CardProperties) {",
    );
    expect(code).toContain('<section class="card">Hello</section>');
  });

  describe("reactive primitives", () => {
    it("lowers useState to createSignal and rewrites every read to a getter call", () => {
      const code = emit({
        state: [state("open", "setOpen", { initializer: "false" })],
        component: component({
          name: "Toggle",
          parameter: "properties",
          body: [
            statement("const [open, setOpen] = useState(false);"),
            statement(
              "return <button onClick={() => setOpen(!open)}>{open}</button>;",
              "return",
            ),
          ],
          returnNode: element("button", {
            attributes: [
              expressionAttribute("onClick", "() => setOpen(!open)"),
            ],
            children: [expressionChild("open")],
          }),
        }),
      });

      expect(code).toContain("const [open, setOpen] = createSignal(false);");
      expect(code).toContain("onClick={() => setOpen(!open())}");
      expect(code).toContain("{open()}");
      expect(code).toContain('import { createSignal } from "solid-js";');
    });

    it("lowers useMemo to createMemo and folds a constant factory", () => {
      const code = emit({
        component: component({
          name: "Labels",
          body: [
            statement(
              "const label = useMemo(() => properties.first + properties.last, [properties]);",
            ),
            statement("const fixed = useMemo(() => 'always', []);"),
          ],
          returnNode: element("span", { children: [expressionChild("label")] }),
        }),
      });

      expect(code).toContain(
        "const label = createMemo(() => properties.first + properties.last);",
      );
      expect(code).toContain("const fixed = 'always';");
      // The memo binding is an accessor, the folded constant is a plain value.
      expect(code).toContain("{label()}");
      expect(code).not.toContain("fixed()");
    });

    it("lowers useEffect to onMount when the dependency list is empty", () => {
      const code = emit({
        component: component({
          name: "Mounted",
          body: [statement("useEffect(() => { start(); }, []);", "expression")],
          returnNode: element("div"),
        }),
      });

      expect(code).toContain("onMount(() => { start(); });");
      expect(code).toContain('import { onMount } from "solid-js";');
    });

    it("lowers a dependency-tracking useEffect to createEffect", () => {
      const code = emit({
        state: [state("count", "setCount")],
        component: component({
          name: "Watcher",
          body: [
            statement("const [count, setCount] = useState(0);"),
            statement(
              "useEffect(() => { report(count); }, [count]);",
              "expression",
            ),
          ],
          returnNode: element("div"),
        }),
      });

      expect(code).toContain("createEffect(() => { report(count()); });");
      expect(code).toContain(
        'import { createSignal, createEffect } from "solid-js";',
      );
    });

    it("lowers useRef to a container and the ref attribute to a callback", () => {
      const code = emit({
        refs: [reference("node", "HTMLDivElement")],
        component: component({
          name: "Focusable",
          body: [statement("const node = useRef<HTMLDivElement>(null);")],
          returnNode: element("div", {
            attributes: [expressionAttribute("ref", "node")],
          }),
        }),
      });

      expect(code).toContain("const node = { current: null };");
      expect(code).toContain("ref={(el) => (node.current = el)}");
    });

    it("lowers useId to createUniqueId and drops useCallback", () => {
      const code = emit({
        component: component({
          name: "Field",
          body: [
            statement("const id = useId();"),
            statement("const onSelect = useCallback(() => pick(id), [id]);"),
          ],
          returnNode: element("input", {
            attributes: [expressionAttribute("id", "id")],
          }),
        }),
      });

      expect(code).toContain("const id = createUniqueId();");
      expect(code).toContain("const onSelect = () => pick(id);");
      expect(code).toContain('import { createUniqueId } from "solid-js";');
    });
  });

  describe("markup", () => {
    it("reads a named slot from the props object and keeps its fallback", () => {
      const code = emit({
        slots: [slot("trigger")],
        component: component({
          name: "Dropdown",
          parameter: "properties",
          returnNode: element("div", {
            children: [
              element("Slot", {
                attributes: [stringAttribute("name", "trigger")],
              }),
            ],
          }),
        }),
      });

      expect(code).toContain("{properties.trigger}");
    });

    it("routes slot-marked children of a component into props", () => {
      const code = emit({
        component: component({
          name: "Host",
          returnNode: element("ForgeDropdown", {
            children: [
              element("button", {
                attributes: [stringAttribute("slot", "trigger")],
                children: [textChild("Open")],
              }),
              element("p", { children: [textChild("panel")] }),
            ],
          }),
        }),
      });

      expect(code).toContain("trigger={<button>Open</button>}");
      expect(code).toContain("<p>panel</p>");
    });

    it("rewrites hasSlot to a props-object presence check", () => {
      const code = emit({
        slots: [slot("footer")],
        component: component({
          name: "Panel",
          parameter: "properties",
          returnNode: element("div", {
            children: [expressionChild("hasSlot('footer') ? 'yes' : 'no'")],
          }),
        }),
      });

      expect(code).toContain("{(properties.footer != null) ? 'yes' : 'no'}");
    });

    it("lowers a dynamic node to the Solid hyperscript call", () => {
      const code = emit({
        component: component({
          name: "Host",
          returnNode: element("Dynamic", {
            tagKind: "dynamic",
            attributes: [
              expressionAttribute("is", "properties.tag"),
              stringAttribute("className", "row"),
            ],
          }),
        }),
      });

      expect(code).toContain("h(properties.tag, { class: 'row' })");
      expect(code).toContain('import h from "solid-js/h";');
    });

    it("keeps list keys and static markers out of the emitted attributes", () => {
      const code = emit({
        listKeys: [listKey("items", { key: "item.id" })],
        component: component({
          name: "List",
          returnNode: element("ul", {
            children: [
              element("li", {
                attributes: [
                  expressionAttribute("key", "item.id"),
                  stringAttribute("__mpStatic", "true"),
                ],
                children: [textChild("row")],
              }),
            ],
          }),
        }),
      });

      expect(code).toContain("key={item.id}");
      expect(code).not.toContain("__mpStatic");
    });

    it("hoists a static subtree to a module-level constant", () => {
      const code = emit({
        component: component({
          name: "Banner",
          returnNode: element("div", {
            children: [
              element("span", {
                attributes: [stringAttribute("__mpStatic", "true")],
                children: [textChild("static")],
              }),
            ],
          }),
        }),
      });

      expect(code).toContain("const __mpHoist_0 = <span>static</span>;");
      expect(code).toContain("{__mpHoist_0}");
    });

    it("collapses an empty fragment to null and keeps a populated one", () => {
      expect(
        emit({
          component: component({ name: "Empty", returnNode: fragment([]) }),
        }),
      ).toContain("return null;");
      expect(
        emit({
          component: component({
            name: "Pair",
            returnNode: fragment([element("a"), element("b")]),
          }),
        }),
      ).toContain("<>");
    });

    it("collapses an array className to the classNames runtime helper", () => {
      const code = emit({
        component: component({
          name: "Styled",
          returnNode: element("div", {
            attributes: [
              expressionAttribute("className", "['a', active && 'b']"),
            ],
          }),
        }),
      });

      expect(code).toContain("class={classNames('a', active && 'b')}");
      expect(code).toContain(
        'import { classNames } from "@mission-platform/forge";',
      );
    });

    it("aliases the neutral DOM attribute names", () => {
      const code = emit({
        component: component({
          name: "Label",
          returnNode: element("label", {
            attributes: [stringAttribute("htmlFor", "name")],
          }),
        }),
      });

      expect(code).toContain('for="name"');
    });
  });

  describe("imports", () => {
    it("splits the neutral import across solid-js and the retained packages", () => {
      const code = emit({
        imports: [
          moduleImport(
            "import { classNames, Teleport, createContext, type MpChild, type MpRenderProperty } from '@mission-platform/forge';",
            "@mission-platform/forge",
            {
              valueNames: ["classNames", "Teleport", "createContext"],
              typeNames: ["MpChild", "MpRenderProperty"],
            },
          ),
        ],
        component: component({ name: "Shell", returnNode: element("div") }),
      });

      expect(code).toContain(
        'import { classNames } from "@mission-platform/forge";',
      );
      expect(code).toContain(
        'import { Teleport } from "@mission-platform/forge/solid";',
      );
      expect(code).toContain('import { createContext } from "solid-js";');
      expect(code).toContain('import type { JSX } from "solid-js";');
      expect(code).toContain(
        'import type { MpRenderProperty } from "./mp-jsx-types";',
      );
      expect(code).not.toContain('import { h } from "solid-js"');
      // Nothing inherits a neutral props base any more, and a generated props
      // interface never gains a catch-all key.
      expect(code).not.toContain("extends MpProperties");
      expect(code).not.toContain("[key: string]:");
    });

    it("flattens a relative sibling-component import", () => {
      const code = emit({
        imports: [
          moduleImport(
            "import { Card } from '../widgets/card';",
            "../widgets/card",
            { valueNames: ["Card"] },
          ),
        ],
        component: component({ name: "Shell", returnNode: element("Card") }),
      });

      expect(code).toContain('import { Card } from "./card";');
    });

    it("injects the i18n hook for an i18next consumer", () => {
      const code = emit({
        imports: [
          moduleImport("import i18next from 'i18next';", "i18next", {
            defaultName: "i18next",
          }),
        ],
        component: component({
          name: "Greeting",
          returnNode: element("p", {
            children: [expressionChild("i18next.t('hello')")],
          }),
        }),
      });

      expect(code).toContain(
        'import { useI18n } from "@mission-platform/i18n";',
      );
      expect(code).toContain("const { t } = useI18n();");
      expect(code).toContain("{t('hello')}");
    });

    it("resolves the neutral element types to Solid JSX.Element", () => {
      const code = emit({
        imports: [
          moduleImport(
            "import type { MpChild } from '@mission-platform/forge';",
            "@mission-platform/forge",
            {
              typeNames: ["MpChild"],
              typeOnly: true,
            },
          ),
        ],
        declarations: [
          statement(
            "interface PanelProperties { body: MpChild }",
            "interface",
            { name: "PanelProperties" },
          ),
        ],
        component: component({ name: "Panel", returnNode: element("div") }),
      });

      expect(code).toContain("interface PanelProperties { body: JSX.Element }");
      expect(code).toContain('import type { JSX } from "solid-js";');
    });
  });

  // Every one of these shapes reached the generated component library as source
  // that does not parse: a getter read was rewritten where the identifier is a
  // **binding**, not a value.
  describe("binding positions", () => {
    it("calls a signal inside a template-literal interpolation instead of expanding shorthand", () => {
      const code = emit({
        state: [state("totalHeight", "setTotalHeight")],
        component: component({
          name: "VirtualList",
          body: [
            statement("const [totalHeight, setTotalHeight] = useState(0);"),
          ],
          returnNode: element("div", {
            attributes: [
              expressionAttribute(
                "style",
                "{ height: `${totalHeight}px`, position: 'relative' }",
              ),
            ],
          }),
        }),
      });

      expect(code).toContain(
        "style={{ height: `${totalHeight()}px`, position: 'relative' }}",
      );
      expect(code).not.toContain("totalHeight: totalHeight()");
    });

    it("rewrites a JSX attribute value but never the attribute name", () => {
      const row = element("Row", {
        selfClosing: true,
        attributes: [
          expressionAttribute("headingIds", "headingIds"),
          expressionAttribute("token", "token"),
        ],
        source: "<Row headingIds={headingIds} token={token} />",
      });
      const code = emit({
        state: [state("headingIds", "setHeadingIds")],
        component: component({
          name: "Markdown",
          body: [
            statement("const [headingIds, setHeadingIds] = useState([]);"),
            statement(
              "const rows = tokens.map((token) => <Row headingIds={headingIds} token={token} />);",
              "variable",
              {
                renderNodes: [row],
              },
            ),
          ],
          returnNode: element("div", { children: [expressionChild("rows")] }),
        }),
      });

      expect(code).toContain("<Row headingIds={headingIds()} token={token} />");
      expect(code).not.toContain("headingIds()=");
    });

    it("leaves a module-level function alone when its parameters match reactive names", () => {
      const code = emit({
        state: [state("viewYear", "setViewYear")],
        memos: [memo("viewMonth", "() => properties.month")],
        declarations: [
          statement(
            "function buildCells(viewYear: number, viewMonth: number): number {\n  return viewYear + viewMonth;\n}",
            "function",
            { name: "buildCells" },
          ),
        ],
        component: component({
          name: "Calendar",
          body: [statement("const [viewYear, setViewYear] = useState(2024);")],
          returnNode: element("div", {
            children: [expressionChild("viewYear")],
          }),
        }),
      });

      // The helper runs outside the component, where neither name is reactive.
      expect(code).toContain(
        "function buildCells(viewYear: number, viewMonth: number): number {",
      );
      expect(code).toContain("return viewYear + viewMonth;");
      // Inside the component the very same name is a signal read.
      expect(code).toContain("{viewYear()}");
    });

    it("expands object shorthand but calls a bare argument", () => {
      const code = emit({
        state: [state("open", "setOpen")],
        component: component({
          name: "Panel",
          body: [statement("const [open, setOpen] = useState(false);")],
          returnNode: element("div", {
            children: [expressionChild("render({ open }, open)")],
          }),
        }),
      });

      expect(code).toContain("{render({ open: open() }, open())}");
    });
  });
});
