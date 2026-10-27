import type {
  FlintBinaryOperator,
  FlintModule,
  FlintPattern,
  FlintSourceSpan,
} from "@mission-platform/flint-ast";

import {
  lowerFlintToIr,
  type FlintIrExpression,
  type FlintIrFunction,
  type FlintIrModule,
  type FlintIrStatement,
} from "../ir.js";

import type { HighLevelSonModule } from "../high-level/dialect.js";

/**
 * Low-Level SonIR opcodes representing scalar operations, control branches, and Memory SSA effects.
 */
export type LowLevelSonOpcode =
  | "mem.phi"
  | "mem.load"
  | "mem.store"
  | "mem.alloc"
  | "mem.free"
  | "ref.retain"
  | "ref.release"
  | "val.const"
  | "val.add"
  | "val.sub"
  | "val.mul"
  | "val.div"
  | "val.and"
  | "val.or"
  | "val.xor"
  | "val.shl"
  | "val.shr_u"
  | "val.shr_s"
  | "val.cmp_eq"
  | "val.cmp_ne"
  | "val.cmp_lt_u"
  | "val.cmp_lt_s"
  | "val.cmp_gt_u"
  | "val.cmp_gt_s"
  | "val.cmp_le_u"
  | "val.cmp_le_s"
  | "val.cmp_ge_u"
  | "val.cmp_ge_s"
  | "val.select"
  | "val.call"
  | "val.phi"
  | "val.simd.and"
  | "val.simd.or"
  | "val.simd.xor"
  | "ctrl.start"
  | "ctrl.branch"
  | "ctrl.jump"
  | "ctrl.suspend"
  | "ctrl.barrier"
  | "ctrl.return"
  | "mmio.read"
  | "mmio.write";

/**
 * Memory domain identifier (0 = guest private heap, 1 = host interop channel).
 */
export type MemoryDomain = 0 | 1;

/**
 * Explicit Memory SSA token tracking dependencies between memory-mutating operations.
 */
export interface MemorySsaToken {
  readonly version: number;
  readonly producerNodeId: number;
  readonly domain?: MemoryDomain;
}

/**
 * Node in the Low-Level Memory SSA SonIR graph.
 */
export interface LowLevelSonNode {
  readonly id: number;
  readonly opcode: LowLevelSonOpcode;
  readonly type?: string;
  readonly memoryDomain?: MemoryDomain;
  readonly valueInputs: readonly number[];
  readonly memoryInputs: readonly number[];
  readonly controlInputs: readonly number[];
  readonly constantValue?: number | boolean | string | bigint;
  readonly span: FlintSourceSpan;
}

/**
 * Low-Level SonIR Module graph.
 */
export interface LowLevelSonModule {
  readonly name: string;
  readonly nodes: readonly LowLevelSonNode[];
  readonly entryControlId: number;
  readonly initialMemoryToken: MemorySsaToken;
}

/**
 * Creates an initial Low-Level SonIR module graph with entry control and base memory token.
 */
export function createLowLevelSonModule(name: string): LowLevelSonModule {
  const dummySpan: FlintSourceSpan = {
    start: 0,
    end: 0,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1,
  };

  const startNode: LowLevelSonNode = {
    id: 1,
    opcode: "ctrl.start",
    valueInputs: [],
    memoryInputs: [],
    controlInputs: [],
    span: dummySpan,
  };

  return {
    name,
    nodes: [startNode],
    entryControlId: 1,
    initialMemoryToken: { version: 0, producerNodeId: 1 },
  };
}

/**
 * Lowers a High-Level SonIR module into a Low-Level SonIR module with explicit Memory SSA tokens and control barriers.
 *
 * @param highLevelModule - Source HighLevelSonModule to lower.
 * @returns LowLevelSonModule with scalar opcodes and explicit Memory SSA tokens.
 */
