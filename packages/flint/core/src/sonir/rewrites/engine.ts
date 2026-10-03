import type { LowLevelSonNode, LowLevelSonOpcode } from '../low-level/dialect.js';

/**
 * Context passed to rewrite rule match and transform callbacks.
 */
export interface RewriteContext {
  readonly getNode: (id: number) => LowLevelSonNode | undefined;
  readonly createConstantNode: (value: number | boolean | string | bigint, type?: string) => LowLevelSonNode;
}

/**
 * Declarative rewrite rule specification.
 */
export interface DeclarativeRewriteRule {
  readonly name: string;
  readonly opcode: LowLevelSonOpcode;
  readonly match: (node: LowLevelSonNode, context: RewriteContext) => boolean;
  readonly transform: (node: LowLevelSonNode, context: RewriteContext) => LowLevelSonNode | number | undefined;
}

/**
 * Helper to match two node inputs that are identical.
 */
function matchSelfInput(node: LowLevelSonNode, context: RewriteContext): boolean {
  if (node.valueInputs.length < 2) return false;
  const leftId = node.valueInputs[0];
  const rightId = node.valueInputs[1];
  if (leftId === undefined || leftId !== rightId) return false;
  return context.getNode(leftId) !== undefined;
}

/**
 * Helper checking if a node is a numeric constant.
 */
function isNumberConst(node?: LowLevelSonNode): boolean {
  return node?.opcode === 'val.const' && typeof node.constantValue === 'number';
}

/**
 * Helper to match two node inputs that are numeric constants.
 */
function matchNumericConstants(node: LowLevelSonNode, context: RewriteContext): boolean {
  return (
    isNumberConst(context.getNode(node.valueInputs[0] ?? -1)) &&
    isNumberConst(context.getNode(node.valueInputs[1] ?? -1))
  );
}

/**
 * Helper checking if a node is a number or bigint constant.
 */
function isNumericOrBigIntConst(node?: LowLevelSonNode): boolean {
  if (node?.opcode !== 'val.const') return false;
  const valueType = typeof node.constantValue;
  return valueType === 'number' || valueType === 'bigint';
}

/**
 * Helper to match two node inputs that are numbers or bigints.
 */
function matchNumericOrBigIntConstants(node: LowLevelSonNode, context: RewriteContext): boolean {
  return (
    isNumericOrBigIntConst(context.getNode(node.valueInputs[0] ?? -1)) &&
    isNumericOrBigIntConst(context.getNode(node.valueInputs[1] ?? -1))
  );
}

/**
 * Helper checking if a node is a zero constant.
 */
function isZeroConst(node?: LowLevelSonNode): boolean {
  return node?.opcode === 'val.const' && node.constantValue === 0;
}

/**
 * Helper matching multiplication by zero.
 */
function matchMulZero(node: LowLevelSonNode, context: RewriteContext): boolean {
  return (
    isZeroConst(context.getNode(node.valueInputs[1] ?? -1)) || isZeroConst(context.getNode(node.valueInputs[0] ?? -1))
  );
}

/**
 * Helper checking if division would overflow in 32-bit two's complement.
 */
function isOverflowDiv(left: unknown, right: unknown): boolean {
  return left === -2_147_483_648 && right === -1;
}

/**
 * Helper matching non-trapping division.
 */
// skipcq: JS-R1005
function matchDiv(node: LowLevelSonNode, context: RewriteContext): boolean {
  if (!matchNumericConstants(node, context)) return false;
  const left = context.getNode(node.valueInputs[0] ?? -1);
  const right = context.getNode(node.valueInputs[1] ?? -1);
  const rightValue = right?.constantValue;
  if (rightValue === 0) return false;
  return !isOverflowDiv(left?.constantValue, rightValue);
}

/**
 * Helper checking if a node is a constant node with a defined value.
 */
function isDefinedConst(node?: LowLevelSonNode): boolean {
  return node?.opcode === 'val.const' && node.constantValue !== undefined;
}

/**
 * Helper matching two constant inputs for equality comparison.
 */
