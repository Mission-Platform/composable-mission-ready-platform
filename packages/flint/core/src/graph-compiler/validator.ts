import { flintTypeNameToString, type FlintTypeName } from '../ast.js';

import type { FlintGraphNode, FlintGraphValidationIssue, FlintGraphValidationResult, FlintNodeGraph } from './types.js';

/**
 * Checks structural and semantic compatibility between source and destination Flint types.
 */
export function areTypesCompatible(source: FlintTypeName, target: FlintTypeName): boolean {
  const sourceName = source.reference ?? source.name;
  const targetName = target.reference ?? target.name;

  if (sourceName !== targetName) {
    return false;
  }

  if (source.length !== target.length) {
    return false;
  }

  const sourceArguments = source.arguments ?? [];
  const targetArguments = target.arguments ?? [];

  if (sourceArguments.length !== targetArguments.length) {
    return false;
  }

  for (const [index, sourceArgument] of sourceArguments.entries()) {
    const targetArgument = targetArguments[index];
    if (targetArgument === undefined || !areTypesCompatible(sourceArgument, targetArgument)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates graph topology, edge connections, port types, and detects cycles.
 * Returns sorted node IDs if the graph is a valid Directed Acyclic Graph (DAG).
 */
export function validateGraph(graph: FlintNodeGraph): FlintGraphValidationResult {
  const issues: FlintGraphValidationIssue[] = [];
  const nodeMap = new Map<string, FlintGraphNode>();

  // 1. Validate Node ID Uniqueness
  for (const node of graph.nodes) {
    if (nodeMap.has(node.id)) {
      issues.push({
        code: 'FLINT-GRAPH-DUPLICATE-NODE',
        severity: 'error',
        message: `Duplicate node ID detected: '${node.id}'. Node IDs must be unique.`,
        nodeId: node.id,
      });
    } else {
      nodeMap.set(node.id, node);
    }
  }

  // Map input ports to incoming edge IDs to detect multiple incoming connections
  const inputPortConnections = new Map<string, string>(); // key: `${nodeId}:${portId}`, value: edgeId

  // 2. Validate Edges
  for (const edge of graph.edges) {
    if (edge.fromNodeId === edge.toNodeId) {
      issues.push({
        code: 'FLINT-GRAPH-SELF-LOOP',
        severity: 'error',
        message: `Self-referential loop detected on node '${edge.fromNodeId}'.`,
        nodeId: edge.fromNodeId,
        edgeId: edge.id,
      });
      continue;
    }

    const fromNode = nodeMap.get(edge.fromNodeId);
    const toNode = nodeMap.get(edge.toNodeId);

    if (fromNode === undefined) {
      issues.push({
        code: 'FLINT-GRAPH-DANGLING-EDGE',
        severity: 'error',
        message: `Edge '${edge.id}' originates from non-existent source node '${edge.fromNodeId}'.`,
        edgeId: edge.id,
      });
      continue;
    }

    if (toNode === undefined) {
      issues.push({
        code: 'FLINT-GRAPH-DANGLING-EDGE',
        severity: 'error',
        message: `Edge '${edge.id}' targets non-existent destination node '${edge.toNodeId}'.`,
        edgeId: edge.id,
      });
      continue;
    }

    const fromPort = fromNode.outputs.find((p) => p.id === edge.fromPortId);
    const toPort = toNode.inputs.find((p) => p.id === edge.toPortId);

    if (fromPort === undefined) {
      issues.push({
        code: 'FLINT-GRAPH-MISSING-PORT',
        severity: 'error',
        message: `Source output port '${edge.fromPortId}' was not found on node '${fromNode.title}' (${fromNode.id}).`,
        nodeId: fromNode.id,
        portId: edge.fromPortId,
        edgeId: edge.id,
      });
      continue;
    }

    if (toPort === undefined) {
      issues.push({
        code: 'FLINT-GRAPH-MISSING-PORT',
        severity: 'error',
        message: `Destination input port '${edge.toPortId}' was not found on node '${toNode.title}' (${toNode.id}).`,
        nodeId: toNode.id,
        portId: edge.toPortId,
        edgeId: edge.id,
      });
      continue;
    }

    // Check single assignment for input port
    const targetKey = `${toNode.id}:${toPort.id}`;
    const existingEdgeId = inputPortConnections.get(targetKey);
    if (existingEdgeId === undefined) {
      inputPortConnections.set(targetKey, edge.id);
    } else {
      issues.push({
        code: 'FLINT-GRAPH-MULTI-INPUT',
        severity: 'error',
        message: `Input port '${toPort.name}' on node '${toNode.title}' (${toNode.id}) has multiple incoming connections (edges '${existingEdgeId}' and '${edge.id}').`,
        nodeId: toNode.id,
        portId: toPort.id,
        edgeId: edge.id,
      });
    }

    // Type Compatibility Check
    if (!areTypesCompatible(fromPort.type, toPort.type)) {
      issues.push({
        code: 'FLINT-GRAPH-TYPE-MISMATCH',
        severity: 'error',
        message: `Type mismatch on edge '${edge.id}': Output port '${fromPort.name}' (${flintTypeNameToString(fromPort.type)}) is incompatible with input port '${toPort.name}' (${flintTypeNameToString(toPort.type)}).`,
        nodeId: toNode.id,
        portId: toPort.id,
        edgeId: edge.id,
      });
    }
  }

  // 3. Check for Required Unconnected Inputs
  for (const node of graph.nodes) {
    for (const inputPort of node.inputs) {
      const isConnected = inputPortConnections.has(`${node.id}:${inputPort.id}`);
      if (!isConnected && inputPort.required && inputPort.defaultValue === undefined) {
        issues.push({
          code: 'FLINT-GRAPH-REQUIRED-PORT-UNCONNECTED',
          severity: 'error',
          message: `Required input port '${inputPort.name}' on node '${node.title}' (${node.id}) is not connected and provides no default value.`,
          nodeId: node.id,
          portId: inputPort.id,
        });
      }
    }
  }

  // 4. Cycle Detection & Topological Sort (Kahn's algorithm)
  // Build adjacency list: fromNodeId -> set of toNodeIds
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();

  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, new Set<string>());
  }

  for (const edge of graph.edges) {
    if (nodeMap.has(edge.fromNodeId) && nodeMap.has(edge.toNodeId) && edge.fromNodeId !== edge.toNodeId) {
      const neighbors = adjacency.get(edge.fromNodeId);
      if (neighbors !== undefined && !neighbors.has(edge.toNodeId)) {
        neighbors.add(edge.toNodeId);
        inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [...inDegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([nodeId]) => nodeId)
    .toSorted((a, b) => a.localeCompare(b));

  const sortedNodeIds: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    sortedNodeIds.push(current);

    const neighbors = adjacency.get(current);
    if (neighbors !== undefined) {
      const nextNodes = [...neighbors].toSorted((a, b) => a.localeCompare(b));
      for (const neighbor of nextNodes) {
        const nextDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, nextDegree);
        if (nextDegree === 0) {
          queue.push(neighbor);
        }
      }
    }
  }

  // If sorted count < total nodes, cycle exists
  if (sortedNodeIds.length < graph.nodes.length) {
    // Identify nodes involved in the cycle
    const cycleNodes = graph.nodes.filter((n) => (inDegree.get(n.id) ?? 0) > 0).map((n) => n.id);

    issues.push({
      code: 'FLINT-GRAPH-CYCLE',
      severity: 'error',
      message: `Circular dependency detected in node graph. Nodes involved: [${cycleNodes.join(', ')}].`,
    });
  }

  const hasErrors = issues.some((issue) => issue.severity === 'error');

  return {
    valid: !hasErrors,
    issues,
    sortedNodeIds: hasErrors ? undefined : sortedNodeIds,
  };
}
