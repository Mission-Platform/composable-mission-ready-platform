import { HAS_SLOT_RUNTIME, MODULE_SCOPE } from "../transformers/expression.js";
import { renderNodeToDomTemplate } from "../transformers/template.js";

import { autonomousHost } from "./host-plan.js";
import { referencesIdentifier } from "./identifier.js";
import {
  DEFAULT_WEBCOMPONENTS_INTERNALS_POLICY,
  DEFAULT_WEBCOMPONENTS_SHADOW_POLICY,
  LOCAL_ELEMENT_TYPES,
  WEB_COMPONENTS_FRAMEWORK,
  type WebComponentsDerivedValue,
  type WebComponentsElementRef,
  type WebComponentsGeneratedId,
  type WebComponentsLifecycleHook,
  type WebComponentsListKey,
  type WebComponentsLoweredModule,
  type WebComponentsPromotedLocal,
  type WebComponentsReactiveProperty,
  type WebComponentsRuntimeImports,
  type WebComponentsSetupPhase,
  type WebComponentsStateField,
  type WebComponentsTemplatePlan,
} from "./types.js";

import type { SemanticModule } from "@mission-platform/forge-plugin-api";

/** Stylesheet imports resolve to CSS sidecars with the source-relative layout. */
export const STYLE_IMPORT = /\.(?:css|scss|sass|less|styl)$/u;

export function styleSidecarUrl(specifier: string): string {
  return specifier
    .replace(/\.module\.(?:css|scss|sass|less|styl)$/u, ".css")
    .replace(/\.(?:css|scss|sass|less|styl)$/u, ".css");
}

export function styleUrlsOf(module: SemanticModule): readonly string[] {
  return [
    ...new Set(
      module.ast.imports
        .filter(
          (entry) =>
            entry.source.startsWith(".") && STYLE_IMPORT.test(entry.source),
        )
        .map((entry) => styleSidecarUrl(entry.source)),
    ),
  ];
}

/** The plan's retained list-key candidates. */
export function listKeysOf(module: SemanticModule): WebComponentsListKey[] {
  return module.intentions.listKeys.map((listKey) => ({
    source: listKey.source.text,
    key: listKey.key?.text,
    stable: listKey.stable,
  }));
}

export const RUNTIME_VALUES = [
  "ForgeElement",
  "domTemplate",
  "dynamicElement",
  "html",
  "suspense",
  "nothing",
  HAS_SLOT_RUNTIME,
  "unsafeHtml",
  "useId",
] as const;

export const RUNTIME_PROPERTY_DECLARATION_TYPE = "PropertyDeclaration";
export const RUNTIME_TEMPLATE_DEFINITION_TYPE = "DomTemplateDefinition";

export const STRUCTURAL_RUNTIME_VALUES: ReadonlySet<string> = new Set([
  "ForgeElement",
  "domTemplate",
  "nothing",
]);

/** The runtime and local-type imports the plan's emitted text needs. */
export function resolveRuntimeImports(plan: {
  readonly template: WebComponentsTemplatePlan;
  readonly derived: readonly WebComponentsDerivedValue[];
  readonly promotedLocals: readonly WebComponentsPromotedLocal[];
  readonly generatedIds: readonly WebComponentsGeneratedId[];
  readonly lifecycle: readonly WebComponentsLifecycleHook[];
  readonly reactiveProperties: readonly WebComponentsReactiveProperty[];
  readonly stateFields: readonly WebComponentsStateField[];
  readonly elementRefs: readonly WebComponentsElementRef[];
  readonly setup: WebComponentsSetupPhase;
  readonly retainedDeclarations: readonly string[];
}): WebComponentsRuntimeImports {
  const text = [
    plan.template.dom.create,
    ...plan.template.dom.values,
    ...plan.template.head,
    ...plan.template.hoisted.map((part) => part.template),
    ...plan.derived.flatMap((derived) =>
      derived.body.kind === "block"
        ? derived.body.statements
        : [derived.body.expression],
    ),
    ...plan.promotedLocals.flatMap((local) => [
      ...local.statements,
      local.expression,
    ]),
    // A lifted `useId()` field is printed by the emitter, not by the plan's
    // text, so its call is contributed explicitly.
    ...plan.generatedIds.map(() => "useId()"),
    ...plan.lifecycle.flatMap((hook) => hook.statements),
    ...plan.reactiveProperties.map((property) => property.type),
    ...plan.stateFields.map(
      (field) => `${field.type} ${field.initializer ?? ""}`,
    ),
    ...plan.elementRefs.map(
      (reference) => `${reference.elementType} ${reference.initializer}`,
    ),
    ...plan.setup.replay,
    ...plan.retainedDeclarations,
  ].join("\n");
  // The class annotates its `static properties` map with the runtime's own
  // contract, so the type is imported exactly when the map is emitted.
  const hasReactiveMembers =
    plan.reactiveProperties.length + plan.stateFields.length > 0;
  return {
    values: RUNTIME_VALUES.filter(
      (value) =>
        STRUCTURAL_RUNTIME_VALUES.has(value) ||
        referencesIdentifier(text, value),
    ),
    types: [
      RUNTIME_TEMPLATE_DEFINITION_TYPE,
      ...(hasReactiveMembers ? [RUNTIME_PROPERTY_DECLARATION_TYPE] : []),
    ],
    localTypes: LOCAL_ELEMENT_TYPES.filter((name) =>
      referencesIdentifier(text, name),
    ),
  };
}

/** The empty plan of a module with no recognisable component function. */
export function emptyPlan(
  module: SemanticModule,
  className: string,
  tagName: string,
  retainedDeclarations: readonly string[],
): WebComponentsLoweredModule {
  const template: WebComponentsTemplatePlan = {
    template: "<slot></slot>",
    dom: renderNodeToDomTemplate(undefined, {
      scope: MODULE_SCOPE,
      componentFolders: new Set(),
    }),
    head: [],
    staticRoot: false,
    hoisted: [],
  };
  const base = {
    template,
    derived: [],
    promotedLocals: [],
    generatedIds: [],
    lifecycle: [],
    reactiveProperties: [],
    stateFields: [],
    elementRefs: [],
    setup: { replay: [] },
    retainedDeclarations,
  } as const;
  return {
    framework: WEB_COMPONENTS_FRAMEWORK,
    host: autonomousHost("missing-root"),
    shadow: DEFAULT_WEBCOMPONENTS_SHADOW_POLICY,
    internals: DEFAULT_WEBCOMPONENTS_INTERNALS_POLICY,
    tagName,
    className,
    styleUrls: styleUrlsOf(module),
    ...base,
    cleanupFields: [],
    listKeys: listKeysOf(module),
    runtimeImports: resolveRuntimeImports(base),
    appliedOptimizations: [],
  };
}