// skipcq: JS-R1005
function matchCmpEq(node: LowLevelSonNode, context: RewriteContext): boolean {
  const left = context.getNode(node.valueInputs[0] ?? -1);
  const right = context.getNode(node.valueInputs[1] ?? -1);
  return isDefinedConst(left) && isDefinedConst(right);
}

/**
 * Helper checking if either operand is 64-bit.
 */
function is64BitNode(left?: LowLevelSonNode, right?: LowLevelSonNode, nodeType?: string): boolean {
  return (
    typeof left?.constantValue === 'bigint' ||
    typeof right?.constantValue === 'bigint' ||
    nodeType === 'i64' ||
    nodeType === 'u64'
  );
}

// skipcq: JS-R1005
function transformShl(node: LowLevelSonNode, context: RewriteContext): LowLevelSonNode {
  const left = context.getNode(node.valueInputs[0] ?? -1);
  const right = context.getNode(node.valueInputs[1] ?? -1);
  if (is64BitNode(left, right, node.type)) {
    const leftBig = BigInt(left?.constantValue ?? 0);
    const shiftMask64 = BigInt(Number(BigInt(right?.constantValue ?? 0) & 63n));
    return context.createConstantNode(BigInt.asIntN(64, leftBig << shiftMask64), node.type ?? 'i64');
  }
  const shiftMask32 = Number(right?.constantValue ?? 0) & 31;
  return context.createConstantNode(Math.trunc(Number(left?.constantValue ?? 0) << shiftMask32), node.type ?? 'i32');
}

// skipcq: JS-R1005
function transformShrU(node: LowLevelSonNode, context: RewriteContext): LowLevelSonNode {
  const left = context.getNode(node.valueInputs[0] ?? -1);
  const right = context.getNode(node.valueInputs[1] ?? -1);
  if (is64BitNode(left, right, node.type)) {
    const leftBig = BigInt(left?.constantValue ?? 0);
    const shiftMask64 = BigInt(Number(BigInt(right?.constantValue ?? 0) & 63n));
    return context.createConstantNode(
      BigInt.asUintN(64, BigInt.asUintN(64, leftBig) >> shiftMask64),
      node.type ?? 'u64',
    );
  }
  const shiftMask32 = Number(right?.constantValue ?? 0) & 31;
  return context.createConstantNode(Math.trunc(Number(left?.constantValue ?? 0) >>> shiftMask32), node.type ?? 'u32');
}

// skipcq: JS-R1005
function transformShrS(node: LowLevelSonNode, context: RewriteContext): LowLevelSonNode {
  const left = context.getNode(node.valueInputs[0] ?? -1);
  const right = context.getNode(node.valueInputs[1] ?? -1);
  if (is64BitNode(left, right, node.type)) {
    const leftBig = BigInt(left?.constantValue ?? 0);
    const shiftMask64 = BigInt(Number(BigInt(right?.constantValue ?? 0) & 63n));
    return context.createConstantNode(BigInt.asIntN(64, BigInt.asIntN(64, leftBig) >> shiftMask64), node.type ?? 'i64');
  }
  const shiftMask32 = Number(right?.constantValue ?? 0) & 31;
  return context.createConstantNode(Math.trunc(Number(left?.constantValue ?? 0) >> shiftMask32), node.type ?? 'i32');
}

// skipcq: JS-R1005
function transformCmpLtU(node: LowLevelSonNode, context: RewriteContext): LowLevelSonNode {
  const left = context.getNode(node.valueInputs[0] ?? -1);
  const right = context.getNode(node.valueInputs[1] ?? -1);
  if (is64BitNode(left, right, node.type)) {
    const leftBig = BigInt.asUintN(64, BigInt(left?.constantValue ?? 0));
    const rightBig = BigInt.asUintN(64, BigInt(right?.constantValue ?? 0));
    return context.createConstantNode(leftBig < rightBig ? 1 : 0, 'bool');
  }
  const leftNumber = Number(left?.constantValue ?? 0) >>> 0;
  const rightNumber = Number(right?.constantValue ?? 0) >>> 0;
  return context.createConstantNode(leftNumber < rightNumber ? 1 : 0, 'bool');
}

