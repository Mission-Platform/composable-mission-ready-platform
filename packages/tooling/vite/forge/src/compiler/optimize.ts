/**
 * Stage-1 (framework-neutral) optimisation passes for the Forge compiler.
 *
 * These passes run on the Oxc-parsed module **before** any per-framework
 * emitter and perform only SAFE, semantics-preserving rewrites:
 *
 * 1. **Dead-branch pruning** — fold constant conditionals (`true ? a : b`,
 *    `false && x`, `true || x`, and boolean `!` of literals) so emitters never
 *    see unreachable JSX/expressions.
 * 2. **Stable-key inference** — when a `.map(...)` over a statically-analysable
 *    stable source returns JSX without a `key`, annotate a key from the item or
 *    index parameter.
 * 3. **Static-node marking** — tag intrinsic JSX subtrees with no dynamic
 *    bindings using {@link MP_STATIC_ATTR}, so generators can hoist them out of
 *    the render path. This pass is applied to the framework-neutral generic AST
 *    (see {@link inferSemanticModule}) via the shared, parser-independent
 *    {@link optimizeGenericModule} helper.
 *
 * Dead-branch pruning and stable-key inference are expressed as source edits
 * computed from Oxc nodes and applied through the shared {@link applySourceEdits}
 * primitive; the edited source is re-parsed once per pass so no TypeScript AST
 * or printer is involved. Every pass is a no-op for constructs it does not
 * understand and no shared mutable parser state escapes a call.
 */
import { applySourceEdits, type SourceEdit } from '@mission-platform/forge-plugin-api/compiler/ast.js';
import { constantBoolean, type OptimizeOptions } from '@mission-platform/forge-plugin-api/compiler/optimize.js';

import {
  oxcArray,
  oxcIdentifierName,
  oxcNodeText,
  oxcObject,
  parseOxcModule,
  visitOxc,
  type OxcNode,
  type OxcParsedModule,
} from './oxc.js';

// Re-export the parser-independent marker/classification contracts so the rest
// of the compiler (and its public surface) shares a single implementation with
// the framework plugins instead of a duplicate TypeScript-node version.
export {
  constantBoolean,
  hasJsxKey,
  hasMpStaticMarker,
  isCompileTimeConstant,
  MP_STATIC_ATTR,
  optimizeGenericModule,
  stripMpStaticAttributes,
  stripMpStaticMarker,
  type OptimizeOptions,
} from '@mission-platform/forge-plugin-api/compiler/optimize.js';

/** Maximum dead-branch folding iterations before we assume a fixpoint. */
const MAX_FOLD_ITERATIONS = 16;

/**
 * Run the source-level Stage-1 optimisation passes (dead-branch pruning and
 * stable-key inference) over an Oxc-parsed module, returning a re-parsed module
 * whose source reflects the applied edits. Static-node marking is a pure
 * record-level transform handled by {@link optimizeGenericModule}.
 *
 * Defaults every pass ON; pass `{ deadBranchPruning: false, … }` to disable.
 */
export function optimizeForgeModule(module: OxcParsedModule, options: OptimizeOptions = {}): OxcParsedModule {
  const deadBranchPruning = options.deadBranchPruning !== false;
  const stableKeyInference = options.stableKeyInference !== false;

  let current = module;
  if (deadBranchPruning) {
    current = pruneDeadBranches(current);
  }
  if (stableKeyInference) {
    current = inferStableKeys(current);
  }
  return current;
}

/** Compatibility alias retained for compiler integrations using the old name. */
export const optimizeSourceFile = optimizeForgeModule;

// ─── dead-branch pruning ─────────────────────────────────────────────────────

/**
 * Fold constant conditionals and boolean short-circuits. Applied as
 * non-overlapping source edits (outermost foldable node wins per pass), then
 * re-parsed and repeated to a fixpoint so nested folds resolve.
 */
function pruneDeadBranches(module: OxcParsedModule): OxcParsedModule {
  let current = module;
  for (let iteration = 0; iteration < MAX_FOLD_ITERATIONS; iteration += 1) {
    const edits = collectFoldEdits(current);
    if (edits.length === 0) {
      return current;
    }
    current = parseOxcModule(current.fileName, applySourceEdits(current.source, edits));
  }
  return current;
}

function collectFoldEdits(module: OxcParsedModule): SourceEdit[] {
  const edits: SourceEdit[] = [];
  const { source } = module;
  visitOxc(module.program, (node) => {
    const edit = foldEdit(source, node);
    if (edit !== undefined) {
      edits.push(edit);
      // Do not descend into a folded node; its replacement is re-parsed next pass.
      return false;
    }
    return undefined;
  });
  return edits;
}

function nodeText(source: string, node: OxcNode | undefined): string {
  return node === undefined ? '' : oxcNodeText(source, node);
}

/** Compute a fold edit for one node, or `undefined` when it is not constant. */
function foldEdit(source: string, node: OxcNode): SourceEdit | undefined {
  if (node.type === 'ConditionalExpression') {
    const flag = constantBoolean(nodeText(source, oxcObject(node, 'test')));
    if (flag === undefined) return undefined;
    const branch = oxcObject(node, flag ? 'consequent' : 'alternate');
    if (branch === undefined) return undefined;
    return { start: node.start, end: node.end, text: nodeText(source, branch) };
  }

  if (node.type === 'LogicalExpression') {
    const operator = typeof node.operator === 'string' ? node.operator : '';
    const flag = constantBoolean(nodeText(source, oxcObject(node, 'left')));
    if (flag === undefined) return undefined;
    const right = oxcObject(node, 'right');
    if (operator === '&&') {
      return { start: node.start, end: node.end, text: flag ? nodeText(source, right) : 'false' };
    }
    if (operator === '||') {
      return { start: node.start, end: node.end, text: flag ? 'true' : nodeText(source, right) };
    }
    return undefined;
  }

  if (node.type === 'UnaryExpression' && node.operator === '!') {
    const flag = constantBoolean(nodeText(source, oxcObject(node, 'argument')));
    if (flag === undefined) return undefined;
    return { start: node.start, end: node.end, text: flag ? 'false' : 'true' };
  }

  return undefined;
}

