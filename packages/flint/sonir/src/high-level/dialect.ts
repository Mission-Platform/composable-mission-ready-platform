import {
  flintTypeNameToString,
  type FlintModule,
  type FlintSourceSpan,
} from "@mission-platform/flint-ast";

import {
  lowerFlintToIr,
  type FlintIrExpression,
  type FlintIrFunction,
  type FlintIrModule,
  type FlintIrStatement,
} from "../ir.js";

/**
 * High-Level SonIR dialect operation kinds preserving affine semantics and regional scopes.
 */
export type HighLevelSonOpcode =
  | "affine.scope.begin"
  | "affine.scope.end"
  | "affine.borrow"
  | "affine.transfer"
  | "region.arena.create"
  | "region.arena.destroy"
  | "region.alloc"
  | "collection.iter.create"
  | "collection.iter.next"
  | "struct.construct"
  | "struct.extract";

/**
 * Node in the High-Level SonIR graph representation.
 */
export interface HighLevelSonNode {
  readonly id: number;
  readonly opcode: HighLevelSonOpcode;
  readonly type?: string;
  readonly inputs: readonly number[];
  readonly regionId: number;
  readonly ownershipMode?: "owned" | "borrowed" | "shared";
  readonly span: FlintSourceSpan;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Region representation within High-Level SonIR.
 */
export interface HighLevelSonRegion {
  readonly id: number;
  readonly parentRegionId?: number;
  readonly kind: "root" | "affine-scope" | "loop-region" | "function-body";
}

/**
 * High-Level SonIR Module graph container.
 */
export interface HighLevelSonModule {
  readonly name: string;
  readonly regions: readonly HighLevelSonRegion[];
  readonly nodes: readonly HighLevelSonNode[];
  readonly entryRegionId: number;
}

/**
 * Creates an empty High-Level SonIR module graph.
 */
export function createHighLevelSonModule(name: string): HighLevelSonModule {
  return {
    name,
    regions: [{ id: 1, kind: "root" }],
    nodes: [],
    entryRegionId: 1,
  };
}

/**
 * Builder class for extracting a HighLevelSonModule from a FlintIrModule.
 */
class HighLevelSonExtractor {
  private readonly module: FlintIrModule;
  private nextNodeId = 1;
  private nextRegionId = 2;
  private readonly regions: HighLevelSonRegion[] = [{ id: 1, kind: "root" }];
  private readonly nodes: HighLevelSonNode[] = [];
  private readonly variableNodeMap = new Map<string, number>();

  constructor(module: FlintIrModule) {
    this.module = module;
  }

  public extract(): HighLevelSonModule {
    let entryRegionId = 1;

    for (let index = 0; index < this.module.functions.length; index++) {
      const func = this.module.functions[index];
      if (!func) continue;
      const funcRegionId = this.nextRegionId++;
      this.regions.push({
        id: funcRegionId,
        parentRegionId: 1,
        kind: "function-body",
      });
      if (index === 0) {
        entryRegionId = funcRegionId;
      }

      this.extractFunction(func, funcRegionId);
    }

    return {
      name: this.module.name,
      regions: this.regions,
      nodes: this.nodes,
      entryRegionId,
    };
  }

  private extractFunction(func: FlintIrFunction, regionId: number): void {
    for (const param of func.parameters) {
      const typeStr = flintTypeNameToString(param.type);
      const isBorrowed = typeStr.startsWith("&");
      const paramNodeId = this.addNode({
        opcode: isBorrowed ? "affine.borrow" : "affine.transfer",
        type: typeStr,
        inputs: [],
        regionId,
        ownershipMode: isBorrowed ? "borrowed" : "owned",
        span: param.span,
        metadata: { parameterName: param.name },
      });
      this.variableNodeMap.set(param.name, paramNodeId);
    }

    this.extractStatements(func.body, regionId);
  }

  private extractStatements(
    statements: readonly FlintIrStatement[],
    regionId: number,
  ): void {
    for (const stmt of statements) {
      this.extractStatement(stmt, regionId);
    }
  }

