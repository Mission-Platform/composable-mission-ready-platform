/**
 * Svelte 5 single-file-component emitter.
 *
 * The emitter is a **printer**: every decision was already taken by
 * `lowerSvelteModule` (which rune each neutral fact becomes) and refined by
 * `optimizeSvelteModule` (what is hoisted, pruned or converted). What is left
 * here is turning that plan into a `.svelte` module —
 *
 * - a `<script lang="ts">` block: the imports the plan needs, the imports the
 *   source carries over, the retained type declarations, the `$props()`
 *   destructure, source-ordered `$state` / `bind:this` / `$derived` / setup
 *   initializers, and finally the `$effect` / `onMount` lifecycles,
 * - the markup, built from the component's returned render nodes by
 *   `../transformers/template.js`, preceded by a `{#snippet}` for every static
 *   subtree the optimizer hoisted out of the reactive scope.
 *
 * Every expression it prints passes through `scopeExpression`, so prop reads,
 * ref reads, slot checks and state assignments come out in Svelte form.
 */

import { lowerSvelteModule, type SvelteLoweredModule } from "../lower.js";
import {
  scopeExpression,
  type SvelteScope,
} from "../transformers/expression.js";
import { componentImports } from "../transformers/imports.js";
import {
  hoistedStaticLookup,
  NO_HOISTED_STATIC,
  renderExpression,
  renderNode,
  type SvelteTemplateContext,
} from "../transformers/template.js";

