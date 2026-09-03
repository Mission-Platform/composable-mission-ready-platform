/**
 * Auxiliary SFC synthesis for an extracted recursive render helper.
 *
 * The helper's `.map()` element becomes this module's single root, its per-entry
 * data and every captured handler become `defineProps` members, and the
 * self-call inside the markup becomes a `v-for` of the module referencing itself
 * (Vue resolves a component by the name `defineOptions` gives it).
 */
import { emptyScope } from "../transformers/expressions.js";
import {
  emitRenderNode,
  type TemplateContext,
} from "../transformers/template.js";

import type { RecursiveHelper } from "../transformers/recursive.js";
import type { GenericStatement } from "@mission-platform/forge-plugin-api";

/** Statement kinds carrying a type the auxiliary module may need. */
const TYPE_STATEMENT_KINDS: ReadonlySet<string> = new Set([
  "interface",
  "type-alias",
  "enum",
]);

/** The module-level type declarations the auxiliary source references by name. */
function carriedTypes(
  declarations: readonly GenericStatement[],
  usedText: string,
): string[] {
  return declarations
    .filter(
      (statement) =>
        TYPE_STATEMENT_KINDS.has(statement.statementKind) &&
        statement.name !== undefined &&
        new RegExp(String.raw`\b${statement.name}\b`).test(usedText),
    )
    .map((statement) => statement.text.text.replace(/^export\s+/, ""));
}

/** Build the auxiliary component's `.vue` source. */
export function buildAuxiliaryModule(
  helper: RecursiveHelper,
  context: TemplateContext,
  declarations: readonly GenericStatement[],
): string {
  // Inside the auxiliary module every binding is a prop, read by its bare name;
  // the parent's reactive tables do not apply. The CSS-Module locals are the one
  // exception: a `styles[…]` read is compile-time vocabulary that has to collapse
  // to its literal class name here too, or the auxiliary module would reference a
  // `styles` object it never declares.
  const auxContext: TemplateContext = {
    ...context,
    scope: {
      ...emptyScope(),
      styleModuleNames: context.scope.styleModuleNames,
    },
    substitutions: new Map([...context.substitutions, ...helper.substitutions]),
    slotSources: new Set(),
    nodeSubstitutions: new Map(),
    nodeArraySources: new Map(),
    restPropNames: new Set(),
    recursiveAlias: "child",
  };
  const markup = emitRenderNode(
    helper.node,
    1,
    auxContext,
    [],
    ['v-bind="$attrs"'],
  );
  const members = helper.props.map(
    (property) => `  ${property.name}: ${property.typeText};`,
  );
  const types = carriedTypes(declarations, `${members.join("\n")}\n${markup}`);
  return [
    '<script setup lang="ts">',
    ...(types.length > 0 ? [...types, ""] : []),
    `defineOptions({ name: '${helper.componentName}', inheritAttrs: false });`,
    "defineProps<{",
    ...members,
    "}>();",
    "</script>",
    "",
    "<template>",
    markup,
    "</template>",
    "",
  ].join("\n");
}
