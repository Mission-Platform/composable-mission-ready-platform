import type { FlintPrimitiveType, FlintTypeName } from '../ast.js';
import type { FlintSourceSpan } from '../diagnostics.js';

export type FlintPortDirection = 'input' | 'output';

export type FlintNodeCategory = 'math' | 'logic' | 'text' | 'collection' | 'control' | 'capability' | 'custom';

export type FlintNodeKind =
  'input' | 'output' | 'constant' | 'operation' | 'stdlib_call' | 'capability_call' | 'custom';

export interface FlintGraphPort {
  readonly id: string;
  readonly name: string;
  readonly direction: FlintPortDirection;
  readonly type: FlintTypeName;
  readonly defaultValue?: unknown;
  readonly required?: boolean;
}

export interface FlintMetaNodePortMapping {
  readonly internalNodeId: string;
  readonly internalPortId: string;
}

export interface FlintMetaNodeSubgraph {
  readonly nodes: readonly FlintGraphNode[];
  readonly edges: readonly FlintGraphEdge[];
  readonly exposedInputPortMap: Readonly<Record<string, FlintMetaNodePortMapping>>;
  readonly exposedOutputPortMap: Readonly<Record<string, FlintMetaNodePortMapping>>;
}

export interface FlintMetaNodeDefinition {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly description?: string;
  readonly subgraph: FlintMetaNodeSubgraph;
  readonly inputs: readonly FlintGraphPort[];
  readonly outputs: readonly FlintGraphPort[];
}

export interface FlintGraphGroup {
  readonly id: string;
  readonly title: string;
  readonly nodeIds: readonly string[];
  readonly color?: string;
  readonly backgroundColor?: string;
}

export interface FlintGraphNode {
  readonly id: string;
  readonly title: string;
  readonly category: FlintNodeCategory;
  readonly kind: FlintNodeKind;
  readonly operation: string;
  readonly inputs: readonly FlintGraphPort[];
  readonly outputs: readonly FlintGraphPort[];
  readonly position: { readonly x: number; readonly y: number };
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly metaSubgraph?: FlintMetaNodeSubgraph;
  readonly metaTemplateId?: string;
  readonly groupId?: string;
  readonly splitOutputs?: boolean;
}

export interface FlintGraphEdge {
  readonly id: string;
  readonly fromNodeId: string;
  readonly fromPortId: string;
  readonly toNodeId: string;
  readonly toPortId: string;
}

export interface FlintNodeGraph {
  readonly id: string;
  readonly name: string;
  readonly nodes: readonly FlintGraphNode[];
  readonly edges: readonly FlintGraphEdge[];
  readonly groups?: readonly FlintGraphGroup[];
  readonly requestedCapabilities?: readonly string[];
  readonly entryFunctionName?: string;
}

export interface FlintNodeSourceMap {
  readonly nodeToSpan: ReadonlyMap<string, FlintSourceSpan>;
  readonly spanToNode: ReadonlyMap<string, string>;
  readonly portToAstIdentifier: ReadonlyMap<string, string>;
}

export type FlintGraphValidationSeverity = 'error' | 'warning' | 'info';

export interface FlintGraphValidationIssue {
  readonly code: string;
  readonly severity: FlintGraphValidationSeverity;
  readonly message: string;
  readonly nodeId?: string;
  readonly portId?: string;
  readonly edgeId?: string;
}

export interface FlintGraphValidationResult {
  readonly valid: boolean;
  readonly issues: readonly FlintGraphValidationIssue[];
  readonly sortedNodeIds?: readonly string[];
}

/**
 * Creates a synthetic source span for graph-generated AST nodes.
 */
export function createSyntheticSpan(line = 1, column = 1, length = 1): FlintSourceSpan {
  return {
    start: 0,
    end: length,
    line,
    column,
    endLine: line,
    endColumn: column + length,
  };
}

/**
 * Creates a primitive FlintTypeName node.
 */
export function createPrimitiveType(
  primitive: FlintPrimitiveType,
  span: FlintSourceSpan = createSyntheticSpan(),
): FlintTypeName {
  return {
    kind: 'type-name',
    name: primitive,
    span,
  };
}

