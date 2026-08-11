import { describe, expect, it } from "vitest";

import {
  booleanAttribute,
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
  renderNodeToTemplate,
  type TemplateContext,
} from "./template.ts";

const CONTEXT: TemplateContext = {
  scope: {
    propsParameterName: "properties",
    scoped: new Set(["label", "open", "items"]),
    setters: new Map([["setOpen", "open"]]),
  },
  componentFolders: new Set(["forge-icon"]),
};

describe("the generic render-node lowering", () => {
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
        spreadAttribute("rest"),
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
