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
    match: (node, context) => {
      const right = context.getNode(node.valueInputs[1] ?? -1);
      const left = context.getNode(node.valueInputs[0] ?? -1);
      return (
        (right?.opcode === 'val.const' && right.constantValue === 0) ||
        (left?.opcode === 'val.const' && left.constantValue === 0)
      );
    },
    transform: (node, context) => context.createConstantNode(0, node.type),
  },
  {
    name: 'algebraic.sub.self',
    opcode: 'val.sub',
    match: (node) => node.valueInputs.length >= 2 && node.valueInputs[0] === node.valueInputs[1],
    transform: (node, context) => context.createConstantNode(0, node.type),
  },
  {
    name: 'constant.fold.add',
    opcode: 'val.add',
    match: (node, context) => {
      const left = context.getNode(node.valueInputs[0] ?? -1);
      const right = context.getNode(node.valueInputs[1] ?? -1);
      return (
        left?.opcode === 'val.const' &&
        typeof left.constantValue === 'number' &&
        right?.opcode === 'val.const' &&
        typeof right.constantValue === 'number'
      );
    },
    transform: (node, context) => {
      const left = context.getNode(node.valueInputs[0] ?? -1);
      const right = context.getNode(node.valueInputs[1] ?? -1);
      const sum = Math.trunc(Number(left?.constantValue) + Number(right?.constantValue));
      return context.createConstantNode(sum, node.type);
    },
  },
];

/**
 * Executes rewrite passes over a list of Low-Level SonIR nodes until fixed-point or iteration limit.
 */
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

  const context: RewriteContext = {
    getNode: (id) => nodeMap.get(id),
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

  const replacements = new Map<number, number>();

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;

    for (const [id, node] of nodeMap.entries()) {
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

  const resolveTarget = (id: number): number => {
    let current = id;
    while (replacements.has(current)) {
      current = replacements.get(current) ?? current;
    }
    return current;
  };

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
