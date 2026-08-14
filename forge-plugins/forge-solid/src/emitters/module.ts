/**
 * SolidJS component emitter.
 *
 * The emitter consumes the enriched **generic AST** — never a parsed source
 * file — and *prints* the target module from it: the imports come from
 * `ast.imports`, the module-level statements from `ast.declarations`, and the
 * component from `ast.component` (its parameter, body statements and returned
 * render node). Everything neutral inside those fragments is rewritten by
 * `../transformers`, which work on the exact source text the IR carries.
 *
 * The lowering order matters. The body is printed **first**, because printing is
 * what discovers which Solid primitives the module needs (`createSignal`,
 * `onMount`, …), whether a `<Dynamic>` forced the hyperscript import, whether an
 * array `className` collapsed to `classNames(…)` and whether an `i18next.t(…)`
 * call needs the `useI18n()` binding. Only then is the import block built, and
 * the static subtrees hoisted while printing are emitted as module constants
 * between the declarations and the component.
 */
import {
  createModuleScopeContext,
  createSolidLoweringContext,
} from "../transformers/context.js";
import {
  lowerExpressionText,
  renameNeutralElementTypes,
} from "../transformers/expressions.js";
import { printSolidImports } from "../transformers/imports.js";
import {
  lowerRenderNode,
  lowerTextWithRenderNodes,
} from "../transformers/jsx.js";
import {
  callsUseI18n,
  I18N_HOOK_STATEMENT,
  lowerStatement,
} from "../transformers/statements.js";
import { indent } from "../transformers/text.js";

