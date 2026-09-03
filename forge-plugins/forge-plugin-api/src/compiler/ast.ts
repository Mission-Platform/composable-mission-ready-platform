/**
 * Framework-neutral compiler contracts and source-edit primitives.
 *
 * This module intentionally contains no parser or compiler-AST types. Forge
 * frontends own their parser adapters; target plugins consume semantic records
 * and these stable naming/source contracts only.
 */
import type { JsxFramework } from "../framework.js";

export const NEUTRAL_MODULE = "@mission-platform/forge";
export const NEUTRAL_RUNTIME_VALUES: ReadonlySet<string> = new Set([
  "classNames",
  "createForgeStyle",
]);
export const CLASS_NAME_ATTRIBUTE = "className";
export const JSX_ATTRIBUTE_RENAMES: ReadonlyMap<string, string> = new Map([
  ["colSpan", "colspan"],
  ["rowSpan", "rowspan"],
]);
export const NEUTRAL_COMPILE_TIME_MARKERS: ReadonlySet<string> = new Set([
  "Slot",
  "Dynamic",
  "hasSlot",
]);
export const NEUTRAL_FRAMEWORK_COMPONENTS: ReadonlySet<string> = new Set([
  "Suspense",
  "Teleport",
  "Transition",
  "TransitionGroup",
  "HtmlContent",
]);
export const VUE_BUILTIN_COMPONENTS: ReadonlySet<string> = new Set([
  "Suspense",
  "Teleport",
  "Transition",
  "TransitionGroup",
]);
export const NEUTRAL_VUE_RUNTIME_HOOKS: ReadonlySet<string> = new Set([
  "useId",
]);
export const NEUTRAL_CONTEXT_VALUES: ReadonlySet<string> = new Set([
  "createContext",
  "useContext",
]);
export const REACT_TYPE_ALIASES: Readonly<Record<string, string>> = {
  MpChild: "ReactNode",
  MpElement: "ReactElement",
  MpRef: "RefObject",
  MpDependencyList: "DependencyList",
};
export const LOCAL_JSX_TYPE_NAMES: ReadonlySet<string> = new Set([
  "MpRenderProperty",
]);
export const VUE_LOCAL_JSX_TYPE_NAMES: ReadonlySet<string> = new Set([
  "MpRenderProperty",
  "MpChild",
  "MpElement",
]);
export const LOCAL_JSX_TYPES_MODULE = "./mp-jsx-types";
export const LOCAL_JSX_TYPES_FILE = "mp-jsx-types.ts";

const FRAMEWORK_DIRECTIVES: ReadonlyMap<string, JsxFramework> = new Map([
  ["use react", "react"],
  ["use vue", "vue"],
  ["use svelte", "svelte"],
  ["use solid", "solid"],
  ["use web-components", "web-components"],
]);

/** Derive the Forge adapter/runtime module for any built-in target framework. */
export function frameworkAdapterModule(framework: JsxFramework): string {
  return `${NEUTRAL_MODULE}/${framework}`;
}

/** Resolve a leading `use <framework>` directive for any built-in target. */
export function frameworkForDirective(
  directive: string,
): JsxFramework | undefined {
  return FRAMEWORK_DIRECTIVES.get(directive);
}

/** A stable source edit, ordered by offsets in the original source. */
export interface SourceEdit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

/** Apply non-overlapping source edits without exposing parser nodes. */
export function applySourceEdits(
  source: string,
  edits: readonly SourceEdit[],
): string {
  if (edits.length === 0) return source;
  const ordered = edits.toSorted((left, right) => right.start - left.start);
  let previousStart = source.length + 1;
  let result = source;
  for (const edit of ordered) {
    if (
      !Number.isInteger(edit.start) ||
      !Number.isInteger(edit.end) ||
      edit.start < 0 ||
      edit.end < edit.start ||
      edit.end > source.length ||
      edit.end > previousStart
    ) {
      throw new RangeError(
        `Invalid or overlapping source edit: ${edit.start}-${edit.end}`,
      );
    }
    result = `${result.slice(0, edit.start)}${edit.text}${result.slice(edit.end)}`;
    previousStart = edit.start;
  }
  return result;
}

/** A stylesheet import carried into a generated flat tree. */
export interface StyleImport {
  readonly name: string | undefined;
  readonly specifier: string;
  readonly flatSpecifier: string;
  readonly base: string;
}