  private extractStatement(stmt: FlintIrStatement, regionId: number): void {
    switch (stmt.kind) {
      case "let": {
        const valueId = this.extractExpression(stmt.value, regionId);
        const typeStr = flintTypeNameToString(stmt.type);
        const isBorrowed = typeStr.startsWith("&");

        const letNodeId =
          valueId ??
          this.addNode({
            opcode: isBorrowed ? "affine.borrow" : "affine.transfer",
            type: typeStr,
            inputs: [],
            regionId,
            ownershipMode: isBorrowed ? "borrowed" : "owned",
            span: stmt.span,
            metadata: { binding: stmt.name },
          });
        this.variableNodeMap.set(stmt.name, letNodeId);
        break;
      }
      case "assignment": {
        const valId = this.extractExpression(stmt.value, regionId);
        if (stmt.index !== undefined) {
          const idxId = this.extractExpression(stmt.index, regionId);
          const targetId = this.variableNodeMap.get(stmt.name);
          const inputs = [targetId, idxId, valId].filter(
            (id): id is number => id !== undefined,
          );
          this.addNode({
            opcode: "struct.extract",
            inputs,
            regionId,
            span: stmt.span,
            metadata: { target: stmt.name },
          });
        } else if (valId !== undefined) {
          this.variableNodeMap.set(stmt.name, valId);
        }
        break;
      }
      case "expression-statement": {
        this.extractExpression(stmt.expression, regionId);
        break;
      }
      case "iterator-loop": {
        const loopRegionId = this.nextRegionId++;
        this.regions.push({
          id: loopRegionId,
          parentRegionId: regionId,
          kind: "loop-region",
        });

        const iterExprId = this.extractExpression(stmt.iterator, regionId);
        const iterNodeId = this.addNode({
          opcode: "collection.iter.create",
          inputs: iterExprId !== undefined ? [iterExprId] : [],
          regionId: loopRegionId,
          span: stmt.span,
        });

        this.addNode({
          opcode: "affine.scope.begin",
          inputs: [iterNodeId],
          regionId: loopRegionId,
          span: stmt.span,
        });

        const nextNodeId = this.addNode({
          opcode: "collection.iter.next",
          inputs: [iterNodeId],
          regionId: loopRegionId,
          ownershipMode: "borrowed",
          span: stmt.suspensionSpan ?? stmt.span,
          metadata: { binding: stmt.binding },
        });
        this.variableNodeMap.set(stmt.binding, nextNodeId);

        this.extractStatements(stmt.body, loopRegionId);

        this.addNode({
          opcode: "affine.scope.end",
          inputs: [nextNodeId],
          regionId: loopRegionId,
          span: stmt.span,
        });
        break;
      }
      case "if": {
        this.extractExpression(stmt.condition, regionId);

        const thenRegionId = this.nextRegionId++;
        this.regions.push({
          id: thenRegionId,
          parentRegionId: regionId,
          kind: "affine-scope",
        });

        this.addNode({
          opcode: "affine.scope.begin",
          inputs: [],
          regionId: thenRegionId,
          span: stmt.span,
        });
        this.extractStatements(stmt.consequent, thenRegionId);
        this.addNode({
          opcode: "affine.scope.end",
          inputs: [],
          regionId: thenRegionId,
          span: stmt.span,
        });

        if (stmt.alternate && stmt.alternate.length > 0) {
          const elseRegionId = this.nextRegionId++;
          this.regions.push({
            id: elseRegionId,
            parentRegionId: regionId,
            kind: "affine-scope",
          });

          this.addNode({
            opcode: "affine.scope.begin",
            inputs: [],
            regionId: elseRegionId,
            span: stmt.span,
          });
          this.extractStatements(stmt.alternate, elseRegionId);
          this.addNode({
            opcode: "affine.scope.end",
            inputs: [],
            regionId: elseRegionId,
            span: stmt.span,
          });
        }
        break;
      }
      case "while":
      case "do-while": {
        this.extractExpression(stmt.condition, regionId);

        const loopRegionId = this.nextRegionId++;
        this.regions.push({
          id: loopRegionId,
          parentRegionId: regionId,
          kind: "loop-region",
        });

        this.addNode({
          opcode: "affine.scope.begin",
          inputs: [],
          regionId: loopRegionId,
          span: stmt.span,
        });
        this.extractStatements(stmt.body, loopRegionId);
        this.addNode({
          opcode: "affine.scope.end",
          inputs: [],
          regionId: loopRegionId,
          span: stmt.span,
        });
        break;
      }
      case "switch": {
        this.extractExpression(stmt.value, regionId);
        for (const c of stmt.cases) {
          const caseRegionId = this.nextRegionId++;
          this.regions.push({
            id: caseRegionId,
            parentRegionId: regionId,
            kind: "affine-scope",
          });
          this.addNode({
            opcode: "affine.scope.begin",
            inputs: [],
            regionId: caseRegionId,
            span: c.span,
          });
          this.extractStatements(c.body, caseRegionId);
          this.addNode({
            opcode: "affine.scope.end",
            inputs: [],
            regionId: caseRegionId,
            span: c.span,
          });
        }
        if (stmt.defaultCase && stmt.defaultCase.length > 0) {
          const defaultRegionId = this.nextRegionId++;
          this.regions.push({
            id: defaultRegionId,
            parentRegionId: regionId,
            kind: "affine-scope",
          });
          this.addNode({
            opcode: "affine.scope.begin",
            inputs: [],
            regionId: defaultRegionId,
            span: stmt.span,
          });
          this.extractStatements(stmt.defaultCase, defaultRegionId);
          this.addNode({
            opcode: "affine.scope.end",
            inputs: [],
            regionId: defaultRegionId,
            span: stmt.span,
          });
        }
        break;
      }
      case "return":
      case "yield": {
        if (stmt.value !== undefined) {
          this.extractExpression(stmt.value, regionId);
        }
        break;
      }
      default:
        break;
    }
  }

