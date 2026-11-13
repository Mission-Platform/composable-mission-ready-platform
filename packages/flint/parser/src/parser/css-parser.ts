import type {
  FlintCssAtRule,
  FlintCssClassMapNode,
  FlintCssDeclaration,
  FlintCssPropertyBinding,
  FlintCssRule,
  FlintDiagnostic,
  FlintSourceSpan,
  FlintStyleCompanion,
} from "@mission-platform/flint-ast";
import { createDiagnostic } from "@mission-platform/flint-ast";

function spanAt(source: string, start: number, end: number): FlintSourceSpan {
  const beforeStart = source.slice(0, start);
  const beforeEnd = source.slice(0, end);
  const startLine = beforeStart.split("\n").length;
  const endLine = beforeEnd.split("\n").length;
  return {
    start,
    end,
    line: startLine,
    column: start - (beforeStart.lastIndexOf("\n") + 1) + 1,
    endLine,
    endColumn: end - (beforeEnd.lastIndexOf("\n") + 1) + 1,
  };
}

function matchingBrace(source: string, open: number): number {
  let depth = 0;
  let comment = false;
  let quote: '"' | "'" | undefined;
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const character = source[index] ?? "";
    const next = source[index + 1] ?? "";
    if (comment) {
      if (character === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== undefined) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }
    if (character === "/" && next === "*") {
      comment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}" && --depth === 0) return index;
  }
  return source.length;
}

function nextCssDelimiter(
  source: string,
  start: number,
  end: number,
): { readonly index: number; readonly character: "{" | ";" } | undefined {
  let comment = false;
  let quote: '"' | "'" | undefined;
  let escaped = false;
  for (let index = start; index < end; index += 1) {
    const character = source[index] ?? "";
    const next = source[index + 1] ?? "";
    if (comment) {
      if (character === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== undefined) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }
    if (character === "/" && next === "*") {
      comment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "{" || character === ";") {
      return { index, character };
    }
  }
  return undefined;
}

