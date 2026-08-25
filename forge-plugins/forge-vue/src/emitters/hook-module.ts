/**
 * Vue **hook-module** (composable) emitter.
 *
 * A hook library is a set of write-once composables authored against the
 * neutral React-style hooks — not UI components. This emitter compiles such a
 * module to an idiomatic Vue composable module:
 *
 * - `useState(x)` → a reactive `ref(x)` (its setter calls become `state.value = …`);
 * - `useRef(x)`   → a Vue `shallowRef(x)` (`.current` reads collapse to `.value`);
 * - `useMemo(fn)` → a `computed(fn)`;
 * - `useEffect(fn, deps)` → Vue's native `watch`/`watchEffect`/`onMounted`
 *   APIs, selected from the dependency form.
 *
 * A composable runs **once** (unlike a re-rendering React component), so the
 * hook translations and every other statement are emitted in source order. A
 * composable whose neutral form returns a `useState`/`useMemo` value hands back
 * the underlying **ref** on Vue, so the value stays reactive for the caller;
 * that return is annotated `Ref<…>` so the emitted declarations stay portable.
 *
 * The IR records a composable's functions as retained declarations whose `text`
 * is the whole function, so this emitter splits each body itself (see
 * `../transformers/statements.js`) rather than re-parsing the module.
 */
import {
  frameworkAdapterModule,
  NEUTRAL_CONTEXT_VALUES,
  NEUTRAL_MODULE,
  NEUTRAL_RUNTIME_VALUES,
} from "@mission-platform/forge-plugin-api/compiler/ast.js";

import { constantMemoValue } from "../transformers/constants.js";
import {
  emptyScope,
  rewriteExpression,
  type VueScope,
} from "../transformers/expressions.js";
import {
  readFunctionParts,
  readVariableStatement,
  splitStatements,
} from "../transformers/statements.js";
import {
  endOfTypeArguments,
  indexOfTopLevel,
  matchBracket,
  splitTopLevel,
  unwrapParentheses,
} from "../transformers/text.js";

