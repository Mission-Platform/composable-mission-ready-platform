import type {
  GenericComponent,
  GenericRenderNode,
} from "@mission-platform/forge-plugin-api";
import {
  WEBCOMPONENTS_NATIVE_HOSTS,
  type WebComponentsHostFallbackReason,
  type WebComponentsHostPlan,
} from "./types.js";

export function autonomousHost(
  fallbackReason: WebComponentsHostFallbackReason,
): WebComponentsHostPlan {
  return {
    kind: "autonomous",
    constructorExpression: "ForgeElement",
    invocation: "custom-tag",
    fallbackReason,
  };
}

/** Whether a component has a return path whose root tag is selected at runtime. */
export function hasDynamicRootReturn(
  component: GenericComponent | undefined,
): boolean {
  if (component === undefined) return false;
  const expressions = [
    ...(component.returnExpression === undefined
      ? []
      : [component.returnExpression.text]),
    ...component.body.map((statement) => statement.text.text),
  ];
  return expressions.some((text) =>
    /(?:^|\breturn\s+)(?:h|dynamicElement)\s*\(\s*(?!["'`])/u.test(text),
  );
}

/**
 * Infer a customized-built-in host only from a single, static intrinsic root.
 *
 * The allowlist is intentionally conservative: an intrinsic tag being valid
 * HTML does not guarantee that it is a safe or useful customized-built-in
 * base across the supported DOM implementations.
 */
export function inferWebComponentsHost(
  returnNode: GenericRenderNode | undefined,
  component?: GenericComponent,
): WebComponentsHostPlan {
  if (hasDynamicRootReturn(component)) {
    return autonomousHost("dynamic-root");
  }
  if (returnNode === undefined) {
    return autonomousHost("missing-root");
  }
  if (returnNode.tagKind === "fragment") {
    return autonomousHost("fragment-root");
  }
  if (returnNode.tagKind === "dynamic") {
    return autonomousHost("dynamic-root");
  }
  if (returnNode.tagKind === "component") {
    return autonomousHost("component-root");
  }
  if (typeof returnNode.tag !== "string") {
    return autonomousHost("invalid-root");
  }

  const baseTag = returnNode.tag;
  if (!/^[a-z][a-z0-9-]*$/u.test(baseTag)) {
    return autonomousHost("invalid-root");
  }
  const constructorExpression =
    WEBCOMPONENTS_NATIVE_HOSTS[
      baseTag as keyof typeof WEBCOMPONENTS_NATIVE_HOSTS
    ];
  if (constructorExpression === undefined) {
    return autonomousHost("unsupported-root");
  }
  const registrationOptions = { extends: baseTag };
  return {
    kind: "customized-built-in",
    baseTag,
    constructorExpression,
    registrationExtends: baseTag,
    registrationOptions,
    invocation: "is-attribute",
  };
}