export function lowerHighLevelSonToLowLevelSon(
  highLevelModule: HighLevelSonModule,
): LowLevelSonModule {
  const dummySpan: FlintSourceSpan = {
    start: 0,
    end: 0,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1,
  };

  const startNode: LowLevelSonNode = {
    id: 1,
    opcode: "ctrl.start",
    valueInputs: [],
    memoryInputs: [],
    controlInputs: [],
    span: highLevelModule.nodes[0]?.span ?? dummySpan,
  };

  const nodes: LowLevelSonNode[] = [startNode];
  let nextNodeId = 2;
  let currentControlId = 1;
  let currentMemoryId = 1;

  const highToLowMap = new Map<number, number>();

  for (const highNode of highLevelModule.nodes) {
    const mappedInputs = highNode.inputs.map(
      (inputId) => highToLowMap.get(inputId) ?? inputId,
    );

    switch (highNode.opcode) {
      case "struct.construct":
      case "region.alloc":
      case "region.arena.create": {
        const allocId = nextNodeId++;
        const node: LowLevelSonNode = {
          id: allocId,
          opcode: "mem.alloc",
          type: highNode.type ?? "ptr",
          valueInputs: mappedInputs,
          memoryInputs: [currentMemoryId],
          controlInputs: [currentControlId],
          span: highNode.span,
        };
        nodes.push(node);
        currentMemoryId = allocId;
        highToLowMap.set(highNode.id, allocId);
        break;
      }
      case "region.arena.destroy": {
        const freeId = nextNodeId++;
        const node: LowLevelSonNode = {
          id: freeId,
          opcode: "mem.free",
          type: "unit",
          valueInputs: mappedInputs,
          memoryInputs: [currentMemoryId],
          controlInputs: [currentControlId],
          span: highNode.span,
        };
        nodes.push(node);
        currentMemoryId = freeId;
        highToLowMap.set(highNode.id, freeId);
        break;
      }
      case "struct.extract": {
        const loadId = nextNodeId++;
        const node: LowLevelSonNode = {
          id: loadId,
          opcode: "mem.load",
          type: highNode.type ?? "i32",
          valueInputs: mappedInputs,
          memoryInputs: [currentMemoryId],
          controlInputs: [currentControlId],
          span: highNode.span,
        };
        nodes.push(node);
        highToLowMap.set(highNode.id, loadId);
        break;
      }
      case "affine.borrow": {
        const retainId = nextNodeId++;
        const node: LowLevelSonNode = {
          id: retainId,
          opcode: "ref.retain",
          type: highNode.type ?? "ptr",
          valueInputs: mappedInputs,
          memoryInputs: [],
          controlInputs: [currentControlId],
          span: highNode.span,
        };
        nodes.push(node);
        highToLowMap.set(highNode.id, retainId);
        break;
      }
      case "affine.transfer": {
        const releaseId = nextNodeId++;
        const node: LowLevelSonNode = {
          id: releaseId,
          opcode: "ref.release",
          type: highNode.type ?? "ptr",
          valueInputs: mappedInputs,
          memoryInputs: [],
          controlInputs: [currentControlId],
          span: highNode.span,
        };
        nodes.push(node);
        highToLowMap.set(highNode.id, releaseId);
        break;
      }
      case "collection.iter.create": {
        const iterCallId = nextNodeId++;
        const node: LowLevelSonNode = {
          id: iterCallId,
          opcode: "val.call",
          type: "ptr",
          valueInputs: mappedInputs,
          memoryInputs: [currentMemoryId],
          controlInputs: [currentControlId],
          constantValue: "__flint_iter_create",
          span: highNode.span,
        };
        nodes.push(node);
        currentMemoryId = iterCallId;
        highToLowMap.set(highNode.id, iterCallId);
        break;
      }
      case "collection.iter.next": {
        const iterNextId = nextNodeId++;
        const node: LowLevelSonNode = {
          id: iterNextId,
          opcode: "val.call",
          type: "i32",
          valueInputs: mappedInputs,
          memoryInputs: [currentMemoryId],
          controlInputs: [currentControlId],
          constantValue: "__flint_iter_next",
          span: highNode.span,
        };
        nodes.push(node);
        currentMemoryId = iterNextId;
        highToLowMap.set(highNode.id, iterNextId);
        break;
      }
      case "affine.scope.begin":
      case "affine.scope.end": {
        const barrierId = nextNodeId++;
        const node: LowLevelSonNode = {
          id: barrierId,
          opcode: "ctrl.barrier",
          valueInputs: mappedInputs,
          memoryInputs: [currentMemoryId],
          controlInputs: [currentControlId],
          span: highNode.span,
        };
        nodes.push(node);
        currentControlId = barrierId;
        highToLowMap.set(highNode.id, barrierId);
        break;
      }
      default:
        break;
    }
  }

  return {
    name: highLevelModule.name,
    nodes,
    entryControlId: 1,
    initialMemoryToken: { version: 0, producerNodeId: 1 },
  };
}