import type {
  GenericStatement,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** The subset of Vue's API the hook translation can reference, imported from `vue`. */
const VUE_RUNTIME_IMPORTS: readonly string[] = [
  "ref",
  "shallowRef",
  "computed",
  "watch",
  "watchEffect",
  "onMounted",
  "onUnmounted",
];

/** The Vue **type** imports an annotated composable return may reference. */
const VUE_TYPE_IMPORTS: readonly string[] = ["Ref", "ComputedRef"];

/** The neutral ref type whose Vue equivalent is `Ref` (`MpRef<X>` → `Ref<X>`). */
const NEUTRAL_REF_TYPE = "MpRef";

const ADAPTER_MODULE = frameworkAdapterModule("vue");

/** Neutral values that remain runtime calls in a plain helper module. */
const NEUTRAL_HELPER_VALUES: ReadonlySet<string> = new Set([
  ...NEUTRAL_RUNTIME_VALUES,
  "h",
]);

/** A composable's header split into its signature and its declared return type. */
interface HeaderParts {
  /** Everything up to and including the parameter list's `)`. */
  readonly signature: string;
  /** The declared return type, when the source annotated one. */
  readonly returnType?: string;
}

/** Split a function header into its signature and declared return type. */
function readHeader(header: string): HeaderParts {
  const open = header.indexOf("(");
  const close = open === -1 ? -1 : matchBracket(header, open);
  if (close === -1) {
    return { signature: header };
  }
  const rest = header.slice(close + 1).trim();
  return rest.startsWith(":")
    ? {
        signature: header.slice(0, close + 1),
        returnType: rest.slice(1).trim(),
      }
    : { signature: header.slice(0, close + 1) };
}

/** The callee name of a call expression text (`useState<number>(0)` → `useState`). */
function calleeName(text: string): string | undefined {
  return /^([A-Za-z_$][\w$]*)\s*[<(]/.exec(text.trim())?.[1];
}

/**
 * The extent of a call's `<…>` type-argument list, as `[open, end)`, or
 * `undefined` when the call has none.
 *
 * The list is scanned rather than delimited by the first `(`: a function type
 * inside it (`useRef<(() => void) | undefined>(undefined)`) opens parentheses
 * of its own, which would otherwise be mistaken for the call's argument list.
 */
function typeArgumentRange(
  trimmed: string,
): readonly [number, number] | undefined {
  const open = trimmed.indexOf("<");
  if (open === -1 || trimmed.slice(0, open).includes("(")) {
    return undefined;
  }
  const end = endOfTypeArguments(trimmed, open);
  return end === -1 ? undefined : [open, end];
}

/** The explicit type argument of a hook call (`useState<number>(0)` → `number`). */
function typeArgument(text: string): string | undefined {
  const trimmed = text.trim();
  const range = typeArgumentRange(trimmed);
  return range === undefined
    ? undefined
    : trimmed.slice(range[0] + 1, range[1] - 1).trim();
}

/** The arguments of the outermost call in `text`. */
function callArguments(text: string): string[] {
  const trimmed = text.trim();
  const open = trimmed.indexOf("(", typeArgumentRange(trimmed)?.[1] ?? 0);
  if (open === -1) {
    return [];
  }
  const close = matchBracket(trimmed, open);
  return close === -1 ? [] : splitTopLevel(trimmed.slice(open + 1, close), ",");
}

/** The names bound by a destructuring pattern or a plain identifier. */
function bindingNames(binding: string): string[] {
  const trimmed = binding.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) {
    return [trimmed];
  }
  return splitTopLevel(trimmed.slice(1, -1), ",").map((part) => {
    const withoutDefault = part.split("=")[0].trim();
    return (withoutDefault.split(":").at(-1) ?? withoutDefault).trim();
  });
}

/** The reactive names a composable body declares, registered on a fresh scope. */
function collectScope(statements: readonly string[]): VueScope {
  const stateNames = new Set<string>();
  const setterToState = new Map<string, string>();
  const refNames = new Set<string>();
  const memoNames = new Set<string>();
  for (const statement of statements) {
    const parts = readVariableStatement(statement);
    if (parts === undefined) {
      continue;
    }
    const callee = calleeName(parts.initializer);
    const [primary, secondary] = bindingNames(parts.binding);
    if (primary === undefined) {
      continue;
    }
    if (callee === "useState") {
      stateNames.add(primary);
      if (secondary !== undefined) {
        setterToState.set(secondary, primary);
      }
      continue;
    }
    if (callee === "useRef") {
      refNames.add(primary);
      continue;
    }
    if (callee === "useMemo") {
      // A factory that can never change folds to a plain const, so it is not a
      // reactive name — reading it must not go through `.value`.
      const [factory] = callArguments(parts.initializer);
      if (factory === undefined || constantMemoValue(factory) === undefined) {
        memoNames.add(primary);
      }
    }
  }
  // A composable has no props parameter, so only the reactive locals matter.
  return { ...emptyScope(""), stateNames, setterToState, refNames, memoNames };
}

/** Translate one composable statement into its Vue form. */
function emitStatement(
  statement: string,
  scope: VueScope,
  vueImports: Set<string>,
): string {
  const parts = readVariableStatement(statement);
  if (parts !== undefined) {
    const callee = calleeName(parts.initializer);
    const [primary] = bindingNames(parts.binding);
    const generic = typeArgument(parts.initializer);
    const [initial] = callArguments(parts.initializer);
    const argument =
      initial === undefined ? "" : rewriteExpression(initial, scope);
    if (callee === "useState" && primary !== undefined) {
      vueImports.add("ref");
      return `const ${primary} = ref${generic === undefined ? "" : `<${generic}>`}(${argument});`;
    }
    if (callee === "useRef" && primary !== undefined) {
      // `useRef` is a non-reactive container, so it maps to `shallowRef` — a deep
      // `ref` would reactive-proxy whatever it stores.
      vueImports.add("shallowRef");
      return `const ${primary} = shallowRef${generic === undefined ? "" : `<${generic}>`}(${argument});`;
    }
    if (callee === "useMemo" && primary !== undefined) {
      const constant =
        initial === undefined ? undefined : constantMemoValue(initial);
      if (constant !== undefined) {
        return `const ${primary} = ${constant};`;
      }
      vueImports.add("computed");
      return `const ${primary} = computed(${argument});`;
    }
  }
  if (calleeName(statement) === "useEffect") {
    const [callback, dependencies] = callArguments(statement);
    if (callback === undefined) {
      return "";
    }
    const callbackText = rewriteExpression(callback, scope);
    const callbackBody = callbackText.trim();
    const hasCleanup = (() => {
      const arrow = indexOfTopLevel(callbackBody, "=>");
      if (arrow === -1) return false;
      const body = callbackBody.slice(arrow + 2).trim();
      return (
        body.startsWith("{") &&
        body.endsWith("}") &&
        indexOfTopLevel(body.slice(1, -1), "return") !== -1
      );
    })();
    const invoke = hasCleanup
      ? `const result = (${callbackText})(); if (typeof result === "function") onCleanup(result);`
      : `(${callbackText})();`;
    if (dependencies === undefined) {
      return hasCleanup
        ? `watchEffect((onCleanup) => { ${invoke} });`
        : `watchEffect(${callbackText});`;
    }
    if (dependencies.replace(/\s/g, "") === "[]") {
      return hasCleanup
        ? `(() => { let cleanup: (() => void) | undefined; onMounted(() => { const result = (${callbackText})(); cleanup = typeof result === "function" ? result : undefined; }); onUnmounted(() => cleanup?.()); })();`
        : `onMounted(${callbackText});`;
    }
    const source = rewriteExpression(dependencies, scope);
    return hasCleanup
      ? `watch(() => ${source}, (_value, _oldValue, onCleanup) => { ${invoke} }, { immediate: true });`
      : `watch(() => ${source}, ${callbackText}, { immediate: true });`;
  }
  return rewriteExpression(statement, scope);
}

/**
 * The Vue return type for a composable: a returned `useState`/`useMemo` value
 * hands back its ref, so the annotation becomes `Ref<declared>`; a returned
 * `useRef` is already a ref, whose neutral `MpRef<X>` maps to `Ref<X>`.
 */
function vueReturnType(
  declared: string | undefined,
  returned: string | undefined,
  scope: VueScope,
  vueTypeImports: Set<string>,
): string | undefined {
  if (declared === undefined || returned === undefined) {
    return declared;
  }
  if (scope.stateNames.has(returned) || scope.memoNames.has(returned)) {
    vueTypeImports.add("Ref");
    return `Ref<${declared}>`;
  }
  if (scope.refNames.has(returned)) {
    vueTypeImports.add("Ref");
    const inner = new RegExp(
      String.raw`^${NEUTRAL_REF_TYPE}\s*<([\s\S]*)>$`,
    ).exec(declared)?.[1];
    return inner === undefined ? declared : `Ref<${inner.trim()}>`;
  }
  return declared;
}

/**
 * Emit an object-literal return as Vue-reactive source: every property whose
 * value is a reactive local becomes a **getter**, so each caller read
 * re-evaluates the ref (a composable's body runs once, so a plain `x.value`
 * would snapshot the value and lose reactivity).
 */
function emitReturnObject(
  text: string,
  scope: VueScope,
  returnTypeName: string | undefined,
): string {
  const isReactive = (name: string): boolean =>
    scope.stateNames.has(name) || scope.memoNames.has(name);
  const assertion = (key: string): string =>
    returnTypeName === undefined ? "" : ` as ${returnTypeName}['${key}']`;
  const members = splitTopLevel(text.trim().slice(1, -1), ",")
    .map((member) => member.trim())
    .filter((member) => member.length > 0)
    .map((member) => {
      const colon = indexOfTopLevel(member, ":");
      if (colon === -1) {
        return isReactive(member)
          ? `get ${member}() { return ${member}.value${assertion(member)}; }`
          : rewriteExpression(member, scope);
      }
      const key = member.slice(0, colon).trim();
      const value = member.slice(colon + 1).trim();
      return isReactive(value)
        ? `get ${key}() { return ${value}.value${assertion(key)}; }`
        : `${key}: ${rewriteExpression(value, scope)}`;
    });
  return `{\n    ${members.join(",\n    ")},\n  }`;
}

/** Translate one neutral composable declaration into its Vue source. */
function emitComposable(
  declaration: GenericStatement,
  vueImports: Set<string>,
  vueTypeImports: Set<string>,
): string {
  const parts = readFunctionParts(declaration.text.text);
  if (parts === undefined) {
    return "";
  }
  const { signature, returnType } = readHeader(parts.header);
  const statements = splitStatements(parts.body);
  const scope = collectScope(statements);
  const lines: string[] = [];
  let returnedText: string | undefined;
  for (const statement of statements) {
    const returned = /^return\b([\s\S]*);?$/.exec(statement.trim());
    if (returned !== null) {
      returnedText = returned[1].trim().replace(/;$/, "").trim();
      continue;
    }
    const line = emitStatement(statement, scope, vueImports);
    if (line.length > 0) {
      lines.push(line);
    }
  }

  const returnedName =
    returnedText !== undefined && /^[A-Za-z_$][\w$]*$/.test(returnedText)
      ? returnedText
      : undefined;
  const isObjectReturn =
    returnedText !== undefined &&
    unwrapParentheses(returnedText).startsWith("{");
  const annotation = isObjectReturn
    ? returnType
    : vueReturnType(returnType, returnedName, scope, vueTypeImports);
  if (returnedText !== undefined) {
    if (isObjectReturn) {
      const objectTypeName =
        returnType !== undefined && /^[A-Za-z_$][\w$]*$/.test(returnType)
          ? returnType
          : undefined;
      lines.push(
        `return ${emitReturnObject(unwrapParentheses(returnedText), scope, objectTypeName)};`,
      );
    } else if (
      returnedName !== undefined &&
      annotation !== undefined &&
      (scope.stateNames.has(returnedName) ||
        scope.memoNames.has(returnedName) ||
        scope.refNames.has(returnedName))
    ) {
      // Vue's `ref()` widens its element type through `UnwrapRef`, which does not
      // match the annotation for a generic parameter; the assertion keeps the
      // generated composable type-clean. Safe: the return is a bare identifier.
      lines.push(`return ${returnedName} as ${annotation};`);
    } else {
      lines.push(`return ${rewriteExpression(returnedText, scope)};`);
    }
  }

  const header =
    annotation === undefined ? signature : `${signature}: ${annotation}`;
  return `${header} {\n${lines.map((line) => `  ${line}`).join("\n")}\n}`;
}

/** Flatten a relative specifier to the generated tree's flat layout. */
function flatSpecifier(specifier: string): string {
  const base = specifier
    .split("/")
    .findLast(
      (segment) => segment !== "." && segment !== ".." && segment.length > 0,
    );
  return `./${base ?? specifier}`;
}

/** Compile a neutral hook module to its Vue composable source (`.ts`). */
export function emitVueHookModule(module: SemanticModule): string {
  const { ast } = module;
  const vueImports = new Set<string>();
  const vueTypeImports = new Set<string>();
  const blocks: string[] = [];

  for (const declaration of ast.declarations) {
    if (declaration.statementKind === "function") {
      const block = emitComposable(declaration, vueImports, vueTypeImports);
      if (block.length > 0) {
        blocks.push(block);
      }
      continue;
    }
    // Everything else (interfaces, type aliases, plain consts) is carried over.
    blocks.push(declaration.text.text);
  }
  const emittedBody = blocks.join("\n\n");

  const importLines: string[] = [];
  const vueImportNames = [
    ...VUE_RUNTIME_IMPORTS.filter((name) => vueImports.has(name)),
    ...VUE_TYPE_IMPORTS.filter((name) => vueTypeImports.has(name)).map(
      (name) => `type ${name}`,
    ),
  ];
  if (vueImportNames.length > 0) {
    importLines.push(`import { ${vueImportNames.join(", ")} } from 'vue';`);
  }
  const neutralTypes: string[] = [];
  const neutralRuntimeValues: string[] = [];
  const contextValues: string[] = [];
  for (const entry of ast.imports) {
    if (entry.source === NEUTRAL_MODULE) {
      // Keep only the neutral types still referenced in the emitted body: a type
      // used solely by a dropped return annotation must not linger as an unused
      // import under `noUnusedLocals`.
      neutralTypes.push(
        ...entry.typeNames.filter((name) =>
          new RegExp(String.raw`\b${name}\b`).test(emittedBody),
        ),
      );
      contextValues.push(
        ...entry.valueNames.filter((name) => NEUTRAL_CONTEXT_VALUES.has(name)),
      );
      neutralRuntimeValues.push(
        ...entry.valueNames.filter(
          (name) =>
            NEUTRAL_HELPER_VALUES.has(name) &&
            new RegExp(String.raw`\b${name}\b`).test(emittedBody),
        ),
      );
      continue;
    }
    if (entry.source.startsWith(".")) {
      importLines.push(
        entry.text.replace(entry.source, flatSpecifier(entry.source)),
      );
      continue;
    }
    importLines.push(entry.text);
  }
  if (neutralTypes.length > 0) {
    importLines.push(
      `import type { ${neutralTypes.join(", ")} } from '${NEUTRAL_MODULE}';`,
    );
  }
  if (neutralRuntimeValues.length > 0) {
    importLines.push(
      `import { ${neutralRuntimeValues.join(", ")} } from '${NEUTRAL_MODULE}';`,
    );
  }
  // Context primitives are remapped to the Vue adapter (a `provide`/`inject`-backed
  // implementation matching the neutral semantics), mirroring the component emitter.
  if (contextValues.length > 0) {
    importLines.push(
      `import { ${contextValues.join(", ")} } from '${ADAPTER_MODULE}';`,
    );
  }

  return `${importLines.join("\n")}\n\n${emittedBody}\n`;
}