/**
 * Creates a generic or aggregate FlintTypeName node.
 */
export function createContainerType(
  container: string,
  typeArguments: readonly FlintTypeName[] = [],
  span: FlintSourceSpan = createSyntheticSpan(),
): FlintTypeName {
  return {
    kind: 'type-name',
    name: 'unit',
    reference: container,
    arguments: typeArguments,
    span,
  };
}

/**
 * Recursively inlines and flattens any meta nodes in a graph into their constituent internal nodes and edges.
 * Used during validation, AST generation, and source emission to seamlessly compile composite meta nodes.
 */
export function flattenGraph(graph: FlintNodeGraph): FlintNodeGraph {
  const hasMeta = graph.nodes.some((node) => node.metaSubgraph !== undefined);
  if (!hasMeta) {
    return graph;
  }

  const flattenedNodes: FlintGraphNode[] = [];
  const flattenedEdges: FlintGraphEdge[] = [];
  const externalEdgesToMeta = new Map<string, FlintGraphEdge[]>();
  const externalEdgesFromMeta = new Map<string, FlintGraphEdge[]>();

  const metaNodeIds = new Set(graph.nodes.filter((node) => node.metaSubgraph !== undefined).map((node) => node.id));

  for (const edge of graph.edges) {
    const toMeta = metaNodeIds.has(edge.toNodeId);
    const fromMeta = metaNodeIds.has(edge.fromNodeId);

    if (toMeta) {
      const list = externalEdgesToMeta.get(edge.toNodeId) ?? [];
      list.push(edge);
      externalEdgesToMeta.set(edge.toNodeId, list);
    }
    if (fromMeta) {
      const list = externalEdgesFromMeta.get(edge.fromNodeId) ?? [];
      list.push(edge);
      externalEdgesFromMeta.set(edge.fromNodeId, list);
    }
    if (!toMeta && !fromMeta) {
      flattenedEdges.push(edge);
    }
  }

  for (const node of graph.nodes) {
    if (!node.metaSubgraph) {
      flattenedNodes.push(node);
      continue;
    }

    const sub = node.metaSubgraph;
    const prefix = `${node.id}__`;
    const internalIdMap = new Map<string, string>();

    for (const internalNode of sub.nodes) {
      const newId = `${prefix}${internalNode.id}`;
      internalIdMap.set(internalNode.id, newId);
      flattenedNodes.push({
        ...internalNode,
        id: newId,
      });
    }

    for (const edge of sub.edges) {
      flattenedEdges.push({
        id: `${prefix}${edge.id}`,
        fromNodeId: internalIdMap.get(edge.fromNodeId) ?? edge.fromNodeId,
        fromPortId: edge.fromPortId,
        toNodeId: internalIdMap.get(edge.toNodeId) ?? edge.toNodeId,
        toPortId: edge.toPortId,
      });
    }

    const incoming = externalEdgesToMeta.get(node.id) ?? [];
    for (const inEdge of incoming) {
      const mapping = sub.exposedInputPortMap[inEdge.toPortId];
      if (mapping) {
        flattenedEdges.push({
          id: inEdge.id,
          fromNodeId: inEdge.fromNodeId,
          fromPortId: inEdge.fromPortId,
          toNodeId: internalIdMap.get(mapping.internalNodeId) ?? mapping.internalNodeId,
          toPortId: mapping.internalPortId,
        });
      }
    }

    const outgoing = externalEdgesFromMeta.get(node.id) ?? [];
    for (const outEdge of outgoing) {
      const mapping = sub.exposedOutputPortMap[outEdge.fromPortId];
      if (mapping) {
        flattenedEdges.push({
          id: outEdge.id,
          fromNodeId: internalIdMap.get(mapping.internalNodeId) ?? mapping.internalNodeId,
          fromPortId: mapping.internalPortId,
          toNodeId: outEdge.toNodeId,
          toPortId: outEdge.toPortId,
        });
      }
    }
  }

  return {
    ...graph,
    nodes: flattenedNodes,
    edges: flattenedEdges,
  };
}
