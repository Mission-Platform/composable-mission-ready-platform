/**
 * React module emitter for the Stage-1 compiler.
 *
 * A neutral component is already, structurally, a React function component: it
 * is a pure function of its props returning JSX in the classic-`h` dialect. The
 * React target is therefore printed straight from the enriched generic AST —
 * the `GenericImport` / `GenericStatement` / `GenericComponent` records and the
 * `GenericRenderNode` tree — never from a parsed TypeScript source file:
 *
 * - the imports are rebuilt from the lowering plan (`../lower`): the neutral
 *   `@mission-platform/forge` import splits into a `react` value import
 *   (`h` → `createElement`, `Fragment`, the hooks) plus the retained
 *   neutral/local type imports, an `i18next` import gains the
 *   `@mission-platform/i18n` `useI18n` import, and relative sibling-component
 *   imports flatten to `./<base>`;
 * - every module declaration and component-body statement is re-printed with
 *   its nested JSX lowered (`../transformers`), which also aliases DOM
 *   attribute names, resolves the `<Slot>` / `<Dynamic>` markers, collapses
 *   `className={[…]}` arrays and lifts static subtrees to module-level
 *   constants;
 * - the plan decides the `'use client'` directive, the `useI18n()` injection,
 *   whether static subtrees hoist and whether single-child fragments collapse.
 *
 * Stage 2 then compiles the emitted `.tsx` with the standard React JSX
 * transform, so the output is an ordinary, fully native React component.
 */
import { NEUTRAL_MODULE } from "@mission-platform/forge-plugin-api/compiler/ast.js";

import {
  I18NEXT_MODULE,
  planReactModule,
  type ReactImportPlan,
  type ReactModulePlan,
} from "../lower.js";
import { buildI18nImport, buildReactImports } from "../runtime/imports.js";
import {
  createLoweringContext,
  type ReactLoweringContext,
} from "../transformers/context.js";
import {
  lowerRenderNode,
  lowerTextWithRenderNodes,
} from "../transformers/jsx.js";
import {
  quoteString,
  readReturnTypeAnnotation,
  replaceFirst,
} from "../transformers/source-text.js";
import {
  I18N_HOOK_STATEMENT,
  lowerStatement,
} from "../transformers/statements.js";

