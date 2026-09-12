/**
 * Neutral IR → Web-Components **target plan**.
 *
 * `lower` is where the neutral facts a component states (props, state cells,
 * memos, effects, refs, its render tree) are translated into the custom-element
 * decisions the emitters print: the tag name, the reactive property/state
 * fields *with their resolved TypeScript types*, derived getters, lifecycle
 * callbacks, element refs, the lit-html template, and the exact runtime imports
 * the plan needs.
 *
 * This module coordinates subplans extracted into focused modules under `./lower/`.
 */
import { MP_STATIC_ATTR } from "@mission-platform/forge-plugin-api/compiler/optimize.js";

import {
  declaredHeadNames,
  fieldInitializerAliases,
  headConstant,
  headReplay,
  isHookStatement,
  isNoOpStatement,
  plannedHeadStatements,
  promotedHeadLocals,
  replayedPropsBindings,
} from "./lower/head-analysis.js";
import { inferWebComponentsHost } from "./lower/host-plan.js";
import { referencesIdentifier, referencesLocal } from "./lower/identifier.js";
import { loweredLifecycle } from "./lower/lifecycle-plan.js";
import {
  DEFAULT_PROPS_PARAMETER,
  planReactiveProperties,
  propsBindingSites,
  slotAliasesOf,
} from "./lower/props-plan.js";
import {
  emptyPlan,
  listKeysOf,
  resolveRuntimeImports,
  styleUrlsOf,
} from "./lower/runtime-imports.js";
import {
  loweredElementRefs,
  loweredGeneratedIds,
  planSeed,
  stateTypeOf,
  type SeedScopes,
} from "./lower/state-and-refs-plan.js";
import {
  loweredDerived,
  lowerDynamicElementCalls,
  lowerRetainedDeclarations,
  lowerRootDynamicElement,
} from "./lower/template-and-derived-plan.js";
import {
  DEFAULT_WEBCOMPONENTS_INTERNALS_POLICY,
  DEFAULT_WEBCOMPONENTS_SHADOW_POLICY,
  WEB_COMPONENTS_FRAMEWORK,
  type WebComponentsElementRef,
  type WebComponentsLoweredModule,
  type WebComponentsPromotedLocal,
  type WebComponentsStateField,
  type WebComponentsTemplatePlan,
} from "./lower/types.js";
import {
  type ElementScope,
  MODULE_SCOPE,
  rewriteExpressionText,
} from "./transformers/expression.js";
import { resolvePropsTypeReference } from "./transformers/props-type.js";
import {
  kebabCase,
  lowerStatementText,
  renderNodeToDomTemplate,
  renderNodeToTemplate,
  type TemplateContext,
} from "./transformers/template.js";

import type {
  SemanticModule,
  TargetContext,
  TargetIntentions,
} from "@mission-platform/forge-plugin-api";

// Re-export all types and discriminator
export * from "./lower/types.js";

// Re-export identifier & pattern utilities
export {
  escapeForPattern,
  referencesIdentifier,
  referencesLocal,
} from "./lower/identifier.js";

// Re-export host planning
export {
  autonomousHost,
  hasDynamicRootReturn,
  inferWebComponentsHost,
} from "./lower/host-plan.js";

// Re-export props planning
export {
  bindingDefaultOf,
  collectPropertyReads,
  collectRenderExpressionTexts,
  DEFAULT_PROPS_PARAMETER,
  hasTopLevelArrow,
  INHERITED_ELEMENT_MEMBERS,
  planReactiveProperties,
  propertyTypeOf,
  propsBindingSites,
  PROPS_DESTRUCTURING,
  reactivePropertyNames,
  SLOTTED_PROP,
  slotAliasesOf,
  splitTopLevelUnion,
  typeDepths,
  UNDEFINED_TYPE,
  widenOptionalType,
  type PropsBindingSite,
} from "./lower/props-plan.js";

// Re-export head analysis
export {
  declaredHeadNames,
  declaredNamesOfText,
  fieldInitializerAliases,
  generatedIdName,
  headConstant,
  headReplay,
  isHookStatement,
  isNoOpStatement,
  isReplayableHeadStatement,
  patternNames,
  plannedHeadStatements,
  promotedHeadLocals,
  replayedPropsBindings,
  type HeadStatement,
  type PromotionCandidate,
} from "./lower/head-analysis.js";

// Re-export state & refs planning
export {
  loweredElementRefs,
  loweredGeneratedIds,
  planSeed,
  stateTypeOf,
  type SeedPlan,
  type SeedScopes,
} from "./lower/state-and-refs-plan.js";

// Re-export template & derived planning
export {
  blockBodyLines,
  derivedBody,
  loweredDerived,
  lowerDynamicElementCalls,
  lowerRetainedDeclarations,
  lowerRootDynamicElement,
  STATIC_TEMPLATE_PREFIX,
  staticTemplateName,
} from "./lower/template-and-derived-plan.js";