/** Derive the event name represented by a Vue-style `on<Event>` prop. */
export function eventNameForProperty(propertyName: string): string {
  const rest = propertyName.slice(2);
  return rest.charAt(0).toLowerCase() + rest.slice(1);
}

/** Emit framework-local JSX primitive declarations without parser dependencies. */
export function localJsxTypesModuleSource(framework: JsxFramework): string {
  if (framework === "solid") {
    return [
      "/**",
      " * Framework-specific variants of the neutral `@mission-platform/forge` render/props",
      " * primitives, generated for the solid build so the compiled components",
      " * carry no neutral-package type import (see `LOCAL_JSX_TYPE_NAMES`).",
      " */",
      "import type { JSX } from 'solid-js';",
      "",
      "/** A scoped-slot / render-prop function — the solid variant of the neutral `MpRenderProperty`. */",
      "export type MpRenderProperty<S = Record<string, unknown>> = (scope: S) => JSX.Element;",
      "",
      "/** Anything that may render as a child — the solid variant of the neutral `MpChild`. */",
      "export type MpChild = JSX.Element;",
      "",
      "/** A node in the rendered tree — the solid variant of the neutral `MpElement`. */",
      "export type MpElement = JSX.Element;",
      "",
    ].join("\n");
  }
  if (framework === "svelte") {
    return [
      "/**",
      " * Framework-specific variants of the neutral `@mission-platform/forge` render/props",
      " * primitives, generated for the svelte build so the compiled components",
      " * carry no neutral-package type import (see `LOCAL_JSX_TYPE_NAMES`).",
      " */",
      "import type { Snippet } from 'svelte';",
      "",
      "/** A node in the rendered tree — the svelte variant of the neutral `MpElement`. */",
      "export type MpElement = unknown;",
      "",
      "/** Anything that may render as a child — the svelte variant of the neutral `MpChild`. */",
      "export type MpChild = unknown;",
      "",
      "/** A scoped snippet prop — the svelte variant of the neutral `MpRenderProperty`. */",
      "export type MpRenderProperty<S = Record<string, unknown>> = Snippet<[S]>;",
      "",
    ].join("\n");
  }
  if (framework === "web-components") {
    return [
      "/**",
      " * Framework-specific variants of the neutral `@mission-platform/forge` render/props",
      " * primitives, generated for the web-components build so the compiled components",
      " * carry no neutral-package type import (see `LOCAL_JSX_TYPE_NAMES`).",
      " */",
      `import type { HtmlContentResult, SuspenseResult, TemplateResult } from '${frameworkAdapterModule("web-components")}';`,
      "",
      "/** A node in the rendered tree — the web-components variant of the neutral `MpElement`. */",
      "export type MpElement = TemplateResult | HtmlContentResult | SuspenseResult;",
      "",
      "/** Anything that may render as a child — the web-components variant of the neutral `MpChild`. */",
      "export type MpChild = MpElement | string | number | boolean | null | undefined;",
      "",
      "/** A scoped-slot / render-prop function — the web-components variant of the neutral `MpRenderProperty`. */",
      "export type MpRenderProperty<S = Record<string, unknown>> = (scope: S) => MpChild;",
      "",
    ].join("\n");
  }
  const renderable = framework === "react" ? "ReactNode" : "VNodeChild";
  const imported =
    framework === "react"
      ? "import type { ReactNode } from 'react';"
      : "import type { VNode, VNodeChild } from 'vue';";
  const lines = [
    "/**",
    ` * Framework-specific variants of the neutral \`@mission-platform/forge\` render/props`,
    " * primitives, generated for the " +
      framework +
      " build so the compiled components",
    " * carry no neutral-package type import (see `LOCAL_JSX_TYPE_NAMES`).",
    " */",
    imported,
    "",
    "/** A scoped-slot / render-prop function — the " +
      framework +
      " variant of the neutral `MpRenderProperty`. */",
    `export type MpRenderProperty<S = Record<string, unknown>> = (scope: S) => ${renderable};`,
    "",
  ];
  if (framework === "vue") {
    lines.push(
      "/** Anything that may render as a child — the Vue variant of the neutral `MpChild`. */",
      "export type MpChild = VNodeChild;",
      "",
      "/** A node in the rendered tree — the Vue variant of the neutral `MpElement`. */",
      "export type MpElement = VNode;",
      "",
    );
  }
  return lines.join("\n");
}