/** Removes comments without treating comment markers inside CSS strings as comments. */
function stripCssComments(source: string): string {
  let result = "";
  let comment = false;
  let quote: '"' | "'" | undefined;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? "";
    const next = source[index + 1] ?? "";
    if (comment) {
      if (character === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== undefined) {
      result += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }
    if (character === "/" && next === "*") {
      comment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    result += character;
  }
  return result;
}

interface ParsedCssBlock {
  readonly rules: FlintCssRule[];
  readonly atRules: FlintCssAtRule[];
  readonly declarations: FlintCssDeclaration[];
}

export interface FlintCssBindingOccurrence {
  readonly start: number;
  readonly end: number;
  readonly property?: string;
  readonly cssVariable?: string;
}

export interface FlintCssBindingScanResult {
  readonly valid: readonly FlintCssBindingOccurrence[];
  readonly invalid: readonly FlintCssBindingOccurrence[];
}

function isCssIdentifierCharacter(character: string | undefined): boolean {
  return character !== undefined && /[\w-]/u.test(character);
}

function bindingClose(value: string, open: number): number | undefined {
  let depth = 1;
  let quote: '"' | "'" | undefined;
  let comment = false;
  let escaped = false;
  for (let index = open + 1; index < value.length; index += 1) {
    const character = value[index] ?? "";
    const next = value[index + 1] ?? "";
    if (comment) {
      if (character === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== undefined) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "/" && next === "*") {
      comment = true;
      index += 1;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")" && --depth === 0) {
      return index;
    }
  }
  return undefined;
}

/** Scans CSS binding calls while respecting identifiers, strings, comments, and nested functions. */
export function scanCssPropertyBindings(
  value: string,
): FlintCssBindingScanResult {
  const valid: FlintCssBindingOccurrence[] = [];
  const invalid: FlintCssBindingOccurrence[] = [];
  let quote: '"' | "'" | undefined;
  let comment = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? "";
    const next = value[index + 1] ?? "";
    if (comment) {
      if (character === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== undefined) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "/" && next === "*") {
      comment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (
      !value.startsWith("bind(", index) ||
      isCssIdentifierCharacter(value[index - 1])
    )
      continue;
    const close = bindingClose(value, index + "bind".length);
    if (close === undefined) {
      invalid.push({ start: index, end: value.length });
      break;
    }
    const bindingMatch = /^\s*([A-Za-z_]\w*)\s*,\s*(--[\w-]+)\s*$/u.exec(
      value.slice(index + "bind(".length, close),
    );
    if (bindingMatch?.[1] === undefined || bindingMatch[2] === undefined) {
      invalid.push({ start: index, end: close + 1 });
    } else {
      valid.push({
        start: index,
        end: close + 1,
        property: bindingMatch[1],
        cssVariable: bindingMatch[2],
      });
    }
    index = close;
  }
  return { valid, invalid };
}

function skipCssTrivia(source: string, start: number, end: number): number {
  let index = start;
  while (index < end) {
    while (/\s/u.test(source[index] ?? "")) index += 1;
    if (source[index] !== "/" || source[index + 1] !== "*") return index;
    const close = source.indexOf("*/", index + 2);
    index = close < 0 ? end : close + 2;
  }
  return index;
}

function declaration(
  source: string,
  start: number,
  end: number,
  fileName: string,
  diagnostics: FlintDiagnostic[],
): FlintCssDeclaration | undefined {
  const valueStartCandidate = skipCssTrivia(source, start, end);
  const text = source.slice(valueStartCandidate, end);
  const match = /^([\w-]+)\s*:\s*/u.exec(text);
  if (match?.[1] === undefined) return undefined;
  let valueStart = valueStartCandidate + match[0].length;
  while (/\s/u.test(source[valueStart] ?? "")) valueStart += 1;
  let valueEnd = end;
  while (/\s/u.test(source[valueEnd - 1] ?? "")) valueEnd -= 1;
  if (source[valueEnd - 1] === ";") {
    valueEnd -= 1;
    while (/\s/u.test(source[valueEnd - 1] ?? "")) valueEnd -= 1;
  }
  if (valueStart >= valueEnd) return undefined;
  const value = source.slice(valueStart, valueEnd);
  const scanned = scanCssPropertyBindings(value);
  const bindings: FlintCssPropertyBinding[] = scanned.valid.flatMap(
    ({ start: bindingStart, end: bindingEnd, property, cssVariable }) =>
      property === undefined || cssVariable === undefined
        ? []
        : [
            {
              kind: "css-property-binding",
              property,
              cssVariable,
              valueStart: bindingStart,
              valueEnd: bindingEnd,
              span: spanAt(
                source,
                valueStart + bindingStart,
                valueStart + bindingEnd,
              ),
            },
          ],
  );
  for (const invalid of scanned.invalid) {
    diagnostics.push(
      createDiagnostic(
        fileName,
        "parse",
        "FLINT-CSS-002",
        "Invalid CSS property binding; expected bind(property, --variable).",
        spanAt(source, valueStart + invalid.start, valueStart + invalid.end),
        "error",
        "Use bind(property, --variable) for CSS property bindings.",
        { blocking: true },
      ),
    );
  }
  const binding = bindings[0];
  return {
    kind: "css-declaration",
    property: match[1],
    value,
    ...(bindings.length === 0 ? {} : { bindings }),
    ...(binding === undefined ? {} : { binding }),
    ...(scanned.invalid.length === 0
      ? {}
      : {
          invalidBindingSpans: scanned.invalid.map(
            ({ start: bindingStart, end: bindingEnd }) =>
              spanAt(
                source,
                valueStart + bindingStart,
                valueStart + bindingEnd,
              ),
          ),
        }),
    span: spanAt(source, start, end),
  };
}

function rules(
  source: string,
  start: number,
  end: number,
  fileName: string,
  diagnostics: FlintDiagnostic[],
): ParsedCssBlock {
  const parsedRules: FlintCssRule[] = [];
  const parsedAtRules: FlintCssAtRule[] = [];
  const parsedDeclarations: FlintCssDeclaration[] = [];
  let cursor = start;
  while (cursor < end) {
    while (/\s/u.test(source[cursor] ?? "")) cursor += 1;
    if (cursor >= end || source[cursor] === "}") break;
    const delimiter = nextCssDelimiter(source, cursor, end);
    const open = delimiter?.character === "{" ? delimiter.index : -1;
    const semicolon = delimiter?.character === ";" ? delimiter.index : -1;
    if (semicolon >= 0) {
      const parsed = declaration(
        source,
        cursor,
        semicolon + 1,
        fileName,
        diagnostics,
      );
      if (parsed !== undefined) parsedDeclarations.push(parsed);
      cursor = semicolon + 1;
      continue;
    }
    if (open < 0) {
      const parsed = declaration(source, cursor, end, fileName, diagnostics);
      if (parsed !== undefined) parsedDeclarations.push(parsed);
      break;
    }
    const close = Math.min(matchingBrace(source, open), end);
    const prelude = stripCssComments(source.slice(cursor, open)).trim();
    const span = spanAt(source, cursor, Math.min(close + 1, source.length));
    const nested = rules(source, open + 1, close, fileName, diagnostics);
    if (prelude.startsWith("@")) {
      const match = /^@([\w-]+)\s*(.*)$/u.exec(prelude);
      parsedAtRules.push({
        kind: "css-at-rule",
        name: match?.[1] ?? prelude.slice(1),
        prelude: match?.[2]?.trim() ?? "",
        rules: nested.rules,
        declarations: nested.declarations,
        ...(nested.atRules.length === 0 ? {} : { atRules: nested.atRules }),
        span,
      });
    } else {
      parsedRules.push({
        kind: "css-rule",
        selector: prelude,
        declarations: nested.declarations,
        ...(nested.rules.length === 0 ? {} : { children: nested.rules }),
        ...(nested.atRules.length === 0 ? {} : { atRules: nested.atRules }),
        span,
      });
    }
    cursor = Math.max(close + 1, cursor + 1);
  }
  return {
    rules: parsedRules,
    atRules: parsedAtRules,
    declarations: parsedDeclarations,
  };
}

function classNames(selector: string): readonly string[] {
  return [...selector.matchAll(/\.([A-Za-z_][\w-]*)/gu)]
    .map((match) => match[1])
    .filter((name): name is string => name !== undefined);
}

function appendClassMap(
  rules: readonly FlintCssRule[],
  target: FlintCssClassMapNode[],
  parentSelector?: string,
): void {
  for (const rule of rules) {
    const selectorParts = rule.selector.split(",").map((part) => part.trim());
    for (const selector of selectorParts) {
      const names = classNames(selector);
      let current = target;
      let lastSelector = parentSelector;
      for (const className of names) {
        let node = current.find(
          (candidate) => candidate.className === className,
        );
        if (node === undefined) {
          node = {
            kind: "css-class-map-node",
            className,
            selector:
              lastSelector === undefined
                ? selector
                : `${lastSelector} ${selector}`,
            children: [],
            span: rule.span,
          };
          current.push(node);
        }
        current = node.children as FlintCssClassMapNode[];
        lastSelector = node.selector;
      }
      if (rule.children !== undefined) {
        appendClassMap(rule.children, current, lastSelector);
      }
      if (rule.atRules !== undefined) {
        appendAtRuleClassMap(rule.atRules, current, lastSelector);
      }
    }
  }
}

function appendAtRuleClassMap(
  rules: readonly FlintCssAtRule[],
  target: FlintCssClassMapNode[],
  parentSelector?: string,
): void {
  for (const rule of rules) {
    const selector =
      parentSelector === undefined
        ? rule.prelude
        : `${parentSelector} ${rule.prelude}`;
    appendClassMap(rule.rules, target, selector);
    if (rule.atRules !== undefined) {
      appendAtRuleClassMap(rule.atRules, target, selector);
    }
  }
}

/** Parses all `css! { ... }` blocks while preserving CSS source ranges. */
export function parseCssCompanions(
  source: string,
  ownerModule: string,
  fileName = ownerModule,
): readonly FlintStyleCompanion[] {
  const companions: FlintStyleCompanion[] = [];
  const marker = /\bcss\s*!\s*\{/gu;
  for (const match of source.matchAll(marker)) {
    const markerStart = match.index ?? 0;
    const open = source.indexOf("{", markerStart);
    if (open < 0) continue;
    const close = matchingBrace(source, open);
    const bindingName = /\blet\s+([A-Za-z_]\w*)\s*=\s*$/u.exec(
      source.slice(Math.max(0, markerStart - 128), markerStart),
    )?.[1];
    companions.push(
      parseCssCompanionRegion(
        source,
        open + 1,
        close,
        ownerModule,
        bindingName,
        spanAt(source, markerStart, Math.min(close + 1, source.length)),
        fileName,
      ),
    );
  }
  return companions;
}

/** Parses a raw component style region using the same CSS companion contract. */
export function parseCssCompanionRegion(
  source: string,
  start: number,
  end: number,
  ownerModule: string,
  bindingName = "styles",
  regionSpan = spanAt(source, start, end),
  fileName = ownerModule,
): FlintStyleCompanion {
  const diagnostics: FlintDiagnostic[] = [];
  const parsed = rules(source, start, end, fileName, diagnostics);
  const classMap: FlintCssClassMapNode[] = [];
  appendClassMap(parsed.rules, classMap);
  appendAtRuleClassMap(parsed.atRules, classMap);
  return {
    kind: "style-companion",
    ownerModule,
    bindingName,
    rules: parsed.rules,
    atRules: parsed.atRules,
    classMap,
    propertyRegistrations: parsed.atRules
      .filter(({ name }) => name === "property")
      .map(({ prelude }) => prelude.trim())
      .filter((property) => property.startsWith("--")),
    diagnostics,
    span: regionSpan,
  };
}

/**
 * Validates statically indexed accesses into a `css!` class map.
 *
 * @param source - Flint source containing indexed style accesses.
 * @param companions - Parsed style companions available to the module.
 * @param fileName - Source name used in diagnostics.
 * @returns Diagnostics for missing class-map paths.
 */
export function validateCssClassMapPaths(
  source: string,
  companions: readonly FlintStyleCompanion[],
  fileName: string,
): readonly FlintDiagnostic[] {
  const diagnostics: FlintDiagnostic[] = [];
  const companion =
    companions.find(({ bindingName }) => bindingName === "styles") ??
    companions[0];
  if (companion === undefined) return diagnostics;
  const map = companion.classMap ?? [];
  const access = /\b(?:styles|style)(?:\s*\[\s*["']([^"']+)["']\s*\])+/gu;
  for (const match of source.matchAll(access)) {
    const path = [...match[0].matchAll(/["']([^"']+)["']/gu)].map(
      ([, className]) => className,
    );
    let current = map;
    let missing: string | undefined;
    for (const className of path) {
      const node = current.find(
        ({ className: candidate }) => candidate === className,
      );
      if (node === undefined) {
        missing = className;
        break;
      }
      current = node.children;
    }
    if (missing === undefined) continue;
    const start = match.index ?? 0;
    diagnostics.push({
      code: "FLINT-CSS-001",
      phase: "type-check",
      severity: "warning",
      message: `Unknown CSS class reference '${missing}'.`,
      fileName,
      span: spanAt(source, start, start + match[0].length),
      hint: "Add a matching local class selector to the component style block.",
      blocking: false,
    });
  }
  const staticClass = /\bclass\s*=\s*["']([^"']*)["']/gu;
  const knownClasses = new Set<string>();
  const collect = (nodes: readonly FlintCssClassMapNode[]): void => {
    for (const node of nodes) {
      knownClasses.add(node.className);
      collect(node.children);
    }
  };
  collect(map);
  for (const match of source.matchAll(staticClass)) {
    for (const className of match[1]?.split(/\s+/u).filter(Boolean) ?? []) {
      if (knownClasses.has(className)) continue;
      const start = (match.index ?? 0) + match[0].indexOf(className);
      diagnostics.push({
        code: "FLINT-CSS-001",
        phase: "type-check",
        severity: "warning",
        message: `Unknown CSS class reference '${className}'.`,
        fileName,
        span: spanAt(source, start, start + className.length),
        hint: "Add a matching local class selector to the component style block.",
        blocking: false,
      });
    }
  }
  return diagnostics;
}
