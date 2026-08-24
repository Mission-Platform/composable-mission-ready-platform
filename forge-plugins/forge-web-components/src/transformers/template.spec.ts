import { describe, expect, it } from "vitest";

import {
  booleanAttribute,
  dynamicElement,
  element,
  expressionAttribute,
  expressionChild,
  fragment,
  spreadAttribute,
  stringAttribute,
  textChild,
} from "../ir-test-helpers.ts";

import {
  kebabCase,
  lowerStatementText,
  renderNodeToDomTemplate,
  renderNodeToTemplate,
  type TemplateContext,
} from "./template.ts";

const CONTEXT: TemplateContext = {
  scope: {
    propsParameterName: "properties",
    scoped: new Set([
      "label",
      "open",
      "items",
      "size",
      "onChange",
      "tag",
      "modelUpdate",
      "value",
      "showSeconds",
    ]),
    setters: new Map([["setOpen", "open"]]),
  },
  componentFolders: new Set(["forge-icon"]),
};

describe("the generic render-node lowering", () => {
  it("builds direct DOM factories with typed attribute and child slots", () => {
    const source = renderNodeToDomTemplate(
      element("input", {
        attributes: [
          expressionAttribute("value", "label"),
          expressionAttribute("onClick", "onChange"),
          spreadAttribute("rest"),
        ],
        children: [expressionChild("label")],
      }),
      CONTEXT,
    );

    expect(source.create).toContain('document.createElement("input")');
    expect(source.create).toContain('{ kind: "attr"');
    expect(source.create).toContain('{ kind: "spread"');
    expect(source.create).toContain('{ kind: "node"');
    expect(source.values).toEqual([
      "this.label",
      "this.onChange",
      "rest",
      "this.label",
    ]);
    expect(source.hot).toBe(false);
  });

  it("keeps static literal text safe for generated TypeScript", () => {
    const source = renderNodeToDomTemplate(
      element("p", {
        children: [textChild("quotes ` ${value} <tag> & ampersand")],
      }),
      CONTEXT,
    );

    expect(source.create).toContain("document.createTextNode");
    expect(source.create).toContain(
      JSON.stringify("quotes ` ${value} <tag> & ampersand"),
    );
    expect(source.create).not.toContain("innerHTML");
    expect(source.hot).toBe(true);
  });

  it("includes root-level HtmlContent dynamic node anchors in DomTemplate blueprint nodes", () => {
    const source = renderNodeToDomTemplate(
      element("HtmlContent", {
        selfClosing: true,
        attributes: [expressionAttribute("html", "properties.markup")],
      }),
      CONTEXT,
    );

    // Root-level dynamic node-part must return a non-empty `nodes` array so the
    // renderer can insert the end anchor and mount updates.
    expect(source.create).toContain("nodes: [__mpAnchor0]");
    expect(source.create).toContain(
      'const __mpAnchor0 = document.createComment("mp:0");',
    );
    expect(source.create).toContain(
      '{ kind: "node", id: 0, start: __mpAnchor0 }',
    );
  });

  it("includes root-level Slot dynamic node anchors in DomTemplate blueprint nodes", () => {
    const source = renderNodeToDomTemplate(
      element("Slot", { selfClosing: true }),
      CONTEXT,
    );

    expect(source.create).toContain("nodes: [__mpAnchor0]");
    expect(source.create).toContain(
      'const __mpAnchor0 = document.createComment("mp:0");',
    );
    expect(source.create).toContain(
      '{ kind: "node", id: 0, start: __mpAnchor0 }',
    );
  });

  it("includes root-level fragment expression node anchors in DomTemplate blueprint nodes", () => {
    const source = renderNodeToDomTemplate(
      fragment([expressionChild("properties.value")]),
      CONTEXT,
    );

    expect(source.create).toContain("nodes: [__mpAnchor0]");
    expect(source.create).toContain(
      'const __mpAnchor0 = document.createComment("mp:0");',
    );
    expect(source.create).toContain(
      '{ kind: "node", id: 0, start: __mpAnchor0 }',
    );
  });

  it("kebab-cases a component tag and keeps intrinsic elements", () => {
    expect(kebabCase("ForgeIconButton")).toBe("forge-icon-button");
    expect(
      renderNodeToTemplate(
        element("ForgeIcon", { selfClosing: true }),
        CONTEXT,
      ),
    ).toBe("<forge-icon></forge-icon>");
    expect(renderNodeToTemplate(element("div"), CONTEXT)).toBe("<div></div>");
  });

  it("uses the native base and is identifier for customized-built-in children", () => {
    const context: TemplateContext = {
      ...CONTEXT,
      componentHosts: new Map([
        ["forge-card", { baseTag: "div", invocation: "is-attribute" as const }],
      ]),
    };

    expect(
      renderNodeToTemplate(
        element("ForgeCard", { selfClosing: true }),
        context,
      ),
    ).toBe('<div is="forge-card"></div>');
    expect(
      renderNodeToTemplate(
        element("ForgeIcon", { selfClosing: true }),
        context,
      ),
    ).toBe("<forge-icon></forge-icon>");
  });

  it("creates customized-built-in children with the is option", () => {
    const context: TemplateContext = {
      ...CONTEXT,
      componentHosts: new Map([
        ["forge-card", { baseTag: "div", invocation: "is-attribute" as const }],
      ]),
    };

    expect(
      renderNodeToDomTemplate(
        element("ForgeCard", { selfClosing: true }),
        context,
      ).create,
    ).toContain('document.createElement("div", { is: "forge-card" })');
  });

  it("keeps customized-built-in child spreads valid", () => {
    const context: TemplateContext = {
      ...CONTEXT,
      componentHosts: new Map([
        ["forge-card", { baseTag: "div", invocation: "is-attribute" as const }],
      ]),
    };
    const template = renderNodeToTemplate(
      element("ForgeCard", {
        tagKind: "component",
        selfClosing: true,
        attributes: [
          spreadAttribute("rest"),
          expressionAttribute("label", "label"),
        ],
      }),
      context,
    );

    expect(template).toBe(
      '${dynamicElement("div", { "is": "forge-card", ...rest, "~label": this.label }, html``)}',
    );
    expect(template).not.toContain("... ...");
    expect(
      () =>
        // eslint-disable-next-line sonarjs/code-eval -- validates the emitted expression syntax.
        new Function(
          "dynamicElement",
          "html",
          `return ${template.slice(2, -1)}`,
        ),
    ).not.toThrow();
  });

  it("maps neutral attribute names, events and property bindings", () => {
    const node = element("input", {
      selfClosing: true,
      attributes: [
        stringAttribute("type", "text"),
        expressionAttribute("className", "['field', open]"),
        expressionAttribute("htmlFor", "properties.name"),
        expressionAttribute("value", "label"),
        expressionAttribute("onClick", "() => setOpen(!open)"),
        booleanAttribute("required"),
      ],
    });

    const template = renderNodeToTemplate(node, CONTEXT);

    expect(template).toContain('type="text"');
    expect(template).toContain("class=${['field', this.open]}");
    expect(template).toContain("for=${this.name}");
    expect(template).toContain(".value=${this.label}");
    expect(template).toContain("@click=${() => this.open = !this.open}");
    expect(template).toContain("required");
    expect(template).not.toContain("rest");
  });

  it("lowers static elements with spreads through the dynamic property path", () => {
    const node = element("ForgeInput", {
      tagKind: "component",
      selfClosing: true,
      attributes: [
        spreadAttribute("modelUpdate"),
        expressionAttribute("modelValue", "value"),
      ],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      '${dynamicElement("forge-input", { ...this.modelUpdate, "~modelValue": this.value }, html``)}',
    );
  });

  it("lowers computed tags to runtime descriptors with scoped bindings", () => {
    const node = dynamicElement("tag", {
      attributes: [
        expressionAttribute("className", "label"),
        expressionAttribute("onClick", "onChange"),
        expressionAttribute("value", "label"),
      ],
      children: [textChild("content")],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      'dynamicElement(this.tag, { "~class": this.label, "@click": this.onChange, "~value": this.label }, html`content`)',
    );
  });

  it("interpolates computed tags when nested in a static element", () => {
    const node = element("div", {
      children: [
        dynamicElement("tag", {
          children: [textChild("content")],
        }),
      ],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      "<div>${dynamicElement(this.tag, {}, html`content`)}</div>",
    );
  });

  it("keeps computed tags as expressions inside conditional children", () => {
    const node = element("div", {
      children: [
        expressionChild("visible ? <Dynamic /> : nothing", [
          dynamicElement("tag", { source: "<Dynamic />" }),
        ]),
      ],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      "<div>${visible ? dynamicElement(this.tag, {}, html``) : nothing}</div>",
    );
  });

  it("keeps static JSX attributes valid inside conditional children", () => {
    const separator = element("span", {
      source: "<span className={styles['separator']}>:</span>",
      attributes: [expressionAttribute("className", "styles['separator']")],
      children: [textChild(":")],
    });
    const node = element("div", {
      children: [
        expressionChild(
          "showSeconds ? <span className={styles['separator']}>:</span> : undefined",
          [separator],
        ),
      ],
    });

    const template = renderNodeToTemplate(node, CONTEXT);

    expect(template).toBe(
      "<div>${this.showSeconds ? html`<span class=${styles['separator']}>:</span>` : nothing}</div>",
    );
  });

  it("keeps static JSX attributes valid in conditional direct-DOM children", () => {
    const separator = element("span", {
      source: "<span className={styles['separator']}>:</span>",
      attributes: [expressionAttribute("className", "styles['separator']")],
      children: [textChild(":")],
    });
    const node = element("div", {
      children: [
        expressionChild(
          "showSeconds ? <span className={styles['separator']}>:</span> : undefined",
          [separator],
        ),
      ],
    });

    const source = renderNodeToDomTemplate(node, CONTEXT);

    const value = source.values.join("\n");
    expect(value).not.toContain("<span this.className");
    expect(value).toContain('this.showSeconds ? dynamicElement("span"');
    expect(value).toContain("styles['separator']");
  });

  it("property-binds dynamic props on components and custom elements", () => {
    const component = element("ForgeSelect", {
      selfClosing: true,
      attributes: [
        expressionAttribute("options", "items"),
        expressionAttribute("modelValue", "label"),
        expressionAttribute("size", "size"),
        expressionAttribute("onUpdateModelValue", "onChange"),
      ],
    });
    const customElement = element("forge-select", {
      selfClosing: true,
      attributes: [expressionAttribute("options", "items")],
    });

    expect(renderNodeToTemplate(component, CONTEXT)).toBe(
      "<forge-select .options=${this.items} .modelValue=${this.label} .size=${this.size} @update-model-value=${this.onChange}></forge-select>",
    );
    expect(renderNodeToTemplate(customElement, CONTEXT)).toBe(
      "<forge-select .options=${this.items}></forge-select>",
    );
  });

  it("strips the Stage-1 static marker", () => {
    const node = element("span", {
      attributes: [booleanAttribute("__mpStatic")],
      children: [textChild("hi")],
    });
    expect(renderNodeToTemplate(node, CONTEXT)).toBe("<span>hi</span>");
  });

  it("flattens a fragment into its children", () => {
    expect(
      renderNodeToTemplate(fragment([element("b"), element("i")]), CONTEXT),
    ).toBe("<b></b><i></i>");
  });

  it("unwraps neutral Teleport markers for the shadow-root target", () => {
    const node = element("Teleport", {
      tagKind: "component",
      attributes: [stringAttribute("to", "body")],
      children: [element("div", { children: [textChild("panel")] })],
    });

    const template = renderNodeToTemplate(node, CONTEXT);

    expect(template).toBe("<div>panel</div>");
    expect(template).not.toContain("<teleport");
  });

  it("keeps nested default slots tied to their owning component children", () => {
    const template = renderNodeToTemplate(
      element("ForgeDrawer", {
        tagKind: "component",
        children: [
          element("nav", {
            children: [element("Slot", { tagKind: "component" })],
          }),
        ],
      }),
      CONTEXT,
    );

    expect(template).toContain(
      '<forge-slot data-mp-forge-slot="true" data-mp-forge-nested="true" .content=\${this.children}',
    );
  });

  it("lowers repeated default and named Slot outlets to native slots", () => {
    const node = element("div", {
      children: [
        element("Slot"),
        element("Slot", { attributes: [stringAttribute("name", "end")] }),
        element("Slot"),
        element("Slot", { attributes: [stringAttribute("name", "end")] }),
      ],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      '<div><slot></slot><slot name="end"></slot><slot></slot><slot name="end"></slot></div>',
    );
  });

  it("keeps static Slot fallback children inside the native outlet", () => {
    const node = element("Slot", {
      children: [element("span", { children: [textChild("Fallback")] })],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      "<slot><span>Fallback</span></slot>",
    );
  });

  it("does not create a nested native outlet across a custom-element boundary", () => {
    const node = element("ForgeDrawer", {
      children: [element("nav", { children: [element("Slot")] })],
    });

    const template = renderNodeToTemplate(node, CONTEXT);

    expect(template).toContain(
      '<forge-slot data-mp-forge-slot="true" data-mp-forge-nested="true" .content=${this.children}></forge-slot>',
    );
    expect(template).not.toContain("<nav><slot></slot></nav>");
  });

  it("lowers exact children passthrough aliases but marks arrays and conditionals", () => {
    const context: TemplateContext = {
      ...CONTEXT,
      slotAliases: new Map([["children", "default"]]),
    };
    const node = element("div", {
      children: [
        expressionChild("children"),
        expressionChild("items.concat(properties.children)"),
        expressionChild("open ? properties.children : undefined"),
      ],
    });

    const template = renderNodeToTemplate(node, context);

    expect(template).toContain("<slot></slot>");
    expect(template).toContain('<forge-slot data-mp-forge-slot="default"');
    expect(template).toContain(
      '<forge-slot data-mp-forge-slot="default" .content=${this.open ? this.children : undefined}></forge-slot>',
    );
    expect(template).toContain(
      '<forge-slot data-mp-forge-slot="default" .content=${this.items.concat(this.children)}></forge-slot>',
    );
  });

  it("uses a runtime marker for dynamic named Slot expressions", () => {
    const node = element("Slot", {
      attributes: [expressionAttribute("name", "slotName")],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      '<forge-slot data-mp-forge-slot="true" .name=${slotName}></forge-slot>',
    );
  });

  it("lowers a conditional child into nested templates", () => {
    const whenTrue = element("b", { source: "<b />", selfClosing: true });
    const whenFalse = element("i", { source: "<i />", selfClosing: true });
    const node = element("div", {
      children: [
        expressionChild("open ? <b /> : <i />", [whenTrue, whenFalse]),
      ],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      "<div>${this.open ? html`<b></b>` : html`<i></i>`}</div>",
    );
  });

  it("lowers a short-circuit child to a nothing branch", () => {
    const shown = element("b", { source: "<b />", selfClosing: true });
    const node = element("div", {
      children: [expressionChild("open && <b />", [shown])],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      "<div>${this.open ? html`<b></b>` : nothing}</div>",
    );
  });

  it("lowers a null branch to nothing", () => {
    const shown = element("b", { source: "<b />", selfClosing: true });
    const node = element("div", {
      children: [expressionChild("open ? <b /> : null", [shown])],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      "<div>${this.open ? html`<b></b>` : nothing}</div>",
    );
  });

  it("lowers a conditional whose markup branch contains a colon", () => {
    // JSX text is not JavaScript: the `:` separating the hours and minutes
    // columns must never be mistaken for the conditional's own colon.
    const separator = element("span", {
      source: "<span className={styles['sep']}>:</span>",
      attributes: [expressionAttribute("className", "styles['sep']")],
      children: [textChild(":")],
    });
    const node = element("div", {
      children: [
        expressionChild(
          "open ? <span className={styles['sep']}>:</span> : undefined",
          [separator],
        ),
      ],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      "<div>${this.open ? html`<span class=${styles['sep']}>:</span>` : nothing}</div>",
    );
  });

  it("lowers every arm of a chained conditional", () => {
    const first = element("b", { source: "<b />", selfClosing: true });
    const second = element("i", { source: "<i />", selfClosing: true });
    const node = element("div", {
      children: [
        expressionChild("open ? <b /> : label ? <i /> : null", [first, second]),
      ],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      "<div>${this.open ? html`<b></b>` : this.label ? html`<i></i>` : nothing}</div>",
    );
  });

  it("splices markup nested inside a map callback", () => {
    const item = element("li", {
      source: "<li>{item}</li>",
      children: [expressionChild("item")],
    });
    const node = element("ul", {
      children: [
        expressionChild("items.map((item) => <li>{item}</li>)", [item]),
      ],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      "<ul>${this.items.map((item) => html`<li>${item}</li>`)}</ul>",
    );
  });

  it("lowers HtmlContent onto an unsafeHtml host", () => {
    const node = element("HtmlContent", {
      selfClosing: true,
      attributes: [
        expressionAttribute("html", "properties.markup"),
        stringAttribute("as", "section"),
        stringAttribute("className", "host"),
      ],
    });

    expect(renderNodeToTemplate(node, CONTEXT)).toBe(
      '<section class="host">${unsafeHtml(this.markup)}</section>',
    );
  });

  it("lowers markup carried by a retained statement", () => {
    const row = element("li", { source: "<li />", selfClosing: true });
    const text = "const rows = items.map(() => <li />);";

    expect(lowerStatementText(text, [row], CONTEXT)).toBe(
      "const rows = this.items.map(() => html`<li></li>`);",
    );
  });
});