/**
 * Maps Flint binary operators to their corresponding LowLevelSonOpcode.
 */
function binaryOpcode(operator: FlintBinaryOperator): LowLevelSonOpcode {
  switch (operator) {
    case "+":
      return "val.add";
    case "-":
      return "val.sub";
    case "*":
      return "val.mul";
    case "/":
      return "val.div";
    case "%":
      return "val.div";
    case "&&":
      return "val.and";
    case "||":
      return "val.or";
    case "==":
      return "val.cmp_eq";
    case "!=":
      return "val.cmp_ne";
    case "<":
      return "val.cmp_lt_s";
    case "<=":
      return "val.cmp_le_s";
    case ">":
      return "val.cmp_gt_s";
    case ">=":
      return "val.cmp_ge_s";
    default:
      return "val.add";
  }
}

/**
 * Builder class for extracting a LowLevelSonModule with explicit Memory SSA from FlintIrModule.
 */
class LowLevelSonExtractor {
  private readonly module: FlintIrModule;
  private nextNodeId = 2;
  private currentControlId = 1;
  private currentMemoryId = 1;
  private readonly nodes: LowLevelSonNode[] = [];
  private readonly scope = new Map<string, number>();

  constructor(module: FlintIrModule) {
    this.module = module;
    const dummySpan: FlintSourceSpan = module.span ?? {
      start: 0,
      end: 0,
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 1,
    };

    this.nodes.push({
      id: 1,
      opcode: "ctrl.start",
      valueInputs: [],
      memoryInputs: [],
      controlInputs: [],
      span: dummySpan,
    });
  }

  public extract(): LowLevelSonModule {
    for (const func of this.module.functions) {
      this.extractFunction(func);
    }

    return {
      name: this.module.name,
      nodes: this.nodes,
      entryControlId: 1,
      initialMemoryToken: { version: 0, producerNodeId: 1 },
    };
  }

  private extractFunction(func: FlintIrFunction): void {
    for (let i = 0; i < func.parameters.length; i++) {
      const param = func.parameters[i];
      if (!param) continue;
      const paramNodeId = this.addNode({
        opcode: "val.const",
        type: "i32",
        constantValue: param.name,
        valueInputs: [],
        memoryInputs: [],
        controlInputs: [this.currentControlId],
        span: param.span,
      });
      this.scope.set(param.name, paramNodeId);
    }

    this.extractStatements(func.body);
  }

  private extractStatements(statements: readonly FlintIrStatement[]): void {
    for (const stmt of statements) {
      this.extractStatement(stmt);
    }
  }

  private extractPatternCondition(
    valueId: number | undefined,
    pattern: FlintPattern,
  ): number {
    switch (pattern.kind) {
      case "wildcard":
        return this.addNode({
          opcode: "val.const",
          type: "bool",
          constantValue: true,
          valueInputs: [],
          memoryInputs: [],
          controlInputs: [this.currentControlId],
          span: pattern.span,
        });
      case "literal": {
        const literalId = this.addNode({
          opcode: "val.const",
          type:
            typeof pattern.value === "number" ? "i32" : typeof pattern.value,
          constantValue: pattern.value,
          valueInputs: [],
          memoryInputs: [],
          controlInputs: [this.currentControlId],
          span: pattern.span,
        });
        return this.addNode({
          opcode: "val.cmp_eq",
          type: "bool",
          valueInputs: [valueId, literalId].filter(
            (id): id is number => id !== undefined,
          ),
          memoryInputs: [],
          controlInputs: [this.currentControlId],
          span: pattern.span,
        });
      }
      case "variant":
        return this.addNode({
          opcode: "val.call",
          type: "bool",
          constantValue: `__flint_match_variant:${pattern.name}`,
          valueInputs: valueId !== undefined ? [valueId] : [],
          memoryInputs: [this.currentMemoryId],
          controlInputs: [this.currentControlId],
          span: pattern.span,
        });
    }
  }