// skipcq: JS-R1005
function transformCmpLtS(node: LowLevelSonNode, context: RewriteContext): LowLevelSonNode {
  const left = context.getNode(node.valueInputs[0] ?? -1);
  const right = context.getNode(node.valueInputs[1] ?? -1);
  if (is64BitNode(left, right, node.type)) {
    const leftBig = BigInt.asIntN(64, BigInt(left?.constantValue ?? 0));
    const rightBig = BigInt.asIntN(64, BigInt(right?.constantValue ?? 0));
    return context.createConstantNode(leftBig < rightBig ? 1 : 0, 'bool');
  }
  const leftNumber = Math.trunc(Number(left?.constantValue ?? 0));
  const rightNumber = Math.trunc(Number(right?.constantValue ?? 0));
  return context.createConstantNode(leftNumber < rightNumber ? 1 : 0, 'bool');
}

/**
 * Built-in algebraic and constant-folding rewrite rules (TableGen / match.pd style).
 */
export const BUILTIN_REWRITE_RULES: readonly DeclarativeRewriteRule[] = [
  {
    name: 'algebraic.add.zero',
    opcode: 'val.add',
    match: (node, context) => {
      const right = context.getNode(node.valueInputs[1] ?? -1);
      return right?.opcode === 'val.const' && right.constantValue === 0;
    },
    transform: (node) => node.valueInputs[0],
  },
  {
    name: 'algebraic.mul.one',
    opcode: 'val.mul',
    match: (node, context) => {
      const right = context.getNode(node.valueInputs[1] ?? -1);
      return right?.opcode === 'val.const' && right.constantValue === 1;
    },
    transform: (node) => node.valueInputs[0],
  },
  {
    name: 'algebraic.mul.zero',
    opcode: 'val.mul',
    match: matchMulZero,
    transform: (node, context) => context.createConstantNode(0, node.type),
  },
  {
    name: 'algebraic.sub.self',
    opcode: 'val.sub',
    match: matchSelfInput,
    transform: (node, context) => context.createConstantNode(0, node.type),
  },
  {
    name: 'constant.fold.add',
    opcode: 'val.add',
    match: matchNumericConstants,
    transform: (node, context) => {
      const left = context.getNode(node.valueInputs[0] ?? -1);
      const right = context.getNode(node.valueInputs[1] ?? -1);
      const sum = Math.trunc(Number(left?.constantValue) + Number(right?.constantValue));
      return context.createConstantNode(sum, node.type);
    },
  },
  {
    name: 'constant.fold.sub',
    opcode: 'val.sub',
    match: matchNumericConstants,
    transform: (node, context) => {
      const left = context.getNode(node.valueInputs[0] ?? -1);
      const right = context.getNode(node.valueInputs[1] ?? -1);
      const diff = Math.trunc(Number(left?.constantValue) - Number(right?.constantValue));
      return context.createConstantNode(diff, node.type);
    },
  },
  {
    name: 'constant.fold.mul',
    opcode: 'val.mul',
    match: matchNumericConstants,
    transform: (node, context) => {
      const left = context.getNode(node.valueInputs[0] ?? -1);
      const right = context.getNode(node.valueInputs[1] ?? -1);
      const product = Math.trunc(Number(left?.constantValue) * Number(right?.constantValue));
      return context.createConstantNode(product, node.type);
    },
  },
  {
    name: 'constant.fold.div',
    opcode: 'val.div',
    match: matchDiv,
    transform: (node, context) => {
      const left = context.getNode(node.valueInputs[0] ?? -1);
      const right = context.getNode(node.valueInputs[1] ?? -1);
      const quotient = Math.trunc(Number(left?.constantValue) / Number(right?.constantValue));
      return context.createConstantNode(quotient, node.type);
    },
  },
  {
    name: 'constant.fold.shl',
    opcode: 'val.shl',
    match: matchNumericOrBigIntConstants,
    transform: transformShl,
  },
  {
    name: 'constant.fold.shr_u',
    opcode: 'val.shr_u',
    match: matchNumericOrBigIntConstants,
    transform: transformShrU,
  },
  {
    name: 'constant.fold.shr_s',
    opcode: 'val.shr_s',
    match: matchNumericOrBigIntConstants,
    transform: transformShrS,
  },
  {
    name: 'constant.fold.cmp_lt_u',
    opcode: 'val.cmp_lt_u',
    match: matchNumericOrBigIntConstants,
    transform: transformCmpLtU,
  },
  {
    name: 'constant.fold.cmp_lt_s',
    opcode: 'val.cmp_lt_s',
    match: matchNumericOrBigIntConstants,
    transform: transformCmpLtS,
  },
  {
    name: 'constant.fold.cmp_eq',
    opcode: 'val.cmp_eq',
    match: matchCmpEq,
    transform: (node, context) => {
      const left = context.getNode(node.valueInputs[0] ?? -1);
      const right = context.getNode(node.valueInputs[1] ?? -1);
      return context.createConstantNode(left?.constantValue === right?.constantValue ? 1 : 0, 'bool');
    },
  },
  {
    name: 'simd.and.self',
    opcode: 'val.simd.and',
    match: matchSelfInput,
    transform: (node) => node.valueInputs[0],
  },
  {
    name: 'simd.or.self',
    opcode: 'val.simd.or',
    match: matchSelfInput,
    transform: (node) => node.valueInputs[0],
  },
  {
    name: 'simd.xor.self',
    opcode: 'val.simd.xor',
    match: matchSelfInput,
    transform: (node, context) => context.createConstantNode(0, node.type ?? 'v128'),
  },
];