  private extractExpression(
    expr: FlintIrExpression,
    regionId: number,
  ): number | undefined {
    switch (expr.kind) {
      case "struct-value": {
        const fieldIds: number[] = [];
        const fieldNames = Object.keys(expr.fields);
        for (const name of fieldNames) {
          const fieldExpr = expr.fields[name];
          if (fieldExpr) {
            const id = this.extractExpression(fieldExpr, regionId);
            if (id !== undefined) fieldIds.push(id);
          }
        }
        return this.addNode({
          opcode: "struct.construct",
          type: flintTypeNameToString(expr.type),
          inputs: fieldIds,
          regionId,
          ownershipMode: "owned",
          span: expr.span,
          metadata: { fields: fieldNames },
        });
      }
      case "array-literal":
      case "vector-literal": {
        const elemIds: number[] = [];
        for (const elem of expr.elements) {
          const id = this.extractExpression(elem, regionId);
          if (id !== undefined) elemIds.push(id);
        }
        return this.addNode({
          opcode: "region.alloc",
          type: flintTypeNameToString(expr.type),
          inputs: elemIds,
          regionId,
          ownershipMode: "owned",
          span: expr.span,
          metadata: { kind: expr.kind, count: expr.elements.length },
        });
      }
      case "index": {
        const receiverId = this.extractExpression(expr.receiver, regionId);
        const indexId = this.extractExpression(expr.index, regionId);
        const inputs = [receiverId, indexId].filter(
          (id): id is number => id !== undefined,
        );
        return this.addNode({
          opcode: "struct.extract",
          inputs,
          regionId,
          span: expr.span,
        });
      }
      case "unary": {
        const operandId = this.extractExpression(expr.operand, regionId);
        if (expr.operator === "&" || expr.operator === "&mut") {
          return this.addNode({
            opcode: "affine.borrow",
            inputs: operandId !== undefined ? [operandId] : [],
            regionId,
            ownershipMode: "borrowed",
            span: expr.span,
            metadata: { mutable: expr.operator === "&mut" },
          });
        }
        return operandId;
      }
      case "call": {
        const argIds: number[] = [];
        for (const arg of expr.arguments) {
          const id = this.extractExpression(arg, regionId);
          if (id !== undefined) argIds.push(id);
        }

        if (
          expr.standardLibrary === "array-iter" ||
          expr.callee.endsWith(".iter")
        ) {
          return this.addNode({
            opcode: "collection.iter.create",
            inputs: argIds,
            regionId,
            span: expr.span,
          });
        }
        if (
          expr.standardLibrary === "iterator-next" ||
          expr.callee.endsWith(".next")
        ) {
          return this.addNode({
            opcode: "collection.iter.next",
            inputs: argIds,
            regionId,
            span: expr.span,
          });
        }
        if (
          expr.standardLibrary === "memory-alloc" ||
          expr.callee === "malloc"
        ) {
          return this.addNode({
            opcode: "region.alloc",
            inputs: argIds,
            regionId,
            ownershipMode: "owned",
            span: expr.span,
          });
        }
        if (
          expr.standardLibrary === "memory-dealloc" ||
          expr.callee === "free"
        ) {
          return this.addNode({
            opcode: "region.arena.destroy",
            inputs: argIds,
            regionId,
            span: expr.span,
          });
        }
        return undefined;
      }
      case "identifier": {
        return this.variableNodeMap.get(expr.name);
      }
      case "binary": {
        this.extractExpression(expr.left, regionId);
        this.extractExpression(expr.right, regionId);
        return undefined;
      }
      case "match": {
        this.extractExpression(expr.value, regionId);
        for (const arm of expr.arms) {
          this.extractExpression(arm.value, regionId);
        }
        return undefined;
      }
      default:
        return undefined;
    }
  }

  private addNode(node: Omit<HighLevelSonNode, "id">): number {
    const id = this.nextNodeId++;
    this.nodes.push({ id, ...node });
    return id;
  }
}

/**
 * Extracts a High-Level SonIR module graph from a lowered Flint IR module.
 * Preserves affine regions, iterator boundaries, and high-level allocation semantics.
 *
 * @param module - Lowered IR module to extract.
 * @returns HighLevelSonModule graph container.
 */
export function lowerFlintIrToHighLevelSon(
  module: FlintIrModule,
): HighLevelSonModule {
  const extractor = new HighLevelSonExtractor(module);
  return extractor.extract();
}

/**
 * Convenience alias for `lowerFlintIrToHighLevelSon`.
 */
export const lowerIrToHighLevelSon = lowerFlintIrToHighLevelSon;

/**
 * Lowers a raw Flint AST module into a High-Level SonIR module graph.
 *
 * @param ast - Parsed FlintModule AST.
 * @returns HighLevelSonModule graph.
 */
export function lowerFlintAstToHighLevelSon(
  ast: FlintModule,
): HighLevelSonModule {
  const ir = lowerFlintToIr(ast);
  return lowerFlintIrToHighLevelSon(ir);
}
