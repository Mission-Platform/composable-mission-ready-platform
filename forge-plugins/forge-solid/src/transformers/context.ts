/**
 * The state every SolidJS lowering pass shares.
 *
 * The context answers the three questions the rewrites keep asking — *which
 * names are reactive getters?*, *what is the props parameter called?*, *which
 * Solid primitives have been used so far?* — and collects the module-level
 * constants static subtrees are hoisted into.
 *
 * The reactive facts come from the semantic intentions when the frontend
 * recorded them (`intentions.state`, `intentions.memos`, `intentions.refs`);
 * a module that reached the target without an inference pass falls back to the
 * declarations carried by the generic AST, so both paths agree on the getter
 * set.
 */

import { constantMemoValue } from "./constants.js";
import { matchBracket, splitTopLevel } from "./text.js";

import type {
  GenericComponent,
  GenericStatement,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** The SolidJS primitives referenced by the rewrites, so the import builder can include them. */
export interface SolidPrimitiveUsage {
  createSignal: boolean;
  createMemo: boolean;
  createEffect: boolean;
  onMount: boolean;
  onCleanup: boolean;
  createUniqueId: boolean;
  mergeProps: boolean;
}

/** Runtime helpers the lowered output needs beyond the Solid primitives. */
export interface SolidRuntimeUsage {
  /** A `<Dynamic>` was lowered to an `h(…)` call, so the hyperscript import is required. */
  dynamic: boolean;
  /** An array-valued `className` collapsed to a `classNames(…)` call. */
  classNames: boolean;
  /** An `i18next.t(…)` call was rewritten, so the component needs `const { t } = useI18n();`. */
  i18n: boolean;
}

/** Everything the statement, expression and JSX lowerings need. */
export interface SolidLoweringContext {
  /** The name the component's props object is bound to. */
  readonly propertiesName: string;
  /** Names bound to a signal/memo getter, whose reads become calls. */
  readonly getters: ReadonlySet<string>;
  /** Names bound to a `useRef` container, whose `ref={…}` uses become callbacks. */
  readonly refs: ReadonlySet<string>;
  /** Solid primitives referenced so far (mutated as lowering proceeds). */
  readonly usage: SolidPrimitiveUsage;
  /** Runtime helpers referenced so far (mutated as lowering proceeds). */
  readonly runtime: SolidRuntimeUsage;
  /** Module-level `const` declarations for hoisted static subtrees. */
  readonly hoisted: string[];
  /** Whether static subtrees may be hoisted at all (the `solid:hoist-static-subtrees` gate). */
  readonly hoistStatic: boolean;
  /** Whether a fragment wrapping a single child collapses to that child. */
  readonly collapseFragments: boolean;
  /** Neutral expression text → the `createMemo` binding it is read through. */
  readonly memoized: ReadonlyMap<string, string>;
  /** Memo bindings the printing actually referenced, so unused ones are not declared. */
  readonly usedMemos: Set<string>;
  /** Set while printing inside an already-hoisted subtree, so nested markers do not hoist again. */
  hoisting: boolean;
}

/** The default props parameter name when the component takes no parameter. */
const DEFAULT_PROPERTIES_NAME = "properties";

/** `const [open, setOpen] = useState(…)` — the state declaration the getter set is read from. */
const STATE_DECLARATION =
  /(?:const|let|var)\s*\[\s*([A-Za-z_$][\w$]*)[^\]]*\]\s*=\s*useState\s*[<(]/g;

/** `const label = useMemo(…)` — the memo declaration the getter set is read from. */
const MEMO_DECLARATION =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*useMemo\s*(?:<[^(]*>)?\s*\(/g;

/** `const node = useRef(…)` — the ref declaration the `ref={…}` rewrite is driven by. */
const REF_DECLARATION =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*useRef\s*[<(]/g;

/** Every statement of the module the reactive declarations may live in. */
function reactiveStatements(
  module: SemanticModule,
): readonly GenericStatement[] {
  const component: GenericComponent | undefined = module.ast.component;
  return [...module.ast.declarations, ...(component?.body ?? [])];
}

/** The names matched by a declaration pattern across the given statements. */
function declaredNames(
  statements: readonly GenericStatement[],
  pattern: RegExp,
): string[] {
  const names: string[] = [];
  for (const statement of statements) {
    for (const match of statement.text.text.matchAll(pattern)) {
      const name = match[1];
      if (name !== undefined) {
        names.push(name);
      }
    }
  }
  return names;
}

/** A `useMemo` binding found in the module source, with its factory argument. */
interface MemoDeclaration {
  readonly name: string;
  readonly factory?: string;
}

/** Every `const … = useMemo(factory, deps)` declaration carried by the given statements. */
function memoDeclarations(
  statements: readonly GenericStatement[],
): MemoDeclaration[] {
  const declarations: MemoDeclaration[] = [];
  for (const statement of statements) {
    const text = statement.text.text;
    for (const match of text.matchAll(MEMO_DECLARATION)) {
      const name = match[1];
      if (name === undefined) {
        continue;
      }
      const open = match.index + match[0].length - 1;
      const close = matchBracket(text, open);
      const factory =
        close === -1
          ? undefined
          : splitTopLevel(text.slice(open + 1, close), ",")[0];
      declarations.push(factory === undefined ? { name } : { name, factory });
    }
  }
  return declarations;
}

/**
 * The names whose reads must become getter calls within the given statements:
 * every `useState` binding plus every genuinely reactive `useMemo` binding (a
 * memo folded to a constant is a plain value, so its reads stay bare).
 */
function collectGetters(
  statements: readonly GenericStatement[],
  states: readonly string[],
  memos: readonly MemoDeclaration[],
): ReadonlySet<string> {
  const getters = new Set<string>();
  const folded = new Set<string>();
  const remember = ({ name, factory }: MemoDeclaration): void => {
    getters.add(name);
    if (factory !== undefined && constantMemoValue(factory) !== undefined) {
      folded.add(name);
    }
  };

  for (const name of [
    ...states,
    ...declaredNames(statements, STATE_DECLARATION),
  ]) {
    getters.add(name);
  }
  for (const declaration of [...memos, ...memoDeclarations(statements)]) {
    remember(declaration);
  }
  for (const name of folded) {
    getters.delete(name);
  }
  return getters;
}

/** The reactive `useMemo` bindings the semantic intentions recorded. */
function intendedMemos(module: SemanticModule): MemoDeclaration[] {
  return module.intentions.memos.map((memo) => ({
    name: memo.name,
    factory: memo.factory.text,
  }));
}

/** Every name whose reads become getter calls somewhere in the module. */
export function collectSolidGetters(
  module: SemanticModule,
): ReadonlySet<string> {
  return collectGetters(
    reactiveStatements(module),
    module.intentions.state.map((state) => state.name),
    intendedMemos(module),
  );
}

/**
 * The getters in scope for a **module-level** statement — only what the
 * module's own declarations bind.
 *
 * A component's signals and memos live inside the component function, so a
 * top-level helper cannot see them: a parameter or local of
 * `function buildCells(viewYear: number)` that happens to share a signal's name
 * is a plain value there and must keep its bare reads.
 */
export function collectModuleScopeGetters(
  module: SemanticModule,
): ReadonlySet<string> {
  return collectGetters(module.ast.declarations, [], []);
}

/** The names bound to a `useRef` container. */
function collectSolidRefs(module: SemanticModule): ReadonlySet<string> {
  const refs = new Set<string>();
  for (const ref of module.intentions.refs) {
    refs.add(ref.name);
  }
  for (const name of declaredNames(
    reactiveStatements(module),
    REF_DECLARATION,
  )) {
    refs.add(name);
  }
  return refs;
}

/** The name the component's props object is bound to. */
function propertiesName(module: SemanticModule): string {
  const recorded = module.intentions.propsParameterName;
  if (recorded !== undefined && recorded !== "") {
    return recorded;
  }
  const parameter = module.ast.component?.parameter;
  if (parameter?.binding === "identifier" && parameter.names[0] !== undefined) {
    return parameter.names[0];
  }
  return DEFAULT_PROPERTIES_NAME;
}

/** Options a lowered plan passes down to the printers. */
export interface SolidLoweringOptions {
  /** Whether static subtrees may be hoisted to module constants. Defaults to `true`. */
  readonly hoistStatic?: boolean;
  /** Whether a fragment wrapping a single child collapses to that child. Defaults to `false`. */
  readonly collapseFragments?: boolean;
  /** Neutral expression text → the `createMemo` binding it is read through. */
  readonly memoized?: ReadonlyMap<string, string>;
}

/** Build the lowering context for a module. */
export function createSolidLoweringContext(
  module: SemanticModule,
  options: SolidLoweringOptions = {},
): SolidLoweringContext {
  return {
    propertiesName: propertiesName(module),
    getters: collectSolidGetters(module),
    refs: collectSolidRefs(module),
    usage: {
      createSignal: false,
      createMemo: false,
      createEffect: false,
      onMount: false,
      onCleanup: false,
      createUniqueId: false,
      mergeProps: false,
    },
    runtime: { dynamic: false, classNames: false, i18n: false },
    hoisted: [],
    hoistStatic: options.hoistStatic !== false,
    collapseFragments: options.collapseFragments === true,
    memoized: options.memoized ?? new Map<string, string>(),
    usedMemos: new Set<string>(),
    hoisting: false,
  };
}

/**
 * The same context restricted to **module scope**, for lowering the statements
 * that sit outside the component function. The mutable collections — the
 * primitive usage, the runtime usage and the hoisted constants — stay shared,
 * so what a declaration needs still reaches the import block.
 */
export function createModuleScopeContext(
  module: SemanticModule,
  context: SolidLoweringContext,
): SolidLoweringContext {
  return { ...context, getters: collectModuleScopeGetters(module) };
}