// Re-export lifecycle planning
export {
  CLEANUP_FIELD_PREFIX,
  CLEANUP_FIELD_TYPE,
  effectInvocation,
  loweredLifecycle,
} from "./lower/lifecycle-plan.js";

// Re-export runtime imports & empty plan
export {
  emptyPlan,
  listKeysOf,
  resolveRuntimeImports,
  RUNTIME_PROPERTY_DECLARATION_TYPE,
  RUNTIME_TEMPLATE_DEFINITION_TYPE,
  RUNTIME_VALUES,
  STRUCTURAL_RUNTIME_VALUES,
  STYLE_IMPORT,
  styleSidecarUrl,
  styleUrlsOf,
} from "./lower/runtime-imports.js";

/** Build the Web-Components target plan for a neutral module. */
export function lowerWebComponentsPlan(
  module: SemanticModule,
  context: TargetContext,
): WebComponentsLoweredModule {
  const componentName =
    context.componentName ?? module.componentName ?? "CustomElement";
  const componentFolders = context.componentFolders ?? new Set<string>();
  const componentHosts = context.componentHosts;
  const className = `${componentName}Element`;
  const tagName = kebabCase(componentName);
  const moduleContext: TemplateContext = {
    scope: MODULE_SCOPE,
    componentFolders,
    componentHosts,
  };
  const retainedDeclarations = lowerRetainedDeclarations(module, moduleContext);

  const component = module.ast.component;
  if (component === undefined) {
    return emptyPlan(module, className, tagName, retainedDeclarations);
  }

  const { intentions } = module;
  const propsParameterName =
    intentions.propsParameterName ??
    (component.parameter?.binding === "identifier"
      ? component.parameter.text
      : undefined) ??
    DEFAULT_PROPS_PARAMETER;

  // The component's own props interface, when its parameter names one this
  // module retains — every member it declares is annotated straight against it.
  const propsType = resolvePropsTypeReference(
    intentions.propsType?.text ?? component.parameter?.type?.text,
    module.ast.declarations,
  );

  // Every props object pattern the component destructures.
  const propsBindings = propsBindingSites(component, propsParameterName);
  const slotAliases = slotAliasesOf(
    component,
    propsParameterName,
    propsBindings,
  );
  const boundLocals = new Set(
    propsBindings.flatMap((site) => [...site.binding.locals]),
  );

  const reactiveProperties = planReactiveProperties(
    component,
    intentions.props,
    propsParameterName,
    propsBindings,
    propsType,
  );

  const setters = new Map<string, string>();
  for (const field of intentions.state) {
    if (field.setterName !== undefined) {
      setters.set(field.setterName, field.name);
    }
  }

  // Names that resolve to `this.` inside the class: properties, state cells,
  // memo getters and ref cells are all element members once lowered.
  const generatedIds = loweredGeneratedIds(component);
  const propertyNames = reactiveProperties.map((prop) => prop.name);
  const members = new Set<string>(
    [
      ...propertyNames,
      ...intentions.state.map((field) => field.name),
      ...intentions.memos.map((memo) => memo.name),
      ...intentions.refs.map((reference) => reference.name),
      ...generatedIds.map((generated) => generated.name),
    ].filter((name) => !boundLocals.has(name)),
  );

  // A field initializer runs before any statement of the class body.
  const aliases = fieldInitializerAliases(propsBindings);

  // Render-head statements, before any promotion.
  const headStatements = component.body.filter(
    (statement) =>
      statement.statementKind !== "return" &&
      !isHookStatement(statement) &&
      !isNoOpStatement(statement),
  );

  // Everything emitted outside `render()`.
  const liftedTexts = [
    ...intentions.memos.map((memo) => memo.factory.text),
    ...intentions.effects.map((effect) => effect.body.text),
    ...intentions.state.map((field) => field.initializer?.text ?? ""),
    ...intentions.refs.map((reference) => reference.initializer?.text ?? ""),
  ];
  const promoted = promotedHeadLocals(
    headStatements,
    liftedTexts,
    members,
    boundLocals,
    new Set(aliases.keys()),
  );
  const promotedNames = new Set(promoted.map((candidate) => candidate.name));

  const scope: ElementScope = {
    propsParameterName,
    scoped: new Set<string>([...members, ...promotedNames]),
    setters,
  };

  const nonPromotedHeadLocalNames = new Set(
    headStatements
      .flatMap((statement) => declaredHeadNames(statement))
      .filter((name) => !promotedNames.has(name)),
  );

  const renderScope: ElementScope = {
    ...scope,
    scoped: new Set(
      [...scope.scoped].filter((name) => !nonPromotedHeadLocalNames.has(name)),
    ),
  };
  const templateContext: TemplateContext = {
    scope: renderScope,
    componentFolders,
    componentHosts,
    slotAliases,
  };
  const fieldScope: ElementScope = { ...scope, aliases };

  const promotedLocals: WebComponentsPromotedLocal[] = promoted.map(
    (candidate) => {
      if (candidate.kind === "field") {
        return {
          name: candidate.name,
          kind: "field",
          expression: rewriteExpressionText(candidate.initializer, fieldScope),
          statements: [],
        };
      }
      const expression = rewriteExpressionText(candidate.initializer, scope);
      return {
        name: candidate.name,
        kind: "getter",
        expression,
        statements: replayedPropsBindings(propsBindings, [expression]),
      };
    },
  );

  const bodyHead = headStatements
    .filter((statement) => {
      const name = headConstant(statement)?.name;
      return name === undefined || !promotedNames.has(name);
    })
    .map((statement) =>
      lowerStatementText(
        statement.text.text,
        statement.renderNodes,
        templateContext,
      ),
    );

  const returnNode = component.returnNode;
  const templateText =
    returnNode === undefined
      ? "<slot></slot>"
      : renderNodeToTemplate(returnNode, templateContext);

  const head = [
    ...replayedPropsBindings(
      propsBindings.filter((site) => site.fromParameter),
      [...bodyHead, templateText],
    ),
    ...bodyHead,
  ];
  const plannedHead = plannedHeadStatements(head);
  const headLocals = new Set(
    plannedHead.flatMap((statement) => [...statement.declares]),
  );

  const plannedSeeds = (
    allowDeferral: boolean,
  ): { state: WebComponentsStateField[]; refs: WebComponentsElementRef[] } => {
    const deferredMembers = new Set<string>();
    const scopes: SeedScopes = {
      field: fieldScope,
      setup: scope,
      defer: (name, text) => {
        const deferred =
          allowDeferral &&
          ([...headLocals].some((local) => referencesLocal(text, local)) ||
            [...deferredMembers].some((member) =>
              referencesIdentifier(text, member),
            ));
        if (deferred) {
          deferredMembers.add(name);
        }
        return deferred;
      },
    };
    const state = intentions.state.map((field): WebComponentsStateField => {
      const resolved = stateTypeOf(field);
      const seed = planSeed(field.name, field.initializer?.text, scopes);
      return {
        name: field.name,
        setterName: field.setterName,
        type: resolved.type,
        declared: resolved.declared,
        initializer: seed.text,
        deferred: seed.deferred,
        declaration: { state: true },
      };
    });
    return { state, refs: loweredElementRefs(module, scopes) };
  };

  let seeds = plannedSeeds(true);
  const deferredTexts = [
    ...seeds.state
      .filter((field) => field.deferred)
      .map((field) => field.initializer ?? ""),
    ...seeds.refs
      .filter((reference) => reference.deferred)
      .map((reference) => reference.initializer),
  ];
  const replayedHead =
    deferredTexts.length === 0
      ? []
      : headReplay(plannedHead, deferredTexts, boundLocals);
  let setupReplay: readonly string[];
  if (replayedHead === undefined) {
    seeds = plannedSeeds(false);
    setupReplay = [];
  } else {
    setupReplay = [
      ...replayedPropsBindings(propsBindings, [
        ...replayedHead,
        ...deferredTexts,
      ]),
      ...replayedHead,
    ];
  }
  const stateFields = seeds.state;
  const elementRefs = seeds.refs;

  const template: WebComponentsTemplatePlan = {
    template: lowerRootDynamicElement(templateText),
    dom: renderNodeToDomTemplate(returnNode, templateContext),
    head: head.map((statement) => lowerDynamicElementCalls(statement)),
    staticRoot:
      returnNode !== undefined &&
      returnNode.tagKind !== "fragment" &&
      returnNode.attributes.some(
        (attribute) =>
          attribute.kind === "jsx-attribute" &&
          attribute.name === MP_STATIC_ATTR,
      ),
    hoisted: [],
  };

  const derived = loweredDerived(module, scope, propsBindings);
  const { lifecycle, cleanupFields } = loweredLifecycle(
    module,
    scope,
    propsBindings,
    plannedHead,
  );
  const base = {
    template,
    derived,
    promotedLocals,
    generatedIds,
    lifecycle,
    reactiveProperties,
    stateFields,
    elementRefs,
    setup: { replay: setupReplay },
    retainedDeclarations,
  } as const;

  return {
    framework: WEB_COMPONENTS_FRAMEWORK,
    host: inferWebComponentsHost(returnNode, module.ast.component),
    shadow: DEFAULT_WEBCOMPONENTS_SHADOW_POLICY,
    internals: DEFAULT_WEBCOMPONENTS_INTERNALS_POLICY,
    tagName,
    className,
    styleUrls: styleUrlsOf(module),
    ...base,
    cleanupFields,
    listKeys: listKeysOf(module),
    runtimeImports: resolveRuntimeImports(base),
    appliedOptimizations: [],
  };
}

/** Lower neutral IR into the Web-Components target intentions. */
export function lowerWebComponentsModule(
  module: SemanticModule,
  context: TargetContext,
): TargetIntentions {
  const lowered = lowerWebComponentsPlan(module, context);
  return {
    framework: WEB_COMPONENTS_FRAMEWORK,
    module,
    context,
    diagnostics: module.diagnostics ?? [],
    lowered,
  };
}
