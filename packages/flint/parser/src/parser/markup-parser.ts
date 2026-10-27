import type {
  FlintLiteralExpression,
  FlintMarkupAttr,
  FlintMarkupAttribute,
  FlintMarkupAttributeValue,
  FlintMarkupBlockExpression,
  FlintMarkupChild,
  FlintMarkupConditionalBranch,
  FlintMarkupConditionalNode,
  FlintMarkupElementNode,
  FlintMarkupExpressionNode,
  FlintMarkupForNode,
  FlintMarkupSlotAttribute,
  FlintMarkupSlotNode,
  FlintMarkupTagKind,
  FlintMarkupTextNode,
} from "@mission-platform/flint-ast";

import { decodeString, mergeSpans, type ParserContext } from "./context.js";

import type { ExpressionParser } from "./expression-parser.js";

/**
 * Parser responsible for parsing embedded markup templates, JSX/HTML elements,
 * attributes, text nodes, and expression interpolations in Flint.
 */
export class MarkupParser {
  private readonly context: ParserContext;
  private readonly expressionParser: ExpressionParser;
  private emittedWhitespaceBefore = -1;

  public constructor(
    context: ParserContext,
    expressionParser: ExpressionParser,
  ) {
    this.context = context;
    this.expressionParser = expressionParser;
  }

  /**
   * Checks whether the current parser token stream indicates the start of an embedded markup block.
   */
  public isMarkupStart(): boolean {
    const current = this.context.current();
    if (
      current.text === "html" &&
      this.context.tokenAt(this.context.index + 1)?.text === "!"
    ) {
      return true;
    }
    if (current.text === "<") {
      const next = this.context.tokenAt(this.context.index + 1);
      if (next === undefined) return false;
      // `<` followed by identifier, `>`, or `/`
      if (
        next.text === ">" ||
        next.kind === "identifier" ||
        next.kind === "keyword"
      ) {
        return true;
      }
    }
    return false;
  }