  private extractStatement(stmt: FlintIrStatement): void {
    switch (stmt.kind) {
      case "let": {
        const valueId = this.extractExpression(stmt.value);
        if (valueId !== undefined) {
          this.scope.set(stmt.name, valueId);
        }
        break;
      }
      case "assignment": {
        const valId = this.extractExpression(stmt.value);
        if (stmt.index !== undefined) {
          const idxId = this.extractExpression(stmt.index);
          const targetId = this.scope.get(stmt.name);
          const valueInputs = [targetId, idxId, valId].filter(
            (id): id is number => id !== undefined,
          );
          const storeId = this.addNode({
            opcode: "mem.store",
            type: "unit",
            valueInputs,
            memoryInputs: [this.currentMemoryId],
            controlInputs: [this.currentControlId],
            span: stmt.span,
          });
          this.currentMemoryId = storeId;
        } else if (valId !== undefined) {
          this.scope.set(stmt.name, valId);
        }
        break;
      }
      case "expression-statement": {
        this.extractExpression(stmt.expression);
        break;
      }
      case "return": {
        const valId =
          stmt.value !== undefined
            ? this.extractExpression(stmt.value)
            : undefined;
        this.addNode({
          opcode: "ctrl.return",
          type: "unit",
          valueInputs: valId !== undefined ? [valId] : [],
          memoryInputs: [this.currentMemoryId],
          controlInputs: [this.currentControlId],
          span: stmt.span,
        });
        break;
      }
      case "yield": {
        const valId = this.extractExpression(stmt.value);
        const suspendId = this.addNode({
          opcode: "ctrl.suspend",
          type: "unit",
          valueInputs: valId !== undefined ? [valId] : [],
          memoryInputs: [this.currentMemoryId],
          controlInputs: [this.currentControlId],
          span: stmt.span,
        });
        this.currentControlId = suspendId;
        break;
      }
      case "if": {
        const condId = this.extractExpression(stmt.condition);
        const branchId = this.addNode({
          opcode: "ctrl.branch",
          type: "control",
          valueInputs: condId !== undefined ? [condId] : [],
          memoryInputs: [this.currentMemoryId],
          controlInputs: [this.currentControlId],
          span: stmt.span,
        });
        this.currentControlId = branchId;

        this.extractStatements(stmt.consequent);

        if (stmt.alternate && stmt.alternate.length > 0) {
          this.extractStatements(stmt.alternate);
        }
        break;
      }
      case "while":
      case "do-while": {
        const condId = this.extractExpression(stmt.condition);
        const branchId = this.addNode({
          opcode: "ctrl.branch",
          type: "control",
          valueInputs: condId !== undefined ? [condId] : [],
          memoryInputs: [this.currentMemoryId],
          controlInputs: [this.currentControlId],
          span: stmt.span,
        });
        this.currentControlId = branchId;
        this.extractStatements(stmt.body);
        const jumpId = this.addNode({
          opcode: "ctrl.jump",
          type: "control",
          valueInputs: [],
          memoryInputs: [this.currentMemoryId],
          controlInputs: [this.currentControlId],
          span: stmt.span,
        });
        this.currentControlId = jumpId;
        break;
      }
      case "iterator-loop": {
        const iterId = this.extractExpression(stmt.iterator);
        const iterCallId = this.addNode({
          opcode: "val.call",
          type: "ptr",
          constantValue: "__flint_iter_create",
          valueInputs: iterId !== undefined ? [iterId] : [],
          memoryInputs: [this.currentMemoryId],
          controlInputs: [this.currentControlId],
          span: stmt.span,
        });
        this.currentMemoryId = iterCallId;

        const nextCallId = this.addNode({
          opcode: "val.call",
          type: "i32",
          constantValue: "__flint_iter_next",
          valueInputs: [iterCallId],
          memoryInputs: [this.currentMemoryId],
          controlInputs: [this.currentControlId],
          span: stmt.suspensionSpan ?? stmt.span,
        });
        this.currentMemoryId = nextCallId;
        this.scope.set(stmt.binding, nextCallId);

        this.extractStatements(stmt.body);
        break;
      }
      case "match-statement": {
        const valId = this.extractExpression(stmt.value);
        for (const arm of stmt.arms) {
          const conditionId = this.extractPatternCondition(valId, arm.pattern);
          const branchId = this.addNode({
            opcode: "ctrl.branch",
            type: "control",
            valueInputs: [conditionId],
            memoryInputs: [this.currentMemoryId],
            controlInputs: [this.currentControlId],
            span: arm.span,
          });
          this.currentControlId = branchId;
          const armValId = this.extractExpression(arm.value);
          if (armValId !== undefined) {
            this.currentMemoryId = armValId;
          }
          if (arm.pattern.kind === "wildcard") break;
        }
        break;
      }
      case "switch": {
        const valId = this.extractExpression(stmt.value);
        for (const switchCase of stmt.cases) {
          const caseConstId = this.addNode({
            opcode: "val.const",
            type: typeof switchCase.value === "number" ? "i32" : "string",
            constantValue: switchCase.value,
            valueInputs: [],
            memoryInputs: [],
            controlInputs: [],
            span: switchCase.span,
          });
          const cmpId = this.addNode({
            opcode: "val.cmp_eq",
            type: "bool",
            valueInputs: [valId, caseConstId].filter(
              (id): id is number => id !== undefined,
            ),
            memoryInputs: [],
            controlInputs: [],
            span: switchCase.span,
          });
          const branchId = this.addNode({
            opcode: "ctrl.branch",
            type: "control",
            valueInputs: [cmpId],
            memoryInputs: [this.currentMemoryId],
            controlInputs: [this.currentControlId],
            span: switchCase.span,
          });
          this.currentControlId = branchId;
          this.extractStatements(switchCase.body);
        }
        if (stmt.defaultCase && stmt.defaultCase.length > 0) {
          this.extractStatements(stmt.defaultCase);
        }
        break;
      }
      default:
        break;
    }
  }