import type {
  GenericComponent,
  GenericImport,
  GenericStatement,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** The neutral markers whose presence means the module participates in slotting. */
const SLOT_MARKERS: ReadonlySet<string> = new Set(["Slot", "hasSlot"]);

/** React's fragment binding — only imported when a `<>…</>` actually survives. */
const FRAGMENT = "Fragment";

/** The framework-agnostic helper a collapsed `className={[…]}` array calls. */
const CLASS_NAMES = "classNames";

/** The directive prepended to a module React must render on the client. */
const USE_CLIENT_DIRECTIVE = `"use client";`;

/** The component name used when the module's function is anonymous. */
const ANONYMOUS_COMPONENT = "Component";

/** A statement's source text, terminated so it can be joined with the rest of the module. */
function terminated(text: string): string {
  const trimmed = text.trim();
  return trimmed.endsWith(";") || trimmed.endsWith("}")
    ? trimmed
    : `${trimmed};`;
}

/** Whether the statement is a directive prologue entry (`'use client';`). */
function isDirective(statement: GenericStatement): boolean {
  return (
    statement.statementKind === "expression" &&
    /^(['"`])[^'"`]*\1;?$/.test(statement.text.text.trim())
  );
}

/** The last path segment of a relative import specifier (its flat-tree base). */
function importBase(specifier: string): string {
  const segments = specifier
    .split("/")
    .filter(
      (segment) => segment !== "." && segment !== ".." && segment.length > 0,
    );
  return segments.at(-1) ?? specifier;
}

/**
 * Rewrite a relative import to the flat generated layout
 * (`../forge-icon/forge-icon` → `./forge-icon`).
 *
 * Every generated React module lands in the same directory, so *all* relative
 * specifiers flatten — a sibling component, a helper module and a co-located
 * stylesheet alike. Only the specifier is rewritten; the import clause keeps
 * the author's own text, so a mixed `{ getCount, type CountSnapshot }` import
 * survives verbatim.
 */
function flattenImport(entry: GenericImport): string {
  const text = terminated(entry.text);
  const flattened = quoteString(`./${importBase(entry.source)}`);
  for (const quoted of [`'${entry.source}'`, `"${entry.source}"`]) {
    if (text.includes(quoted)) {
      return replaceFirst(text, quoted, flattened);
    }
  }
  return text;
}

/** Whether the module reads or declares slots, so the slot rewrites apply. */
function usesSlots(module: SemanticModule, plan: ReactModulePlan): boolean {
  if (plan.slots.length > 0) {
    return true;
  }
  const neutral = module.ast.imports.find(
    (entry) => entry.source === NEUTRAL_MODULE,
  );
  return neutral?.valueNames.some((name) => SLOT_MARKERS.has(name)) ?? false;
}

/** Append `name` once, preserving order. */
function addName(names: string[], name: string): void {
  if (!names.includes(name)) {
    names.push(name);
  }
}

/**
 * Reconcile the planned imports with what the printer actually emitted: a
 * `<Slot>` fallback or a multi-child fragment prints a `<>…</>` (which the
 * classic-`h` transform resolves against `Fragment`), and a `className={[…]}`
 * array collapses to a `classNames(…)` call the author never imported.
 * Conversely a `Fragment` imported only to author empty `<Fragment />`
 * elements — now `null` — is dropped.
 */
function reconcileImports(
  plan: ReactImportPlan,
  context: ReactLoweringContext,
): ReactImportPlan {
  const values = plan.values.filter(
    (name) => name !== FRAGMENT || context.usedFragment,
  );
  if (context.usedFragment) {
    addName(values, FRAGMENT);
  }
  const runtimeValues = [...plan.runtimeValues];
  if (context.usedClassNames) {
    addName(runtimeValues, CLASS_NAMES);
  }
  return { ...plan, values, runtimeValues };
}

/** Print the component's props parameter, with its neutral types renamed. */
function printParameter(
  component: GenericComponent,
  plan: ReactModulePlan,
  context: ReactLoweringContext,
): string {
  if (component.parameter === undefined) {
    return "";
  }
  const type = plan.propsParameter.type;
  return type === undefined
    ? component.parameter.text
    : `${component.parameter.text}: ${lowerTextWithRenderNodes(type, [], context, 0)}`;
}

/**
 * The component's declared return type, lowered to React (`MpElement` →
 * `ReactElement`), or `''` when the signature declares none.
 *
 * The generic AST records the component's parameter and body but not its
 * return type, so it is recovered from the module source by locating the
 * declaration by name. An annotation that lowers to nothing is dropped rather
 * than printed as a bare `:`, which would leave a doubled space before the
 * body brace.
 */
function printReturnType(
  module: SemanticModule,
  name: string,
  context: ReactLoweringContext,
): string {
  const annotation = readReturnTypeAnnotation(module.ast.source, name);
  if (annotation === undefined) {
    return "";
  }
  const lowered = lowerTextWithRenderNodes(annotation, [], context, 0).trim();
  return lowered.length === 0 ? "" : `: ${lowered}`;
}

/** Print the component function from its generic record. */
function printComponent(
  module: SemanticModule,
  component: GenericComponent,
  plan: ReactModulePlan,
  context: ReactLoweringContext,
): string {
  const name =
    component.name === ""
      ? (plan.componentName ?? ANONYMOUS_COMPONENT)
      : component.name;
  const returnType = printReturnType(module, name, context);
  const body: string[] = [];
  // The neutral source translates through `i18next.t(…)`, which lowers to the
  // `t` binding React's `useI18n()` hook returns.
  if (plan.i18n.hookRequired) {
    body.push(`  ${I18N_HOOK_STATEMENT}`);
  }
  let returns = false;
  for (const statement of component.body) {
    returns ||= statement.statementKind === "return";
    body.push(`  ${lowerStatement(statement, context, 2)}`);
  }
  // A record whose body was not captured (a synthesised module) still carries
  // its returned markup, so print the `return` the body is missing.
  if (!returns && component.returnNode !== undefined) {
    body.push(
      `  return ${lowerRenderNode(component.returnNode, context, 2).text};`,
    );
  } else if (!returns && component.returnExpression !== undefined) {
    body.push(
      `  return ${lowerTextWithRenderNodes(component.returnExpression.text, [], context, 2)};`,
    );
  }
  const signature = `${component.exported ? "export " : ""}function ${name}(${printParameter(component, plan, context)})${returnType} {`;
  return [signature, ...body, "}"].join("\n");
}

/** Transform the whole module into the React target source. */
export function emitReactModule(
  module: SemanticModule,
  componentName?: string,
  plan: ReactModulePlan = planReactModule(module, componentName),
): string {
  const { ast } = module;
  const context = createLoweringContext({
    propertiesParameterName: plan.propsParameter.name,
    hasSlots: usesSlots(module, plan),
    hoistStatic: plan.hoistStatic,
    unwrapSingleChildFragments: plan.unwrapSingleChildFragments,
  });

  // The body is printed first: the import block depends on what it emitted.
  const directives: string[] = [];
  const declarations: string[] = [];
  let prologue = true;
  for (const declaration of ast.declarations) {
    if (prologue && isDirective(declaration)) {
      directives.push(terminated(declaration.text.text));
      continue;
    }
    prologue = false;
    declarations.push(lowerStatement(declaration, context, 0));
  }
  const component =
    ast.component === undefined
      ? undefined
      : printComponent(module, ast.component, plan, context);

  const reactImports = buildReactImports(
    reconcileImports(plan.reactImports, context),
  );
  const imports: string[] = [];
  let neutralReplaced = false;
  for (const entry of ast.imports) {
    if (entry.source === NEUTRAL_MODULE) {
      if (!neutralReplaced) {
        imports.push(...reactImports);
      }
      neutralReplaced = true;
      continue;
    }
    if (entry.source === I18NEXT_MODULE && plan.i18n.importRequired) {
      imports.push(buildI18nImport(), terminated(entry.text));
      continue;
    }
    imports.push(
      entry.source.startsWith(".")
        ? flattenImport(entry)
        : terminated(entry.text),
    );
  }
  // A module whose hooks were inferred rather than imported still needs its
  // `react` bindings.
  if (!neutralReplaced && reactImports.length > 0) {
    imports.unshift(...reactImports);
  }

  if (plan.clientDirective.required && !plan.clientDirective.declared) {
    directives.unshift(USE_CLIENT_DIRECTIVE);
  }

  const sections = [
    directives.join("\n"),
    imports.join("\n"),
    declarations.join("\n\n"),
    context.hoisted.join("\n"),
    component ?? "",
  ].filter((section) => section.length > 0);
  return `${sections.join("\n\n")}\n`;
}