import type {
  GeneratedExtraModule,
  GenericRenderNode,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** A generated `.svelte` module and any auxiliary modules written beside it. */
export interface SvelteModuleOutput {
  readonly code: string;
  readonly extraModules?: readonly GeneratedExtraModule[];
}

/** One `import` line of the generated script. */
function importLine(
  module: string,
  names: readonly string[],
  typeOnly: boolean,
): string {
  return `import ${typeOnly ? "type " : ""}{ ${names.join(", ")} } from '${module}';`;
}

/** The `$props()` destructure entry of one lowered prop. */
function propEntry(
  entry: SvelteLoweredModule["propsContract"][number],
  scope: SvelteScope,
): string {
  // A slot's prop key is markup vocabulary and may be hyphenated
  // (`'start-header': startHeader`), which only reads as a key when quoted.
  const key = /^[A-Za-z_$][\w$]*$/.test(entry.name)
    ? entry.name
    : `'${entry.name}'`;
  const binding =
    entry.local === entry.name ? entry.name : `${key}: ${entry.local}`;
  return entry.defaultValue === undefined
    ? binding
    : `${binding} = ${scopeExpression(entry.defaultValue, scope)}`;
}

/** The `<script>` declaration of one `$derived` binding. */
function derivedLine(
  entry: SvelteLoweredModule["derived"][number],
  scope: SvelteScope,
): string {
  const expression = scopeExpression(entry.expression, scope);
  if (entry.kind === "derived-by") {
    return `const ${entry.name} = $derived.by(${expression});`;
  }
  return entry.kind === "derived"
    ? `const ${entry.name} = $derived(${expression});`
    : `const ${entry.name} = ${expression};`;
}

/** The `<script>` declaration of one lifecycle. */
function effectLine(
  entry: SvelteLoweredModule["effects"][number],
  scope: SvelteScope,
): string {
  const body = scopeExpression(entry.body, scope);
  return entry.lifecycle === "mount"
    ? `onMount(${body});`
    : `$effect(${body});`;
}

/**
 * Whether a returned expression can produce markup at all. Anything else (a
 * plain value a mis-detected component returns) degrades to an empty template
 * rather than leaking a stray `{expr}` — or, worse, a bare `return` — into the
 * generated module.
 */
function isRenderable(
  text: string,
  nodes: readonly GenericRenderNode[],
  context: SvelteTemplateContext,
): boolean {
  const trimmed = text.trim();
  return (
    nodes.length > 0 ||
    /\bh\s*\(/.test(trimmed) ||
    context.jsxConstants.has(trimmed) ||
    context.childrenAliases.has(trimmed) ||
    [...context.renderHelpers].some((name) =>
      new RegExp(`^${name}\\s*\\(`).test(trimmed),
    )
  );
}

/** The markup a returned expression produces, or the empty string. */
function returnMarkup(
  returned: { text: string; nodes: readonly GenericRenderNode[] } | undefined,
  context: SvelteTemplateContext,
): string {
  if (
    returned === undefined ||
    !isRenderable(returned.text, returned.nodes, context)
  ) {
    return "";
  }
  return renderExpression(returned.text, returned.nodes, context);
}

/**
 * Print a neutral component module as a Svelte 5 SFC. A caller that already ran
 * the target phases passes the refined `plan`; a direct caller gets a freshly
 * lowered one, so the emitter is always driven by the same contract.
 */
export function emitSvelteModule(
  module: SemanticModule,
  componentName: string = "Component",
  componentFolders: ReadonlySet<string> = new Set(),
  plan?: SvelteLoweredModule,
): SvelteModuleOutput {
  const lowered =
    plan ??
    lowerSvelteModule(module, {
      framework: "svelte",
      moduleKind: module.moduleKind,
      componentName,
      componentFolders,
    }).lowered;
  const { script } = lowered;
  const declaredRenderProps = script.declarations.flatMap((declaration) => [
    ...declaration.matchAll(
      /\b([A-Za-z_$][\w$]*)\s*\??:\s*MpRenderProperty\s*</g,
    ),
  ]);
  const renderProps = new Set([
    ...lowered.propsContract
      .filter((entry) => /\bMpRenderProperty\s*</.test(entry.type ?? ""))
      .map((entry) => entry.local),
    ...declaredRenderProps.map((match) => {
      const name = match[1]!;
      return script.propAliases.get(name) ?? name;
    }),
  ]);
  const scope: SvelteScope = {
    propsParameter: script.propsParameter,
    propAliases: script.propAliases,
    refNames: script.refNames,
    setterNames: script.setterNames,
  };
  const hoistedStatic = hoistedStaticLookup(lowered.hoistedStatic);
  const context: SvelteTemplateContext = {
    scope,
    jsxConstants: script.jsxConstants,
    childrenAliases: script.childrenAliases,
    renderHelpers: new Set(script.renderHelpers?.keys()),
    renderProps,
    listKeys: lowered.listKeys,
    dynamicNodes: lowered.dynamicNodes,
    hoistedStatic,
  };

  const imports = [
    ...lowered.svelteImports.map((entry) =>
      importLine(entry.module, entry.names, entry.typeOnly),
    ),
    ...componentImports(module.ast.imports, componentFolders),
  ];

  const propsAnnotation =
    script.propsType === undefined ? "" : `: ${script.propsType}`;
  const restEntry =
    lowered.script.restName === undefined
      ? ""
      : `, ...${lowered.script.restName}`;
  const propsLine = `let { ${lowered.propsContract
    .map((entry) => propEntry(entry, scope))
    .join(", ")}${restEntry} }${propsAnnotation} = $props();`;

  const stateLines = lowered.runeState.map(
    (entry) =>
      `let ${entry.name} = $state(${
        entry.initializer === undefined
          ? "undefined"
          : scopeExpression(entry.initializer, scope)
      });`,
  );
  const bindingLines = lowered.bindings.map((entry) => {
    const typeArgument =
      entry.elementType === undefined ? "" : `<${entry.elementType}>`;
    const initial =
      entry.initializer === undefined
        ? ""
        : scopeExpression(entry.initializer, scope);
    return `let ${entry.name} = $state${typeArgument}(${initial});`;
  });
  const derivedLines = lowered.derived.map((entry) =>
    derivedLine(entry, scope),
  );
  const defaultInitializationLines = [
    ...stateLines,
    ...bindingLines,
    ...derivedLines,
    ...script.setupStatements.map((statement) =>
      scopeExpression(statement, scope),
    ),
  ];
  const stateLineByName = new Map(
    lowered.runeState.map((entry, index) => [
      entry.name,
      stateLines[index] ?? "",
    ]),
  );
  const bindingLineByName = new Map(
    lowered.bindings.map((entry, index) => [
      entry.name,
      bindingLines[index] ?? "",
    ]),
  );
  const derivedLineByName = new Map(
    lowered.derived.map((entry, index) => [
      entry.name,
      derivedLines[index] ?? "",
    ]),
  );
  const initializationLines =
    script.initializationOrder?.map((entry) => {
      if (entry.kind === "setup") {
        return scopeExpression(
          script.setupStatements[entry.index] ?? "",
          scope,
        );
      }
      if (entry.kind === "state") {
        // The optimizer can convert a state entry to `$derived` while its
        // source-order slot intentionally remains unchanged.
        return (
          stateLineByName.get(entry.name) ??
          derivedLineByName.get(entry.name) ??
          ""
        );
      }
      if (entry.kind === "binding")
        return bindingLineByName.get(entry.name) ?? "";
      return derivedLineByName.get(entry.name) ?? "";
    }) ?? defaultInitializationLines;

  const scriptBody = [
    ...imports,
    ...script.declarations,
    propsLine,
    ...initializationLines,
    ...lowered.effects.map((entry) => effectLine(entry, scope)),
  ]
    .map((line) => `  ${line}`)
    .join("\n");

  // Static subtrees hoisted out of the reactive scope are declared once, ahead
  // of the markup, and rendered by name wherever they occurred. Their own
  // markup is printed with hoisting disabled so a snippet never renders itself.
  const snippetContext: SvelteTemplateContext = {
    ...context,
    hoistedStatic: NO_HOISTED_STATIC,
  };
  const snippets = lowered.hoistedStatic.map(
    (entry) =>
      `{#snippet ${entry.name}()}${renderNode(entry.node, snippetContext)}{/snippet}`,
  );

  // A JSX-returning local helper is declared once as a parameterised snippet and
  // rendered by name (`{@render renderRow(item)}`) wherever it was called. A
  // block-bodied helper's leading `const`s become `{@const}`s inside the snippet.
  const helperSnippets = [...(script.renderHelpers?.values() ?? [])].map(
    (helper) => {
      const parameters = helper.parameters.join(", ");
      const constants = helper.constants
        .map(
          (constant) =>
            `{@const ${constant.name} = ${scopeExpression(constant.value, scope)}}`,
        )
        .join("");
      const returnedMarkup = (returned: {
        text: string;
        nodes: readonly GenericRenderNode[];
      }): string =>
        returned.text === "undefined" || returned.text === "null"
          ? ""
          : renderExpression(returned.text, returned.nodes, context);
      const fallback =
        helper.returned === undefined ? "" : returnedMarkup(helper.returned);
      const branches = helper.branches.map((branch, index) => {
        const keyword = index === 0 ? "#if" : ":else if";
        return `{${keyword} ${scopeExpression(branch.condition, scope)}}${returnedMarkup(branch)}`;
      });
      const markup =
        branches.length === 0
          ? fallback
          : `${branches.join("")}${helper.returned === undefined ? "" : `{:else}${fallback}`}{/if}`;
      return `{#snippet ${helper.name}(${parameters})}${constants}${markup}{/snippet}`;
    },
  );

  // An early return folds into a leading `{#if}` chain whose `{:else}` is the
  // component's final return, so no bare `return` ever reaches the output.
  const fallback = returnMarkup(script.finalReturn, context);
  const branches = script.returnBranches.map((branch, index) => {
    const keyword = index === 0 ? "#if" : ":else if";
    return `{${keyword} ${scopeExpression(branch.condition, scope)}}${returnMarkup(branch, context)}`;
  });
  const body =
    branches.length > 0
      ? `${branches.join("")}{:else}${fallback}{/if}`
      : fallback;
  const template = [...snippets, ...helperSnippets, body].join("\n");

  return {
    code: `<script lang="ts">\n${scriptBody}\n</script>\n\n${template}\n`,
  };
}
