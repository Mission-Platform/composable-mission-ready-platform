import type { SemanticModule } from "../ir.js";

/**
 * Normalized descriptor for a lowered component event handler.
 */
export interface NormalizedEventPlan {
  readonly propName: string;
  readonly canonicalName: string;
  readonly handlerText: string;
}

/**
 * Determines whether a property name represents an event handler prop (e.g. `onClick`, `onKeyDown`).
 */
export function isEventHandlerProp(propName: string): boolean {
  return (
    propName.startsWith("on") &&
    propName.length > 2 &&
    propName[2] === propName[2]?.toUpperCase()
  );
}

/**
 * Extracts the canonical event name from an `onXxx` prop name (e.g. `onClick` -> `click`, `onKeyDown` -> `keydown`).
 */
export function canonicalEventName(propName: string): string {
  if (!isEventHandlerProp(propName)) {
    return propName.toLowerCase();
  }
  const raw = propName.slice(2);
  return raw.charAt(0).toLowerCase() + raw.slice(1);
}

/**
 * Formats an event name according to the target framework's conventions.
 */
export function formatTargetEventName(
  eventName: string,
  target: "react" | "solid" | "vue" | "svelte" | "web-components",
): string {
  const canonical = canonicalEventName(eventName);
  const capitalized = canonical.charAt(0).toUpperCase() + canonical.slice(1);

  switch (target) {
    case "react":
    case "solid": {
      return `on${capitalized}`;
    }
    case "svelte": {
      return `on${canonical.toLowerCase()}`;
    }
    case "vue": {
      return `on${capitalized}`;
    }
    case "web-components": {
      return canonical.toLowerCase();
    }
    default: {
      return eventName;
    }
  }
}

/**
 * Extracts all event handler intentions from a `SemanticModule`.
 */
export function lowerEventIntentions(
  module: SemanticModule,
): readonly NormalizedEventPlan[] {
  return module.intentions.events.map((evt) => {
    return {
      propName: evt.name,
      canonicalName: canonicalEventName(evt.name),
      handlerText: evt.handler.text,
    };
  });
}
