import type {
  FlintGenericParameter,
  FlintPrimitiveType,
  FlintSourceSpan,
  FlintTypeName,
} from "@mission-platform/flint-ast";

import { mergeSpans, type ParserContext, primitiveTypes } from "./context.js";

/**
 * Sub-parser responsible for primitive types, generics, trait bounds, and array type specifications.
 */
export class TypeParser {
  private readonly context: ParserContext;

  public constructor(context: ParserContext) {
    this.context = context;
  }

  /**
   * Parses generic type parameter declarations enclosed in angle brackets.
   *
   * @returns Array of parsed generic parameters.
   */
  // skipcq: JS-R1005
  public parseGenericParameters(): FlintGenericParameter[] {
    if (!this.context.match("<")) return [];
    const parameters: FlintGenericParameter[] = [];
    while (!this.context.is(">") && !this.context.is("eof")) {
      const start = this.context.current().span;
      const name = this.context.expectIdentifier(
        "FLINT-PARSE-031",
        "Expected a generic parameter name.",
      );
      const bounds: string[] = [];
      if (this.context.match(":")) {
        do {
          const bound = this.context.expectIdentifier(
            "FLINT-PARSE-032",
            "Expected an interface bound.",
          );
          if (bound !== undefined) bounds.push(bound);
        } while (this.context.match("+"));
      }
      parameters.push({
        kind: "generic-parameter",
        name: name ?? "<missing>",
        bounds,
        span: mergeSpans(start, this.context.previous().span),
      });
      if (!this.context.match(",")) break;
    }
    this.context.expect(
      ">",
      "FLINT-PARSE-033",
      "Expected '>' after generic parameters.",
    );
    return parameters;
  }

  /**
   * Parses a fixed-size array type specification.
   *
   * @param typeStart - Start position span.
   * @param referenceStart - Whether preceded by a reference operator.
   * @param mutableReference - Whether reference is mutable.
   * @returns Parsed fixed array type AST node.
   */
  private parseFixedArrayType(
    typeStart: FlintSourceSpan,
    referenceStart: boolean,
    mutableReference: boolean,
  ): FlintTypeName {
    const element = this.parseType();
    this.context.expect(
      ";",
      "FLINT-PARSE-080",
      "Expected ';' before a fixed array length.",
    );
    const lengthToken = this.context.expectKind(
      "number",
      "FLINT-PARSE-081",
      "Expected a fixed array length.",
    );
    const end = this.context.expectClosingDelimiter(
      "]",
      typeStart,
      "FLINT-PARSE-082",
      "Expected ']' after a fixed array type.",
    ).span;
    return {
      kind: "type-name",
      name: "unit",
      reference: "Array",
      arguments: [element],
      length: Number(lengthToken.text || "0"),
      ...(referenceStart
        ? {
            referenceMode: mutableReference
              ? ("mut-ref" as const)
              : ("ref" as const),
          }
        : {}),
      span: mergeSpans(typeStart, end),
    };
  }

  /**
   * Resolves the identifier or keyword string representing the base type name.
   *
   * @returns Type name token string.
   */
  private resolveTypeNameToken(): string {
    const nameToken = this.context.current();
    const isNamed =
      nameToken.kind === "identifier" || nameToken.kind === "keyword";
    return isNamed ? nameToken.text : "unit";
  }

  /**
   * Resolves reference mode qualifier (ref or mut-ref) based on preceding tokens.
   *
   * @param referenceStart - Whether an ampersand was consumed.
   * @param mutableReference - Whether mut was consumed.
   * @returns Resolved reference mode or undefined.
   */
  private static resolveReferenceMode(
    referenceStart: boolean,
    mutableReference: boolean,
  ): "mut-ref" | "ref" | undefined {
    if (!referenceStart) return undefined;
    return mutableReference ? "mut-ref" : "ref";
  }

  /**
   * Parses a base type name node with optional type arguments and reference qualifiers.
   *
   * @param typeStart - Start position span.
   * @param referenceStart - Whether preceded by reference.
   * @param mutableReference - Whether reference is mutable.
   * @returns Parsed base type name AST node.
   */
  // skipcq: JS-R1005
  private parseBaseTypeName(
    typeStart: FlintSourceSpan,
    referenceStart: boolean,
    mutableReference: boolean,
  ): FlintTypeName {
    const name = this.resolveTypeNameToken();
    this.context.consume();
    const arguments_ = this.context.is("<")
      ? this.parseTypeArguments()
      : undefined;
    const primitive = primitiveTypes.has(name as FlintPrimitiveType)
      ? (name as FlintPrimitiveType)
      : "unit";
    // skipcq: JS-0105
    const referenceMode = TypeParser.resolveReferenceMode(
      referenceStart,
      mutableReference,
    );
    return {
      kind: "type-name",
      name: primitive,
      ...(primitive === "unit" && name !== "unit" ? { reference: name } : {}),
      ...(arguments_ === undefined ? {} : { arguments: arguments_ }),
      ...(referenceMode === undefined ? {} : { referenceMode }),
      span: mergeSpans(typeStart, this.context.previous().span),
    };
  }

  /**
   * Parses a full type specification including pointers, references, and array wrappers.
   *
   * @returns Parsed type name AST node.
   */
  // skipcq: JS-R1005
  public parseType(): FlintTypeName {
    return this.context.withDepthGuard<FlintTypeName>(
      () => ({
        kind: "type-name",
        name: "unit",
        span: this.context.current().span,
      }),
      () => {
        const token = this.context.current();
        const referenceStart = this.context.match("&");
        const mutableReference = referenceStart && this.context.match("mut");
        const typeStart = referenceStart
          ? token.span
          : this.context.current().span;
        if (this.context.match("[")) {
          return this.parseFixedArrayType(
            typeStart,
            referenceStart,
            mutableReference,
          );
        }
        const baseType = this.parseBaseTypeName(
          typeStart,
          referenceStart,
          mutableReference,
        );
        if (this.context.match("[")) {
          const openSpan = this.context.previous().span;
          const end = this.context.expectClosingDelimiter(
            "]",
            openSpan,
            "FLINT-PARSE-084",
            "Expected ']' after a dynamic array type.",
          ).span;
          return {
            kind: "type-name",
            name: "unit",
            reference: "Array",
            arguments: [baseType],
            ...(referenceStart
              ? {
                  referenceMode: mutableReference
                    ? ("mut-ref" as const)
                    : ("ref" as const),
                }
              : {}),
            span: mergeSpans(typeStart, end),
          };
        }
        return baseType;
      },
    );
  }

  /**
   * Parses type arguments enclosed in angle brackets.
   *
   * @returns Array of parsed type argument AST nodes.
   */
  public parseTypeArguments(): FlintTypeName[] {
    const openToken = this.context.expect(
      "<",
      "FLINT-PARSE-053",
      "Expected '<' before type arguments.",
    );
    const arguments_: FlintTypeName[] = [];
    while (!this.context.is(">") && !this.context.is("eof")) {
      arguments_.push(this.parseType());
      if (!this.context.match(",")) break;
    }
    this.context.expectClosingDelimiter(
      ">",
      openToken.span,
      "FLINT-PARSE-054",
      "Expected '>' after type arguments.",
    );
    return arguments_;
  }
}