/**
 * Executes rewrite passes over a list of Low-Level SonIR nodes until fixed-point or iteration limit.
 */
// skipcq: JS-R1005
export function applyDeclarativeRewrites(
  nodes: readonly LowLevelSonNode[],
  rules: readonly DeclarativeRewriteRule[] = BUILTIN_REWRITE_RULES,
  maxIterations = 10,
): { readonly nodes: readonly LowLevelSonNode[]; readonly appliedRules: readonly string[] } {
  const nodeMap = new Map<number, LowLevelSonNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  let nextId = Math.max(0, ...nodes.map((n) => n.id)) + 1;
  const applied: string[] = [];
  const replacements = new Map<number, number>();

  /**
   * Resolves the transitive rewrite target identifier for a given node id.
   */
  const resolveTarget = (id: number): number => {
    let current = id;
    while (replacements.has(current)) {
      current = replacements.get(current) ?? current;
    }
    return current;
  };

  const context: RewriteContext = {
    getNode: (id) => nodeMap.get(resolveTarget(id)),
    createConstantNode: (value, type = 'i32') => {
      const id = nextId++;
      const node: LowLevelSonNode = {
        id,
        opcode: 'val.const',
        type,
        constantValue: value,
        valueInputs: [],
        memoryInputs: [],
        controlInputs: [],
        span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      };
      nodeMap.set(id, node);
      return node;
    },
  };

  const rulesByOpcode = new Map<LowLevelSonOpcode, DeclarativeRewriteRule[]>();
  for (const rule of rules) {
    const list = rulesByOpcode.get(rule.opcode) ?? [];
    list.push(rule);
    rulesByOpcode.set(rule.opcode, list);
  }

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;

    for (const [id, node] of nodeMap.entries()) {
      if (replacements.has(id)) continue;
      const matchingRules = rulesByOpcode.get(node.opcode) ?? [];
      for (const rule of matchingRules) {
        if (rule.match(node, context)) {
          const result = rule.transform(node, context);
          if (result !== undefined) {
            const targetId = typeof result === 'number' ? result : result.id;
            replacements.set(id, targetId);
            applied.push(rule.name);
            changed = true;
            break;
          }
        }
      }
    }

    if (!changed) break;
  }

  const finalNodes: LowLevelSonNode[] = [];
  for (const [id, node] of nodeMap.entries()) {
    if (replacements.has(id)) continue;
    finalNodes.push({
      ...node,
      valueInputs: node.valueInputs.map((input) => resolveTarget(input)),
      memoryInputs: node.memoryInputs.map((input) => resolveTarget(input)),
      controlInputs: node.controlInputs.map((input) => resolveTarget(input)),
    });
  }

  return {
    nodes: finalNodes,
    appliedRules: applied,
  };
}