  /** Consumes a CSS companion block; its normalized artifact is attached to the parsed module. */
  public parseCssPlaceholder(): FlintLiteralExpression {
    const start = this.context.consume().span;
    this.context.expect(
      "!",
      "FLINT-PARSE-CSS-001",
      "Expected '!' after 'css'.",
    );
    const open = this.context.expect(
      "{",
      "FLINT-PARSE-CSS-002",
      "Expected '{' after 'css!'.",
    );
    let depth = 1;
    let end = open.span;
    while (depth > 0 && !this.context.is("eof")) {
      const token = this.context.consume();
      end = token.span;
      if (token.text === "{") depth += 1;
      if (token.text === "}") depth -= 1;
    }
    return {
      kind: "literal",
      value: 0,
      type: "i32",
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses an embedded markup block: `html! { ... }` or `<tag>...</tag>`.
   */
  public parseMarkupBlock(): FlintMarkupBlockExpression {
    const startSpan = this.context.current().span;

    if (this.context.match("html")) {
      this.context.expect(
        "!",
        "FLINT-PARSE-MKP-001",
        "Expected '!' after 'html' macro.",
      );
      const openBrace = this.context.expect(
        "{",
        "FLINT-PARSE-MKP-002",
        "Expected '{' after 'html!'.",
      );

      const children = this.parseMarkupChildrenUntilEnd("}");
      const endBrace = this.context.expectClosingDelimiter(
        "}",
        openBrace.span,
        "FLINT-PARSE-MKP-003",
        "Expected '}' after html! block.",
      );

      return {
        kind: "markup-block",
        children,
        ...(children[0] === undefined ? {} : { root: children[0] }),
        span: mergeSpans(startSpan, endBrace.span),
      };
    }

    const root = this.parseMarkupChild();
    return {
      kind: "markup-block",
      children: [root],
      root,
      span: root.span,
    };
  }

  /**
   * Parses a single markup child (element, text, interpolation, or slot).
   */
  public parseMarkupChild(): FlintMarkupChild {
    const current = this.context.current();

    if (current.text === "<") {
      return this.parseMarkupElement();
    }

    if (current.text === "{") {
      return this.parseMarkupInterpolation();
    }

    return this.parseMarkupText();
  }

  /**
   * Parses expression interpolation `{ expr }` in markup child position.
   */
  private parseMarkupInterpolation(): FlintMarkupExpressionNode {
    const startSpan = this.context.current().span;
    this.context.consume(); // consume '{'

    const expression = this.expressionParser.parseExpression();
    const end = this.context.expectClosingDelimiter(
      "}",
      startSpan,
      "FLINT-PARSE-MKP-004",
      "Expected '}' after interpolation.",
    ).span;

    return {
      kind: "markup-expression",
      expression,
      span: mergeSpans(startSpan, end),
    };
  }

  /**
   * Parses contiguous literal text between markup tags.
   */
  private parseMarkupText(): FlintMarkupTextNode {
    const startToken = this.context.current();
    const previousToken = this.context.previous();
    const sourceStart =
      previousToken.span.end <= startToken.span.start
        ? previousToken.span.end
        : startToken.span.start;
    let text = "";
    let endSpan = startToken.span;

    while (
      !this.context.is("<") &&
      !this.context.is("{") &&
      !this.context.is("}") &&
      !this.context.is("eof")
    ) {
      const token = this.context.consume();
      text = text === "" ? token.text : `${text} ${token.text}`;
      endSpan = token.span;
    }

    if (this.context.source.length > 0) {
      text = this.context.source.slice(
        sourceStart,
        this.context.current().span.start,
      );
    }

    return {
      kind: "markup-text",
      text,
      span: mergeSpans(startToken.span, endSpan),
    };
  }

  /**
   * Parses a markup element, fragment, slot, or dynamic tag.
   */
  public parseMarkupElement():
    | FlintMarkupElementNode
    | FlintMarkupSlotNode
    | FlintMarkupConditionalNode
    | FlintMarkupForNode {
    const openLt = this.context.expect(
      "<",
      "FLINT-PARSE-MKP-005",
      "Expected '<' to start markup element.",
    );
    const isFragment = this.context.match(">");

    if (isFragment) {
      const children = this.parseMarkupChildrenUntilClose("");
      const endSpan = this.context.previous().span;
      return {
        kind: "markup-element",
        tag: "Fragment",
        tagKind: "fragment",
        selfClosing: false,
        attributes: [],
        children,
        span: mergeSpans(openLt.span, endSpan),
      };
    }

    const tagToken = this.context.consume();
    const tagName = tagToken.text;
    const isSlot = tagName === "Slot" || tagName === "slot";

    const attributes = this.parseAttributes();

    const isSelfClosing = this.context.match("/");
    this.context.expect(
      ">",
      "FLINT-PARSE-MKP-006",
      "Expected '>' or '/>' to close opening tag.",
    );

    if (isSelfClosing) {
      const endSpan = this.context.previous().span;
      if (isSlot) {
        const nameAttr = attributes.find(
          (a): a is FlintMarkupAttribute =>
            a.kind === "markup-attribute" && a.name === "name",
        );
        const slotName =
          nameAttr?.value?.kind === "string" ? nameAttr.value.value : "default";
        return {
          kind: "markup-slot",
          name: slotName,
          span: mergeSpans(openLt.span, endSpan),
        };
      }

      return this.applyStructuralDirective(
        {
          kind: "markup-element",
          tag: tagName,
          tagKind: this.resolveTagKind(tagName, attributes),
          selfClosing: true,
          attributes,
          children: [],
          span: mergeSpans(openLt.span, endSpan),
        },
        attributes,
      );
    }

    const children = this.parseMarkupChildrenUntilClose(tagName);
    const endSpan = this.context.previous().span;

    if (isSlot) {
      const nameAttr = attributes.find(
        (a): a is FlintMarkupAttribute =>
          a.kind === "markup-attribute" && a.name === "name",
      );
      const slotName =
        nameAttr?.value?.kind === "string" ? nameAttr.value.value : "default";
      return {
        kind: "markup-slot",
        name: slotName,
        fallback: children,
        span: mergeSpans(openLt.span, endSpan),
      };
    }

    return this.applyStructuralDirective(
      {
        kind: "markup-element",
        tag: tagName,
        tagKind: this.resolveTagKind(tagName, attributes),
        selfClosing: false,
        attributes,
        children,
        span: mergeSpans(openLt.span, endSpan),
      },
      attributes,
    );
  }

  private applyStructuralDirective(
    element: FlintMarkupElementNode,
    attributes: readonly FlintMarkupAttr[],
  ): FlintMarkupElementNode | FlintMarkupConditionalNode | FlintMarkupForNode {
    const ifAttribute = attributes.find(
      (attribute): attribute is FlintMarkupAttribute =>
        attribute.kind === "markup-attribute" &&
        (attribute.name === "#if" || attribute.name === "if"),
    );
    const forAttribute = attributes.find(
      (attribute): attribute is FlintMarkupAttribute =>
        attribute.kind === "markup-attribute" && attribute.name === "#for",
    );
    const withoutDirectives = element.attributes.filter(
      (attribute) =>
        attribute.kind !== "markup-attribute" ||
        !["#if", "if", "#for"].includes(attribute.name),
    );
    const cleanElement = { ...element, attributes: withoutDirectives };
    if (ifAttribute?.value?.kind === "expression") {
      return {
        kind: "markup-conditional",
        condition: ifAttribute.value.expression,
        truthy: [cleanElement],
        span: element.span,
      };
    }
    if (forAttribute?.value?.kind === "expression") {
      return {
        kind: "markup-for",
        items: forAttribute.value.expression,
        directiveBindings: {
          itemName: "item",
          indexName: "index",
          iterableName: "iterable",
          span: forAttribute.span,
        },
        children: [cleanElement],
        span: element.span,
      };
    }
    return element;
  }

  /**
   * Resolves the tag classification: 'element' | 'component' | 'fragment' | 'dynamic'.
   */
  private resolveTagKind(
    tagName: string,
    attributes: readonly FlintMarkupAttr[],
  ): FlintMarkupTagKind {
    if (tagName === "Fragment" || tagName === "") {
      return "fragment";
    }
    if (tagName === "Dynamic" || tagName === "dynamic") {
      return "dynamic";
    }
    const hasDynamicTagAttr = attributes.some(
      (a) => a.kind === "markup-attribute" && a.name === "tag",
    );
    if (
      tagName === "Dynamic" ||
      (tagName === "component" && hasDynamicTagAttr)
    ) {
      return "dynamic";
    }
    return /^[a-z]/.test(tagName) ? "element" : "component";
  }

  /**
   * Parses the attribute list on an opening tag.
   */
  private parseAttributes(): FlintMarkupAttr[] {
    const attributes: FlintMarkupAttr[] = [];

    while (
      !this.context.is(">") &&
      !this.context.is("/") &&
      !this.context.is("eof")
    ) {
      const startSpan = this.context.current().span;

      // Spread attribute `{...props}`
      if (this.context.match("{")) {
        if (this.context.match(".")) {
          this.context.match(".");
          this.context.match(".");
        }
        const expression = this.expressionParser.parseExpression();
        const end = this.context.expectClosingDelimiter(
          "}",
          startSpan,
          "FLINT-PARSE-MKP-007",
          "Expected '}' after spread attribute.",
        ).span;
        attributes.push({
          kind: "markup-spread-attribute",
          expression,
          span: mergeSpans(startSpan, end),
        });
        continue;
      }

      // Named attribute `name="val"`, `name={expr}`, `aria-label="val"`, or boolean flag `disabled`
      const attrName = this.parseAttributeName();
      if (attrName === undefined) {
        this.context.consume();
        continue;
      }

      let value: FlintMarkupAttributeValue | undefined;
      let attrEndSpan = this.context.previous().span;

      if (this.context.match("=")) {
        if (this.context.current().kind === "string") {
          const stringToken = this.context.consume();
          value = {
            kind: "string",
            value: decodeString(stringToken.text),
            span: stringToken.span,
          };
          attrEndSpan = stringToken.span;
        } else if (this.context.match("{")) {
          const exprStart = this.context.previous().span;
          const expression = this.expressionParser.parseExpression();
          const exprEnd = this.context.expectClosingDelimiter(
            "}",
            exprStart,
            "FLINT-PARSE-MKP-008",
            "Expected '}' after attribute expression.",
          ).span;
          value = {
            kind: "expression",
            expression,
            span: mergeSpans(exprStart, exprEnd),
          };
          attrEndSpan = exprEnd;
        } else if (this.context.current().kind === "number") {
          const numToken = this.context.consume();
          value = {
            kind: "string",
            value: numToken.text,
            span: numToken.span,
          };
          attrEndSpan = numToken.span;
        }
      }

      if (
        attrName === "#slot" ||
        attrName.startsWith("#slot:") ||
        attrName === "slot" ||
        attrName.startsWith("slot:")
      ) {
        const payload =
          value?.kind === "expression" ? value.expression : undefined;
        if (payload !== undefined) {
          const rawName = attrName
            .slice(attrName.startsWith("#") ? "#slot".length : "slot".length)
            .replace(/^:/u, "");
          const name =
            rawName === "" || rawName === "children" ? "default" : rawName;
          const slotAttribute: FlintMarkupSlotAttribute = {
            kind: "markup-slot-attribute",
            name,
            payload,
            span: mergeSpans(startSpan, attrEndSpan),
          };
          attributes.push(slotAttribute);
          continue;
        }
      }

      attributes.push({
        kind: "markup-attribute",
        name: attrName,
        ...(value ? { value } : {}),
        span: mergeSpans(startSpan, attrEndSpan),
      });
    }

    return attributes;
  }

  /**
   * Parses an attribute name, supporting hyphens, colons, and keywords (e.g. `aria-label`, `stroke-width`, `as`, `class`, `for`).
   */
  private parseAttributeName(): string | undefined {
    const token = this.context.current();
    const hashDirectiveToken =
      token.kind === "punctuation" && token.text === "#"
        ? this.context.tokenAt(this.context.index + 1)
        : undefined;
    const hashDirectiveName =
      hashDirectiveToken !== undefined &&
      (hashDirectiveToken.kind === "identifier" ||
        hashDirectiveToken.kind === "keyword") &&
      token.span.end === hashDirectiveToken.span.start;
    if (
      token.kind !== "identifier" &&
      token.kind !== "keyword" &&
      !hashDirectiveName
    ) {
      return undefined;
    }

    let name: string;
    if (hashDirectiveName) {
      this.context.consume();
      name = `#${this.context.consume().text}`;
    } else {
      name = this.context.consume().text;
    }

    // Handle kebab-cased names: `aria-hidden`, `stroke-width`, `data-testid`
    while (
      (this.context.is("-") || this.context.is(":")) &&
      (this.context.tokenAt(this.context.index + 1)?.kind === "identifier" ||
        this.context.tokenAt(this.context.index + 1)?.kind === "keyword")
    ) {
      const sep = this.context.consume().text;
      const part = this.context.consume().text;
      name = `${name}${sep}${part}`;
    }

    return name;
  }

  /**
   * Parses children until matching `</tagName>` or `</>` is encountered.
   */
  private parseMarkupChildrenUntilClose(
    openingTagName: string,
  ): FlintMarkupChild[] {
    const children: FlintMarkupChild[] = [];

    while (!this.context.is("eof")) {
      const interNodeWhitespace = this.parseInterNodeWhitespace();
      if (interNodeWhitespace !== undefined) {
        children.push(interNodeWhitespace);
        continue;
      }
      if (
        this.context.is("<") &&
        this.context.tokenAt(this.context.index + 1)?.text === "/"
      ) {
        // Closing tag `</tagName>` or `</>`
        this.context.consume(); // consume '<'
        this.context.consume(); // consume '/'

        if (openingTagName === "" || openingTagName === "Fragment") {
          this.context.expect(
            ">",
            "FLINT-PARSE-MKP-009",
            "Expected '>' for closing fragment tag '</>'.",
          );
        } else {
          this.context.expectIdentifier(
            "FLINT-PARSE-010",
            `Expected closing tag name '${openingTagName}'.`,
          );
          this.context.expect(
            ">",
            "FLINT-PARSE-MKP-011",
            "Expected '>' after closing tag name.",
          );
        }
        break;
      }

      if (this.context.is("}")) {
        break;
      }

      const child = this.parseMarkupChild();
      children.push(child);
    }

    return this.normalizeDirectiveChildren(children);
  }

  private parseInterNodeWhitespace(): FlintMarkupTextNode | undefined {
    if (!this.context.is("<") && !this.context.is("{")) return undefined;
    const previous = this.context.previous();
    const current = this.context.current();
    if (previous.text !== ">" && previous.text !== "}") return undefined;
    if (this.emittedWhitespaceBefore === current.span.start) return undefined;
    const raw = this.context.source.slice(
      previous.span.end,
      current.span.start,
    );
    if (raw.length === 0 || raw.trim().length > 0 || /[\r\n]/u.test(raw)) {
      return undefined;
    }
    this.emittedWhitespaceBefore = current.span.start;
    return {
      kind: "markup-text",
      text: raw,
      span: {
        start: previous.span.end,
        end: current.span.start,
        line: previous.span.endLine,
        column: previous.span.endColumn,
        endLine: current.span.line,
        endColumn: current.span.column,
      },
    };
  }

  public parseMarkupChildrenUntilEnd(endToken = "eof"): FlintMarkupChild[] {
    const children: FlintMarkupChild[] = [];
    while (!this.context.is(endToken) && !this.context.is("eof")) {
      const interNodeWhitespace = this.parseInterNodeWhitespace();
      if (interNodeWhitespace !== undefined) {
        children.push(interNodeWhitespace);
        continue;
      }
      const startIndex = this.context.index;
      children.push(this.parseMarkupChild());
      if (this.context.index === startIndex) this.context.consume();
    }
    return this.normalizeDirectiveChildren(children);
  }

  private normalizeDirectiveChildren(
    children: readonly FlintMarkupChild[],
  ): FlintMarkupChild[] {
    const normalized: FlintMarkupChild[] = [];
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      if (child === undefined) continue;
      if (child.kind !== "markup-element") {
        normalized.push(child);
        continue;
      }
      const elseif = child.attributes.find(
        (attribute): attribute is FlintMarkupAttribute =>
          attribute.kind === "markup-attribute" &&
          (attribute.name === "#elseif" || attribute.name === "elseif"),
      );
      const elseAttribute = child.attributes.find(
        (attribute): attribute is FlintMarkupAttribute =>
          attribute.kind === "markup-attribute" &&
          (attribute.name === "#else" || attribute.name === "else"),
      );
      if (elseif !== undefined || elseAttribute !== undefined) {
        const previous = normalized.at(-1);
        if (previous?.kind === "markup-conditional") {
          const clean = {
            ...child,
            attributes: child.attributes.filter(
              (attribute) =>
                attribute.kind !== "markup-attribute" ||
                ![
                  "#if",
                  "if",
                  "#for",
                  "#elseif",
                  "elseif",
                  "#else",
                  "else",
                ].includes(attribute.name),
            ),
          };
          if (elseif?.value?.kind === "expression") {
            const branches = previous.elseif ?? [];
            normalized[normalized.length - 1] = {
              ...previous,
              elseif: [
                ...branches,
                {
                  kind: "markup-conditional-branch",
                  condition: elseif.value.expression,
                  children: [clean],
                  span: child.span,
                } satisfies FlintMarkupConditionalBranch,
              ],
            };
          } else if (elseAttribute !== undefined) {
            normalized[normalized.length - 1] = {
              ...previous,
              fallback: [clean],
            };
          }
          continue;
        }
      }
      normalized.push(child);
    }
    return normalized;
  }
}