  private extractExpression(expr: FlintIrExpression): number | undefined {
    switch (expr.kind) {
      case "literal": {
        return this.addNode({
          opcode: "val.const",
          type: expr.type,
          constantValue: expr.value,
          valueInputs: [],
          memoryInputs: [],
          controlInputs: [this.currentControlId],
          span: expr.span,
        });
      }
      case "identifier": {
        return this.scope.get(expr.name);
      }
      case "binary": {
        const leftId = this.extractExpression(expr.left);
        const rightId = this.extractExpression(expr.right);
        const inputs = [leftId, rightId].filter(
          (id): id is number => id !== undefined,
        );
        return this.addNode({
          opcode: binaryOpcode(expr.operator),
          type: "i32",
          valueInputs: inputs,
          memoryInputs: [],
          controlInputs: [this.currentControlId],
          span: expr.span,
        });
      }
      case "unary": {
        const operandId = this.extractExpression(expr.operand);
        if (expr.operator === "!") {
          const zeroConst = this.addNode({
            opcode: "val.const",
            type: "i32",
            constantValue: 0,
            valueInputs: [],
            memoryInputs: [],
            controlInputs: [this.currentControlId],
            span: expr.span,
          });
          return this.addNode({
            opcode: "val.cmp_eq",
            type: "bool",
            valueInputs:
              operandId !== undefined ? [operandId, zeroConst] : [zeroConst],
            memoryInputs: [],
            controlInputs: [this.currentControlId],
            span: expr.span,
          });
        }
        if (expr.operator === "-") {
          const zeroConst = this.addNode({
            opcode: "val.const",
            type: "i32",
            constantValue: 0,
            valueInputs: [],
            memoryInputs: [],
            controlInputs: [this.currentControlId],
            span: expr.span,
          });
          return this.addNode({
            opcode: "val.sub",
            type: "i32",
            valueInputs:
              operandId !== undefined ? [zeroConst, operandId] : [zeroConst],
            memoryInputs: [],
            controlInputs: [this.currentControlId],
            span: expr.span,
          });
        }
        if (expr.operator === "&" || expr.operator === "&mut") {
          return this.addNode({
            opcode: "ref.retain",
            type: "ptr",
            valueInputs: operandId !== undefined ? [operandId] : [],
            memoryInputs: [],
            controlInputs: [this.currentControlId],
            span: expr.span,
          });
        }
        if (expr.operator === "*") {
          return this.addNode({
            opcode: "mem.load",
            type: "i32",
            valueInputs: operandId !== undefined ? [operandId] : [],
            memoryInputs: [this.currentMemoryId],
            controlInputs: [this.currentControlId],
            span: expr.span,
          });
        }
        return operandId;
      }
      case "call": {
        const argIds: number[] = [];
        for (const arg of expr.arguments) {
          const id = this.extractExpression(arg);
          if (id !== undefined) argIds.push(id);
        }

        if (
          expr.standardLibrary === "memory-alloc" ||
          expr.callee === "malloc"
        ) {
          const allocId = this.addNode({
            opcode: "mem.alloc",
            type: "ptr",
            valueInputs: argIds,
            memoryInputs: [this.currentMemoryId],
            controlInputs: [this.currentControlId],
            span: expr.span,
          });
          this.currentMemoryId = allocId;
          return allocId;
        }

        if (
          expr.standardLibrary === "memory-dealloc" ||
          expr.callee === "free"
        ) {
          const freeId = this.addNode({
            opcode: "mem.free",
            type: "unit",
            valueInputs: argIds,
            memoryInputs: [this.currentMemoryId],
            controlInputs: [this.currentControlId],
            span: expr.span,
          });
          this.currentMemoryId = freeId;
          return freeId;
        }

        if (
          expr.standardLibrary === "memory-load-u32" ||
          expr.standardLibrary === "memory-load-u8" ||
          expr.standardLibrary === "memory-load-f64"
        ) {
          return this.addNode({
            opcode: "mem.load",
            type: "i32",
            valueInputs: argIds,
            memoryInputs: [this.currentMemoryId],
            controlInputs: [this.currentControlId],
            span: expr.span,
          });
        }

        if (
          expr.standardLibrary === "memory-store-u32" ||
          expr.standardLibrary === "memory-store-u8" ||
          expr.standardLibrary === "memory-store-f64"
        ) {
          const storeId = this.addNode({
            opcode: "mem.store",
            type: "unit",
            valueInputs: argIds,
            memoryInputs: [this.currentMemoryId],
            controlInputs: [this.currentControlId],
            span: expr.span,
          });
          this.currentMemoryId = storeId;
          return storeId;
        }

        return this.addNode({
          opcode: "val.call",
          type: "i32",
          constantValue: expr.callee,
          valueInputs: argIds,
          memoryInputs: [this.currentMemoryId],
          controlInputs: [this.currentControlId],
          span: expr.span,
        });
      }
      case "struct-value": {
        const fieldIds: number[] = [];
        for (const name of Object.keys(expr.fields)) {
          const fieldExpr = expr.fields[name];
          if (fieldExpr) {
            const id = this.extractExpression(fieldExpr);
            if (id !== undefined) fieldIds.push(id);
          }
        }
        const allocId = this.addNode({
          opcode: "mem.alloc",
          type: "ptr",
          valueInputs: fieldIds,
          memoryInputs: [this.currentMemoryId],
          controlInputs: [this.currentControlId],
          span: expr.span,
        });
        this.currentMemoryId = allocId;
        return allocId;
      }
      case "array-literal":
      case "vector-literal": {
        const elemIds: number[] = [];
        for (const elem of expr.elements) {
          const id = this.extractExpression(elem);
          if (id !== undefined) elemIds.push(id);
        }
        const allocId = this.addNode({
          opcode: "mem.alloc",
          type: "ptr",
          valueInputs: elemIds,
          memoryInputs: [this.currentMemoryId],
          controlInputs: [this.currentControlId],
          span: expr.span,
        });
        this.currentMemoryId = allocId;
        return allocId;
      }
      case "index": {
        const receiverId = this.extractExpression(expr.receiver);
        const indexId = this.extractExpression(expr.index);
        const inputs = [receiverId, indexId].filter(
          (id): id is number => id !== undefined,
        );
        return this.addNode({
          opcode: "mem.load",
          type: "i32",
          valueInputs: inputs,
          memoryInputs: [this.currentMemoryId],
          controlInputs: [this.currentControlId],
          span: expr.span,
        });
      }
      case "match": {
        const valId = this.extractExpression(expr.value);
        const baseControlId = this.currentControlId;
        const arms: Array<{
          readonly conditionId: number;
          readonly valueId: number;
          readonly isDefault: boolean;
        }> = [];
        for (const arm of expr.arms) {
          const conditionId = this.extractPatternCondition(valId, arm.pattern);
          const branchId = this.addNode({
            opcode: "ctrl.branch",
            type: "control",
            valueInputs: [conditionId],
            memoryInputs: [this.currentMemoryId],
            controlInputs: [this.currentControlId],
            span: arm.span,
          });
          this.currentControlId = branchId;
          const armValId = this.extractExpression(arm.value);
          if (armValId !== undefined) {
            arms.push({
              conditionId,
              valueId: armValId,
              isDefault: arm.pattern.kind === "wildcard",
            });
          }
          if (arm.pattern.kind === "wildcard") break;
        }
        if (arms.length === 0) {
          this.currentControlId = baseControlId;
          return undefined;
        }

        let selectedId = arms[arms.length - 1]?.valueId;
        if (selectedId === undefined) return undefined;
        for (let index = arms.length - 2; index >= 0; index -= 1) {
          const arm = arms[index];
          if (!arm || arm.isDefault) continue;
          selectedId = this.addNode({
            opcode: "val.select",
            type: "i32",
            valueInputs: [arm.conditionId, arm.valueId, selectedId],
            memoryInputs: [this.currentMemoryId],
            controlInputs: [baseControlId],
            span: expr.span,
          });
        }
        this.currentControlId = baseControlId;
        return selectedId;
      }
      default:
        return undefined;
    }
  }

  private addNode(node: Omit<LowLevelSonNode, "id">): number {
    const id = this.nextNodeId++;
    this.nodes.push({ id, ...node });
    return id;
  }
}

/**
 * Extracts a Low-Level SonIR module graph from a lowered Flint IR module.
 * Constructs explicit Memory SSA tokens, control branches, and scalar value operations.
 *
 * @param irModule - Lowered IR module to extract.
 * @returns LowLevelSonModule graph container.
 */
export function lowerFlintIrToLowLevelSon(
  irModule: FlintIrModule,
): LowLevelSonModule {
  const extractor = new LowLevelSonExtractor(irModule);
  return extractor.extract();
}

/**
 * Convenience alias for `lowerFlintIrToLowLevelSon`.
 */
export const lowerIrToLowLevelSon = lowerFlintIrToLowLevelSon;

/**
 * Lowers a raw Flint AST module into a Low-Level SonIR module graph.
 *
 * @param ast - Parsed FlintModule AST.
 * @returns LowLevelSonModule graph container.
 */
export function lowerFlintAstToLowLevelSon(
  ast: FlintModule,
): LowLevelSonModule {
  const ir = lowerFlintToIr(ast);
  return lowerFlintIrToLowLevelSon(ir);
}