// ─── stable-key inference ────────────────────────────────────────────────────

/**
 * For `stableSource.map((item[, index]) => <el/>)` without a `key`, insert
 * `key={item}` (primitive array sources) or `key={index}` when an index
 * parameter is present. Applied as a single source-edit pass.
 */
function inferStableKeys(module: OxcParsedModule): OxcParsedModule {
  const moduleConstArrays = collectModuleConstArrays(module);
  const edits: SourceEdit[] = [];
  const seen = new Set<number>();

  visitOxc(module.program, (node) => {
    if (node.type !== 'CallExpression') return undefined;
    const callee = oxcObject(node, 'callee');
    if (callee === undefined) return undefined;
    if (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression') return undefined;
    if (oxcIdentifierName(oxcObject(callee, 'property')) !== 'map') return undefined;
    const listSource = oxcObject(callee, 'object');
    if (listSource === undefined || !isStableMapSource(listSource, moduleConstArrays)) return undefined;

    const [callback] = oxcArray(node, 'arguments');
    if (callback === undefined) return undefined;
    if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') return undefined;

    const keyName = inferMapKeyName(callback);
    if (keyName === undefined) return undefined;

    const returned = returnedJsxElement(callback);
    if (returned === undefined) return undefined;
    const opening = returned.type === 'JSXElement' ? (oxcObject(returned, 'openingElement') ?? returned) : returned;
    if (openingHasKey(opening)) return undefined;
    const name = oxcObject(opening, 'name');
    if (name === undefined) return undefined;
    if (seen.has(name.end)) return undefined;
    seen.add(name.end);
    edits.push({ start: name.end, end: name.end, text: ` key={${keyName}}` });
    return undefined;
  });

  if (edits.length === 0) {
    return module;
  }
  return parseOxcModule(module.fileName, applySourceEdits(module.source, edits));
}

/** Module-level `const name = […literal…]` bindings — stable map sources. */
function collectModuleConstArrays(module: OxcParsedModule): ReadonlySet<string> {
  const names = new Set<string>();
  const body = oxcArray(module.program, 'body');
  for (const statement of body) {
    const declaration =
      statement.type === 'VariableDeclaration'
        ? statement
        : statement.type === 'ExportNamedDeclaration'
          ? oxcObject(statement, 'declaration')
          : undefined;
    if (declaration === undefined || declaration.type !== 'VariableDeclaration' || declaration.kind !== 'const') {
      continue;
    }
    for (const declarator of oxcArray(declaration, 'declarations')) {
      const id = oxcObject(declarator, 'id');
      const name = oxcIdentifierName(id);
      if (name === undefined) continue;
      if (initializerIsArray(oxcObject(declarator, 'init'))) {
        names.add(name);
      }
    }
  }
  return names;
}

function initializerIsArray(node: OxcNode | undefined): boolean {
  let current = node;
  while (
    current !== undefined &&
    (current.type === 'TSAsExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'TSTypeAssertion' ||
      current.type === 'ParenthesizedExpression')
  ) {
    current = oxcObject(current, 'expression');
  }
  return current !== undefined && current.type === 'ArrayExpression';
}

function isStableMapSource(node: OxcNode, moduleConstArrays: ReadonlySet<string>): boolean {
  let current: OxcNode | undefined = node;
  while (current !== undefined && current.type === 'ParenthesizedExpression') {
    current = oxcObject(current, 'expression');
  }
  if (current === undefined) return false;
  if (current.type === 'ArrayExpression') return true;
  if (current.type === 'Identifier') {
    const name = oxcIdentifierName(current);
    return name !== undefined && moduleConstArrays.has(name);
  }
  return false;
}

/**
 * Choose a key name for a map callback: prefer the index parameter when
 * present, otherwise the item parameter (safe for primitive array sources).
 */
function inferMapKeyName(callback: OxcNode): string | undefined {
  const params = oxcArray(callback, 'params');
  const indexName = oxcIdentifierName(params[1]);
  if (indexName !== undefined) return indexName;
  return oxcIdentifierName(params[0]);
}

/** Resolve the JSX element a map callback returns, unwrapping parens/blocks. */
function returnedJsxElement(callback: OxcNode): OxcNode | undefined {
  let body = oxcObject(callback, 'body');
  if (body !== undefined && body.type === 'BlockStatement') {
    const returnStatement = oxcArray(body, 'body').find((statement) => statement.type === 'ReturnStatement');
    body = returnStatement === undefined ? undefined : oxcObject(returnStatement, 'argument');
  }
  while (body !== undefined && body.type === 'ParenthesizedExpression') {
    body = oxcObject(body, 'expression');
  }
  if (body === undefined) return undefined;
  return body.type === 'JSXElement' || body.type === 'JSXSelfClosingElement' ? body : undefined;
}

function openingHasKey(opening: OxcNode): boolean {
  return oxcArray(opening, 'attributes').some(
    (attribute) => attribute.type === 'JSXAttribute' && oxcIdentifierName(oxcObject(attribute, 'name')) === 'key',
  );
}