import type { SolidLoweringPlan } from "../lower.js";
import type {
  SolidLoweringContext,
  SolidLoweringOptions,
} from "../transformers/context.js";
import type {
  GenericComponent,
  GenericParameter,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** Options controlling how a module is emitted. */
export interface SolidEmitOptions {
  /** The component the module is named after, when the caller knows it. */
  readonly componentName?: string;
  /** Source folders the flat generated layout was collapsed from. */
  readonly componentFolders?: ReadonlySet<string>;
  /** The lowered (and optionally optimized) plan; omitted for a direct emitter call. */
  readonly plan?: SolidLoweringPlan;
}

/** Translate a lowered plan into the flags the printers read. */
function loweringOptions(
  plan: SolidLoweringPlan | undefined,
): SolidLoweringOptions {
  if (plan === undefined) {
    return {};
  }
  return {
    hoistStatic: plan.hoistStatic,
    collapseFragments: plan.collapseSingleChildFragments,
    memoized: new Map(
      plan.memoizedExpressions.map((entry) => [entry.expression, entry.name]),
    ),
  };
}

/** The SolidJS source produced for one neutral module. */
export interface GeneratedSolidModule {
  readonly code: string;
}

/** The default name used when a component declaration carries none. */
const ANONYMOUS_COMPONENT = "Component";

/** Print the component's props parameter, resolving the neutral element types in its annotation. */
function printParameter(parameter: GenericParameter | undefined): string {
  if (parameter === undefined) {
    return "";
  }
  const type =
    parameter.type === undefined
      ? ""
      : `: ${renameNeutralElementTypes(parameter.type.text)}`;
  return `${parameter.text}${type}`;
}

/**
 * Print the component's `return`, wrapping multi-line markup in parentheses.
 *
 * A component whose render is not JSX — an explicit `h(tag, …)` call, a
 * conditional expression, a bare identifier — carries no `returnNode`; the
 * returned expression is then lowered as an expression so the hyperscript call
 * and the reactive reads inside it survive. Nested JSX roots on the matching
 * body `return` statement (ternary branches, hyperscript children) are spliced
 * in before the expression rewrites run.
 */
function printReturn(
  component: GenericComponent,
  context: SolidLoweringContext,
): string {
  if (component.returnNode === undefined) {
    if (component.returnExpression === undefined) {
      return "return null;";
    }
    // Prefer the last body `return` so early-return guards do not supply nested
    // roots for a different expression than the one being printed.
    const returnStatement = component.body
      .toReversed()
      .find((entry) => entry.statementKind === "return");
    return `return ${lowerTextWithRenderNodes(
      component.returnExpression.text,
      returnStatement?.renderNodes ?? [],
      context,
      0,
    )};`;
  }
  // The markup is printed at column zero: `indent` below and the body indent in
  // `printComponent` together place it inside the parentheses.
  const lowered = lowerRenderNode(component.returnNode, context, 0);
  if (lowered.expression || !lowered.text.includes("\n")) {
    return `return ${lowered.text};`;
  }
  return `return (\n${indent(lowered.text)}\n);`;
}

/**
 * Print every statement of the component body.
 *
 * `component.returnNode` is built from the **first** `return` of the body, so
 * only that one is printed from the render node; an early `return` further down
 * is lowered like any other statement.
 */
function printBody(
  component: GenericComponent,
  context: SolidLoweringContext,
): string[] {
  const lines: string[] = [];
  let returned = false;
  for (const statement of component.body) {
    if (statement.statementKind === "return" && !returned) {
      returned = true;
      lines.push(printReturn(component, context));
      continue;
    }
    lines.push(lowerStatement(statement, context, 2));
  }
  if (!returned) {
    lines.push(printReturn(component, context));
  }
  return lines;
}

/**
 * The `createMemo` declarations `solid:memoize-dynamic-expressions` asked for,
 * limited to the ones the printing actually referenced.
 */
function printMemoDeclarations(
  plan: SolidLoweringPlan | undefined,
  context: SolidLoweringContext,
): string[] {
  if (plan === undefined) {
    return [];
  }
  return plan.memoizedExpressions
    .filter((entry) => context.usedMemos.has(entry.name))
    .map(
      (entry) =>
        `const ${entry.name} = createMemo(() => ${lowerExpressionText(entry.expression, context)});`,
    );
}

/**
 * True when a lowered body statement can exit the component before later lines
 * run. Nested `return`s inside `const fn = () => { return ... }` do not count —
 * only top-level `return` and control-flow early returns.
 */
function isReturnBoundary(line: string): boolean {
  const trimmed = line.trimStart();
  if (/^return\b/.test(trimmed)) {
    return true;
  }
  // `if (cond) { ... return ... }` must not run while optimizer memos are still
  // in the temporal dead zone. Function-local returns stay with their preamble.
  if (/^(if|switch|for|while|do)\b/.test(trimmed) && /\breturn\b/.test(line)) {
    return true;
  }
  return false;
}

/**
 * Insert optimizer memos after preamble locals and before any return path.
 *
 * `createMemo` evaluates eagerly, so declarations must come after every body
 * local the memoized expression reads. They must also initialize before any
 * early-return branch that closes over them (for example wizard `if` returns),
 * otherwise the binding stays in the temporal dead zone when the branch runs.
 */
function insertMemoDeclarations(
  body: string[],
  plan: SolidLoweringPlan | undefined,
  context: SolidLoweringContext,
): void {
  const memos = printMemoDeclarations(plan, context);
  if (memos.length === 0) {
    return;
  }
  const boundaryIndex = body.findIndex((line) => isReturnBoundary(line));
  if (boundaryIndex === -1) {
    body.push(...memos);
    return;
  }
  body.splice(boundaryIndex, 0, ...memos);
}

/** Print the whole component function. */
function printComponent(
  component: GenericComponent,
  context: SolidLoweringContext,
  name: string,
  plan: SolidLoweringPlan | undefined,
): string {
  const body = printBody(component, context);
  insertMemoDeclarations(body, plan, context);
  if (context.runtime.i18n && !body.some((line) => callsUseI18n(line))) {
    body.unshift(I18N_HOOK_STATEMENT);
  }
  const signature = `${component.exported ? "export " : ""}function ${name}(${printParameter(component.parameter)})`;
  return `${signature} {\n${body.map((line) => indent(line)).join("\n")}\n}`;
}

/** Join the emitted sections, collapsing the runs of blank lines an empty section leaves. */
function joinSections(sections: readonly string[]): string {
  return `${sections.filter((section) => section.trim().length > 0).join("\n\n")}\n`;
}

/** The name the emitted component function is declared under. */
function componentName(
  component: GenericComponent,
  options: SolidEmitOptions,
): string {
  return component.name === ""
    ? (options.componentName ?? ANONYMOUS_COMPONENT)
    : component.name;
}

/** Transform a neutral component module into its SolidJS source. */
export function emitSolidModule(
  module: SemanticModule,
  options: SolidEmitOptions = {},
): GeneratedSolidModule {
  const context = createSolidLoweringContext(
    module,
    loweringOptions(options.plan),
  );

  // Print the body first: the import block depends on what the printing found.
  // The declarations are lowered in module scope, where the component's signals
  // and memos are not visible.
  const moduleScope = createModuleScopeContext(module, context);
  const declarations = module.ast.declarations.map((statement) =>
    lowerStatement(statement, moduleScope, 0),
  );
  const component = module.ast.component;
  const componentSource =
    component === undefined
      ? undefined
      : printComponent(
          component,
          context,
          componentName(component, options),
          options.plan,
        );

  const imports = printSolidImports(module, context);
  const sections = [
    imports.join("\n"),
    declarations.join("\n\n"),
    context.hoisted.join("\n"),
    componentSource ?? "",
  ];
  return { code: joinSections(sections) };
}
