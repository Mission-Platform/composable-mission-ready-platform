import {
  compileGraphToFlint,
  createNodeFromDefinition,
  createPrimitiveType,
  getNodeDefinition,
  validateGraph,
  type FlintGraphEdge,
  type FlintGraphGroup,
  type FlintGraphNode,
  type FlintGraphPort,
  type FlintGraphValidationResult,
  type FlintMetaNodeDefinition,
  type FlintNodeGraph,
} from '@mission-platform/flint';

import { TraceDebuggerController } from '../debugger/trace-controller';

import { executeGraph, exportGraphArtifacts, type CompilerWorkerResponse } from './compiler-worker';

export interface ConnectingEdgeState {
  readonly fromNodeId: string;
  readonly fromPortId: string;
  readonly cursorX: number;
  readonly cursorY: number;
}

export interface NavigationBreadcrumb {
  readonly id: string;
  readonly title: string;
}

export interface ClipboardItem {
  readonly type: 'node' | 'group' | 'meta_node' | 'selection';
  readonly nodes: readonly FlintGraphNode[];
  readonly edges: readonly FlintGraphEdge[];
  readonly group?: FlintGraphGroup;
  readonly metaDefinition?: FlintMetaNodeDefinition;
}

export interface FlintEditorStoreState {
  readonly graph: FlintNodeGraph;
  readonly selectedNodeIds: readonly string[];
  readonly activeEdgeId?: string;
  readonly connectingEdge?: ConnectingEdgeState;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly validation: FlintGraphValidationResult;
  readonly isExecuting: boolean;
  readonly lastOutputs: Readonly<Record<string, unknown>>;
  readonly nodeErrors: Readonly<Record<string, string>>;
  readonly lastError?: string;
  readonly breadcrumbs: readonly NavigationBreadcrumb[];
  readonly currentMetaNodeId?: string;
  readonly registeredMetaNodes: readonly FlintMetaNodeDefinition[];
  readonly hasClipboard: boolean;
}

export type StoreListener = (state: FlintEditorStoreState) => void;

/**
 * State store managing graph topology, history stack, selection, and live Wasm compilation.
 */
function generateSecureId(prefix: string): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const randomHex = array[0]?.toString(36) ?? '0';
  return `${prefix}_${Date.now().toString(36)}_${randomHex}`;
}

const DEFAULT_NODE_POSITION = { x: 0, y: 0 } as const;

export class FlintEditorStore {
  private graph: FlintNodeGraph;
  private selectedNodeIds = new Set<string>();
  private activeEdgeId?: string;
  private connectingEdge?: ConnectingEdgeState;

  private readonly history: FlintNodeGraph[] = [];
  private historyIndex = -1;
  private readonly maxHistory = 50;

  private navigationStack: {
    readonly parentGraph: FlintNodeGraph;
    readonly metaNodeId: string;
    readonly metaNodeTitle: string;
  }[] = [];
  private registeredMetaNodes = new Map<string, FlintMetaNodeDefinition>();
  private clipboard?: ClipboardItem;

  private validation: FlintGraphValidationResult;
  private isExecuting = false;
  private lastOutputs: Record<string, unknown> = {};
  private nodeErrors: Record<string, string> = {};
  private lastError?: string;
  private readonly traceController = new TraceDebuggerController();
  private lastUpdateTimeMs = 0.5;

  private readonly listeners = new Set<StoreListener>();

  constructor(initialGraph?: FlintNodeGraph) {
    this.graph = initialGraph ?? {
      id: 'graph-1',
      name: 'FlintGraph',
      nodes: [],
      edges: [],
    };
    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
  }

  getState(): FlintEditorStoreState {
    const currentFrame = this.navigationStack.at(-1);
    return {
      graph: this.graph,
      selectedNodeIds: [...this.selectedNodeIds],
      activeEdgeId: this.activeEdgeId,
      connectingEdge: this.connectingEdge,
      canUndo: this.historyIndex > 0,
      canRedo: this.historyIndex < this.history.length - 1,
      validation: this.validation,
      isExecuting: this.isExecuting,
      lastOutputs: this.lastOutputs,
      nodeErrors: this.nodeErrors,
      lastError: this.lastError,
      breadcrumbs: this.getBreadcrumbs(),
      currentMetaNodeId: currentFrame?.metaNodeId,
      registeredMetaNodes: this.getRegisteredMetaNodes(),
      hasClipboard: this.clipboard !== undefined && this.clipboard.nodes.length > 0,
    };
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private pushHistoryState(newGraph: FlintNodeGraph): void {
    if (this.historyIndex < this.history.length - 1) {
      this.history.splice(this.historyIndex + 1);
    }
    this.history.push(structuredClone(newGraph));
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo(): boolean {
    if (this.historyIndex <= 0) return false;
    this.historyIndex--;
    const previous = this.history[this.historyIndex];
    if (previous) {
      this.graph = structuredClone(previous);
      this.validation = validateGraph(this.graph);
      this.selectedNodeIds.clear();
      this.activeEdgeId = undefined;
      this.notify();
      return true;
    }
    return false;
  }

  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;
    this.historyIndex++;
    const next = this.history[this.historyIndex];
    if (next) {
      this.graph = structuredClone(next);
      this.validation = validateGraph(this.graph);
      this.selectedNodeIds.clear();
      this.activeEdgeId = undefined;
      this.notify();
      return true;
    }
    return false;
  }

  addNode(
    operation: string,
    position: {
      readonly x: number;
      readonly y: number;
    } = DEFAULT_NODE_POSITION,
    properties?: Record<string, unknown>,
  ): FlintGraphNode | undefined {
    const definition = getNodeDefinition(operation);
    if (!definition) return undefined;

    const id = generateSecureId(`node_${operation}`);
    const newNode = createNodeFromDefinition(definition, id, position, properties);

    this.graph = {
      ...this.graph,
      nodes: [...this.graph.nodes, newNode],
    };

    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.selectNode(newNode.id);
    this.notify();
    return newNode;
  }

  removeNode(nodeId: string): void {
    const updatedNodes = this.graph.nodes.filter((n) => n.id !== nodeId);
    const updatedEdges = this.graph.edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId);

    this.graph = {
      ...this.graph,
      nodes: updatedNodes,
      edges: updatedEdges,
    };

    this.selectedNodeIds.delete(nodeId);
    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.notify();
  }

  moveNode(nodeId: string, position: { readonly x: number; readonly y: number }): void {
    const startTime = typeof performance === 'undefined' ? 0 : performance.now();
    let changed = false;
    const updatedNodes = this.graph.nodes.map((n) => {
      if (n.id === nodeId) {
        changed = true;
        return { ...n, position };
      }
      return n;
    });

    if (changed) {
      this.graph = { ...this.graph, nodes: updatedNodes };
      if (startTime > 0) {
        this.lastUpdateTimeMs = Math.max(0.1, performance.now() - startTime);
      }
      this.notify();
    }
  }

  moveSelectedNodes(
    deltaX: number,
    deltaY: number,
    startPositions: ReadonlyMap<string, { readonly x: number; readonly y: number }>,
  ): void {
    const startTime = typeof performance === 'undefined' ? 0 : performance.now();
    let changed = false;
    const updatedNodes = this.graph.nodes.map((node) => {
      const initial = startPositions.get(node.id);
      if (initial !== undefined) {
        changed = true;
        return {
          ...node,
          position: {
            x: Math.round(initial.x + deltaX),
            y: Math.round(initial.y + deltaY),
          },
        };
      }
      return node;
    });

    if (changed) {
      this.graph = { ...this.graph, nodes: updatedNodes };
      if (startTime > 0) {
        this.lastUpdateTimeMs = Math.max(0.1, performance.now() - startTime);
      }
      this.notify();
    }
  }

  commitNodeMove(): void {
    this.pushHistoryState(this.graph);
    this.notify();
  }

  connectPorts(
    fromNodeId: string,
    fromPortId: string,
    toNodeId: string,
    toPortId: string,
  ): { readonly success: boolean; readonly error?: string } {
    let sourceNodeId = fromNodeId;
    let sourcePortId = fromPortId;
    let targetNodeId = toNodeId;
    let targetPortId = toPortId;

    if (fromNodeId === toNodeId) {
      return { success: false, error: 'Cannot connect a node to itself.' };
    }

    const fromNode = this.graph.nodes.find((n) => n.id === fromNodeId);
    const toNode = this.graph.nodes.find((n) => n.id === toNodeId);
    if (!fromNode || !toNode) {
      return { success: false, error: 'Nodes not found.' };
    }

    const fromIsInput = fromNode.inputs.some((p) => p.id === fromPortId);
    const toIsOutput = toNode.outputs.some((p) => p.id === toPortId);

    // If dragged from input to output, normalize direction: output pin -> input pin
    if (fromIsInput && toIsOutput) {
      sourceNodeId = toNodeId;
      sourcePortId = toPortId;
      targetNodeId = fromNodeId;
      targetPortId = fromPortId;
    }

    // Prevent duplicate connection to the same input port
    const existing = this.graph.edges.find((e) => e.toNodeId === targetNodeId && e.toPortId === targetPortId);
    if (existing) {
      return {
        success: false,
        error: 'Input port already has an incoming connection.',
      };
    }

    const edgeId = generateSecureId('edge');
    const newEdge: FlintGraphEdge = {
      id: edgeId,
      fromNodeId: sourceNodeId,
      fromPortId: sourcePortId,
      toNodeId: targetNodeId,
      toPortId: targetPortId,
    };

    const candidateGraph: FlintNodeGraph = {
      ...this.graph,
      edges: [...this.graph.edges, newEdge],
    };

    const candidateValidation = validateGraph(candidateGraph);
    const connectionError = candidateValidation.issues.find(
      (i) => i.severity === 'error' && i.code !== 'FLINT-GRAPH-REQUIRED-PORT-UNCONNECTED',
    );
    if (connectionError) {
      return { success: false, error: connectionError.message };
    }

    this.graph = candidateGraph;
    this.validation = candidateValidation;
    this.pushHistoryState(this.graph);
    this.connectingEdge = undefined;
    this.notify();
    return { success: true };
  }

  removeEdge(edgeId: string): void {
    this.graph = {
      ...this.graph,
      edges: this.graph.edges.filter((e) => e.id !== edgeId),
    };
    if (this.activeEdgeId === edgeId) {
      this.activeEdgeId = undefined;
    }
    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.notify();
  }

  removeActiveEdge(): void {
    if (this.activeEdgeId) {
      this.removeEdge(this.activeEdgeId);
    }
  }

  selectNode(nodeId: string, multiSelect = false): void {
    if (!multiSelect) {
      this.selectedNodeIds.clear();
    }
    this.selectedNodeIds.add(nodeId);
    this.activeEdgeId = undefined;
    this.notify();
  }

  toggleNodeSelection(nodeId: string): void {
    if (this.selectedNodeIds.has(nodeId)) {
      this.selectedNodeIds.delete(nodeId);
    } else {
      this.selectedNodeIds.add(nodeId);
    }
    this.activeEdgeId = undefined;
    this.notify();
  }

  selectNodes(nodeIds: readonly string[], multiSelect = false): void {
    if (!multiSelect) {
      this.selectedNodeIds.clear();
    }
    for (const id of nodeIds) {
      this.selectedNodeIds.add(id);
    }
    this.activeEdgeId = undefined;
    this.notify();
  }

  deselectAll(): void {
    this.selectedNodeIds.clear();
    this.activeEdgeId = undefined;
    this.notify();
  }

  selectEdge(edgeId: string): void {
    this.selectedNodeIds.clear();
    this.activeEdgeId = edgeId;
    this.notify();
  }

  startConnecting(fromNodeId: string, fromPortId: string, startX: number, startY: number): void {
    this.connectingEdge = {
      fromNodeId,
      fromPortId,
      cursorX: startX,
      cursorY: startY,
    };
    this.notify();
  }

  updateConnectingCursor(cursorX: number, cursorY: number): void {
    if (this.connectingEdge) {
      this.connectingEdge = {
        ...this.connectingEdge,
        cursorX,
        cursorY,
      };
      this.notify();
    }
  }

  cancelConnecting(): void {
    if (this.connectingEdge) {
      this.connectingEdge = undefined;
      this.notify();
    }
  }

  groupSelectedNodes(title = 'Group', color = '#58a6ff'): FlintGraphGroup | undefined {
    if (this.selectedNodeIds.size === 0) return undefined;
    const groupId = generateSecureId('group');
    const newGroup: FlintGraphGroup = {
      id: groupId,
      title,
      nodeIds: [...this.selectedNodeIds],
      color,
    };

    const existingGroups = (this.graph.groups ?? []).filter(
      (group) => !group.nodeIds.some((id) => this.selectedNodeIds.has(id)),
    );

    const updatedNodes = this.graph.nodes.map((node) => {
      if (this.selectedNodeIds.has(node.id)) {
        return { ...node, groupId };
      }
      return node;
    });

    this.graph = {
      ...this.graph,
      groups: [...existingGroups, newGroup],
      nodes: updatedNodes,
    };

    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.notify();
    return newGroup;
  }

  ungroupSelected(): void {
    if (this.selectedNodeIds.size === 0) return;
    const selected = this.selectedNodeIds;
    const affectedGroupIds = new Set(
      this.graph.nodes.filter((node) => selected.has(node.id) && node.groupId).map((node) => node.groupId as string),
    );

    const remainingGroups = (this.graph.groups ?? []).filter((group) => !affectedGroupIds.has(group.id));
    const updatedNodes = this.graph.nodes.map((node) => {
      if (node.groupId && affectedGroupIds.has(node.groupId)) {
        const { groupId: _, ...rest } = node;
        return rest as FlintGraphNode;
      }
      return node;
    });

    this.graph = {
      ...this.graph,
      groups: remainingGroups,
      nodes: updatedNodes,
    };

    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.notify();
  }

  createMetaNodeFromSelected(title = 'Meta Node'): FlintGraphNode | undefined {
    if (this.selectedNodeIds.size === 0) return undefined;
    const selectedIds = new Set(this.selectedNodeIds);
    const subNodes = this.graph.nodes.filter((node) => selectedIds.has(node.id));
    const subEdges = this.graph.edges.filter(
      (edge) => selectedIds.has(edge.fromNodeId) && selectedIds.has(edge.toNodeId),
    );

    let totalX = 0;
    let totalY = 0;
    for (const node of subNodes) {
      totalX += node.position.x;
      totalY += node.position.y;
    }
    const metaPosition = {
      x: Math.round(totalX / subNodes.length),
      y: Math.round(totalY / subNodes.length),
    };

    const exposedInputPortMap: Record<string, { internalNodeId: string; internalPortId: string }> = {};
    const metaInputs: FlintGraphPort[] = [];
    const internalDrivenInputs = new Set<string>();
    for (const edge of subEdges) {
      internalDrivenInputs.add(`${edge.toNodeId}:${edge.toPortId}`);
    }

    const incomingExternalEdges = this.graph.edges.filter(
      (edge) => !selectedIds.has(edge.fromNodeId) && selectedIds.has(edge.toNodeId),
    );

    for (const edge of incomingExternalEdges) {
      const portKey = `${edge.toNodeId}:${edge.toPortId}`;
      if (
        !Object.values(exposedInputPortMap).some((map) => `${map.internalNodeId}:${map.internalPortId}` === portKey)
      ) {
        const targetNode = subNodes.find((node) => node.id === edge.toNodeId);
        const targetPort = targetNode?.inputs.find((port) => port.id === edge.toPortId);
        const sanitizedNodeTitle = (targetNode?.title ?? 'node').toLowerCase().replaceAll(/[^a-z0-9]/g, '_');
        const metaPortId = `in_${sanitizedNodeTitle}_${edge.toPortId}`;
        exposedInputPortMap[metaPortId] = {
          internalNodeId: edge.toNodeId,
          internalPortId: edge.toPortId,
        };
        metaInputs.push({
          id: metaPortId,
          name: `${targetNode?.title ?? ''}.${targetPort?.name ?? edge.toPortId}`,
          direction: 'input',
          type: targetPort?.type ?? createPrimitiveType('i32'),
        });
      }
    }

    for (const node of subNodes) {
      for (const port of node.inputs) {
        const portKey = `${node.id}:${port.id}`;
        if (
          !internalDrivenInputs.has(portKey) &&
          !Object.values(exposedInputPortMap).some((map) => `${map.internalNodeId}:${map.internalPortId}` === portKey)
        ) {
          const sanitizedTitle = node.title.toLowerCase().replaceAll(/[^a-z0-9]/g, '_');
          const metaPortId = `in_${sanitizedTitle}_${port.id}`;
          exposedInputPortMap[metaPortId] = {
            internalNodeId: node.id,
            internalPortId: port.id,
          };
          metaInputs.push({
            id: metaPortId,
            name: `${node.title}.${port.name}`,
            direction: 'input',
            type: port.type,
            defaultValue: port.defaultValue,
          });
        }
      }
    }

    const exposedOutputPortMap: Record<string, { internalNodeId: string; internalPortId: string }> = {};
    const metaOutputs: FlintGraphPort[] = [];
    const outgoingExternalEdges = this.graph.edges.filter(
      (edge) => selectedIds.has(edge.fromNodeId) && !selectedIds.has(edge.toNodeId),
    );

    for (const edge of outgoingExternalEdges) {
      const portKey = `${edge.fromNodeId}:${edge.fromPortId}`;
      if (
        !Object.values(exposedOutputPortMap).some((map) => `${map.internalNodeId}:${map.internalPortId}` === portKey)
      ) {
        const sourceNode = subNodes.find((node) => node.id === edge.fromNodeId);
        const sourcePort = sourceNode?.outputs.find((port) => port.id === edge.fromPortId);
        const sanitizedTitle = (sourceNode?.title ?? 'node').toLowerCase().replaceAll(/[^a-z0-9]/g, '_');
        const metaPortId = `out_${sanitizedTitle}_${edge.fromPortId}`;
        exposedOutputPortMap[metaPortId] = {
          internalNodeId: edge.fromNodeId,
          internalPortId: edge.fromPortId,
        };
        metaOutputs.push({
          id: metaPortId,
          name: `${sourceNode?.title ?? ''}.${sourcePort?.name ?? edge.fromPortId}`,
          direction: 'output',
          type: sourcePort?.type ?? createPrimitiveType('i32'),
        });
      }
    }

    if (metaOutputs.length === 0) {
      for (const node of subNodes) {
        for (const port of node.outputs) {
          const sanitizedTitle = node.title.toLowerCase().replaceAll(/[^a-z0-9]/g, '_');
          const metaPortId = `out_${sanitizedTitle}_${port.id}`;
          exposedOutputPortMap[metaPortId] = {
            internalNodeId: node.id,
            internalPortId: port.id,
          };
          metaOutputs.push({
            id: metaPortId,
            name: `${node.title}.${port.name}`,
            direction: 'output',
            type: port.type,
          });
        }
      }
    }

    const metaNodeId = generateSecureId('meta_node');
    const metaNode: FlintGraphNode = {
      id: metaNodeId,
      title,
      category: 'custom',
      kind: 'operation',
      operation: 'meta',
      inputs: metaInputs,
      outputs: metaOutputs,
      position: metaPosition,
      metaSubgraph: {
        nodes: subNodes,
        edges: subEdges,
        exposedInputPortMap,
        exposedOutputPortMap,
      },
    };

    const remainingEdges: FlintGraphEdge[] = [];
    for (const edge of this.graph.edges) {
      if (selectedIds.has(edge.fromNodeId) && selectedIds.has(edge.toNodeId)) {
        continue;
      }
      if (selectedIds.has(edge.toNodeId)) {
        const entry = Object.entries(exposedInputPortMap).find(
          ([, map]) => map.internalNodeId === edge.toNodeId && map.internalPortId === edge.toPortId,
        );
        if (entry) {
          remainingEdges.push({
            ...edge,
            toNodeId: metaNode.id,
            toPortId: entry[0],
          });
          continue;
        }
      }
      if (selectedIds.has(edge.fromNodeId)) {
        const entry = Object.entries(exposedOutputPortMap).find(
          ([, map]) => map.internalNodeId === edge.fromNodeId && map.internalPortId === edge.fromPortId,
        );
        if (entry) {
          remainingEdges.push({
            ...edge,
            fromNodeId: metaNode.id,
            fromPortId: entry[0],
          });
          continue;
        }
      }
      remainingEdges.push(edge);
    }

    const templateId = generateSecureId('template_meta');
    const metaNodeWithTemplate: FlintGraphNode = {
      ...metaNode,
      metaTemplateId: templateId,
    };

    if (metaNode.metaSubgraph) {
      this.registerMetaNode({
        id: templateId,
        name: title,
        title,
        subgraph: metaNode.metaSubgraph,
        inputs: metaNode.inputs,
        outputs: metaNode.outputs,
      });
    }

    const remainingNodes = this.graph.nodes.filter((node) => !selectedIds.has(node.id));
    this.graph = {
      ...this.graph,
      nodes: [...remainingNodes, metaNodeWithTemplate],
      edges: remainingEdges,
    };

    this.selectedNodeIds.clear();
    this.selectedNodeIds.add(metaNodeWithTemplate.id);
    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.notify();
    return metaNodeWithTemplate;
  }

  expandMetaNode(metaNodeId: string): void {
    const metaNode = this.graph.nodes.find((node) => node.id === metaNodeId);
    if (!metaNode || !metaNode.metaSubgraph) return;

    const sub = metaNode.metaSubgraph;
    const remainingNodes = this.graph.nodes.filter((node) => node.id !== metaNodeId);
    const unpackedNodes = sub.nodes.map((node) => ({ ...node }));
    const unpackedEdges = [...sub.edges];
    const topEdges: FlintGraphEdge[] = [];

    for (const edge of this.graph.edges) {
      if (edge.toNodeId === metaNodeId) {
        const mapping = sub.exposedInputPortMap[edge.toPortId];
        if (mapping) {
          topEdges.push({
            ...edge,
            toNodeId: mapping.internalNodeId,
            toPortId: mapping.internalPortId,
          });
          continue;
        }
      }
      if (edge.fromNodeId === metaNodeId) {
        const mapping = sub.exposedOutputPortMap[edge.fromPortId];
        if (mapping) {
          topEdges.push({
            ...edge,
            fromNodeId: mapping.internalNodeId,
            fromPortId: mapping.internalPortId,
          });
          continue;
        }
      }
      topEdges.push(edge);
    }

    this.graph = {
      ...this.graph,
      nodes: [...remainingNodes, ...unpackedNodes],
      edges: [...topEdges, ...unpackedEdges],
    };

    this.selectedNodeIds.clear();
    for (const node of unpackedNodes) {
      this.selectedNodeIds.add(node.id);
    }
    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.notify();
  }

  updateNodeProperty(nodeId: string, key: string, value: unknown): void {
    let changed = false;
    const updatedNodes = this.graph.nodes.map((node) => {
      if (node.id === nodeId) {
        changed = true;
        const currentProperties = node.properties ?? {};
        return {
          ...node,
          properties: {
            ...currentProperties,
            [key]: value,
          },
        };
      }
      return node;
    });

    if (changed) {
      this.graph = { ...this.graph, nodes: updatedNodes };
      this.validation = validateGraph(this.graph);
      this.pushHistoryState(this.graph);
      this.notify();
    }
  }

  renameNode(nodeId: string, title: string): void {
    let changed = false;
    const updatedNodes = this.graph.nodes.map((node) => {
      if (node.id === nodeId) {
        changed = true;
        return { ...node, title };
      }
      return node;
    });

    if (changed) {
      this.graph = { ...this.graph, nodes: updatedNodes };
      this.validation = validateGraph(this.graph);
      this.pushHistoryState(this.graph);
      this.notify();
    }
  }

  deleteSelected(): void {
    if (this.activeEdgeId) {
      this.removeEdge(this.activeEdgeId);
      return;
    }
    if (this.selectedNodeIds.size > 0) {
      const idsToDelete = new Set(this.selectedNodeIds);
      this.graph = {
        ...this.graph,
        nodes: this.graph.nodes.filter((n) => !idsToDelete.has(n.id)),
        edges: this.graph.edges.filter((e) => !idsToDelete.has(e.fromNodeId) && !idsToDelete.has(e.toNodeId)),
      };
      this.selectedNodeIds.clear();
      this.validation = validateGraph(this.graph);
      this.pushHistoryState(this.graph);
      this.notify();
    }
  }

  async runGraph(inputs: Readonly<Record<string, unknown>> = {}): Promise<void> {
    this.isExecuting = true;
    this.lastError = undefined;
    this.nodeErrors = {};
    this.notify();

    const response = await executeGraph(this.graph, inputs);
    this.isExecuting = false;

    if (response.type === 'run_success') {
      this.lastOutputs = response.outputs;
      if (response.trace) {
        const compilation = compileGraphToFlint(this.graph);
        this.traceController.loadTrace(response.trace, compilation.sourceMap);
      }
    } else if (response.type === 'run_error') {
      this.lastError = response.error;
      this.nodeErrors = response.nodeErrors;
    }
    this.notify();
  }

  exportArtifacts(): CompilerWorkerResponse {
    return exportGraphArtifacts(this.graph);
  }

  ungroup(groupId: string): void {
    const groups = (this.graph.groups ?? []).filter((g) => g.id !== groupId);
    const updatedNodes = this.graph.nodes.map((node) => {
      if (node.groupId === groupId) {
        const { groupId: _, ...rest } = node;
        return rest as FlintGraphNode;
      }
      return node;
    });

    this.graph = {
      ...this.graph,
      groups,
      nodes: updatedNodes,
    };
    this.pushHistoryState(this.graph);
    this.notify();
  }

  setGroupColor(groupId: string, color: string, backgroundColor?: string): void {
    const groups = (this.graph.groups ?? []).map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          color,
          backgroundColor: backgroundColor ?? `${color}25`,
        };
      }
      return g;
    });

    this.graph = {
      ...this.graph,
      groups,
    };
    this.pushHistoryState(this.graph);
    this.notify();
  }

  drillIntoMetaNode(metaNodeId: string): boolean {
    const metaNode = this.graph.nodes.find((n) => n.id === metaNodeId);
    if (!metaNode || !metaNode.metaSubgraph) return false;

    this.navigationStack.push({
      parentGraph: this.graph,
      metaNodeId,
      metaNodeTitle: metaNode.title,
    });

    this.graph = {
      id: `meta_${metaNodeId}`,
      name: metaNode.title,
      nodes: [...metaNode.metaSubgraph.nodes],
      edges: [...metaNode.metaSubgraph.edges],
      groups: [],
    };

    this.selectedNodeIds.clear();
    this.activeEdgeId = undefined;
    this.validation = validateGraph(this.graph);
    this.notify();
    return true;
  }

  navigateBack(): boolean {
    if (this.navigationStack.length === 0) return false;

    const frame = this.navigationStack.pop();
    if (!frame) return false;

    const parentGraph = frame.parentGraph;
    const metaNode = parentGraph.nodes.find((n) => n.id === frame.metaNodeId);
    if (metaNode?.metaSubgraph) {
      const updatedMetaNode: FlintGraphNode = {
        ...metaNode,
        metaSubgraph: {
          ...metaNode.metaSubgraph,
          nodes: this.graph.nodes,
          edges: this.graph.edges,
        },
      };

      this.graph = {
        ...parentGraph,
        nodes: parentGraph.nodes.map((n) => (n.id === frame.metaNodeId ? updatedMetaNode : n)),
      };
    } else {
      this.graph = parentGraph;
    }

    this.selectedNodeIds.clear();
    this.selectedNodeIds.add(frame.metaNodeId);
    this.activeEdgeId = undefined;
    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.notify();
    return true;
  }

  canNavigateBack(): boolean {
    return this.navigationStack.length > 0;
  }

  getBreadcrumbs(): readonly NavigationBreadcrumb[] {
    const crumbs: NavigationBreadcrumb[] = [{ id: 'root', title: 'Main' }];
    for (const frame of this.navigationStack) {
      crumbs.push({ id: frame.metaNodeId, title: frame.metaNodeTitle });
    }
    return crumbs;
  }

  registerMetaNode(def: FlintMetaNodeDefinition): void {
    this.registeredMetaNodes.set(def.id, def);
    this.notify();
  }

  getRegisteredMetaNodes(): readonly FlintMetaNodeDefinition[] {
    return [...this.registeredMetaNodes.values()];
  }

  removeRegisteredMetaNode(templateId: string): boolean {
    const countInGraph = (g: FlintNodeGraph): number => {
      let count = 0;
      for (const n of g.nodes) {
        if (n.metaTemplateId === templateId || n.operation === templateId) {
          count++;
        }
        if (n.metaSubgraph) {
          count += countInGraph({ id: '', name: '', nodes: n.metaSubgraph.nodes, edges: n.metaSubgraph.edges });
        }
      }
      return count;
    };

    let totalRefs = countInGraph(this.graph);
    for (const frame of this.navigationStack) {
      totalRefs += countInGraph(frame.parentGraph);
    }

    const def = this.registeredMetaNodes.get(templateId);
    let isRecursive = false;
    if (def) {
      isRecursive = countInGraph({ id: '', name: '', nodes: def.subgraph.nodes, edges: def.subgraph.edges }) > 0;
    }

    if (totalRefs === 0 || isRecursive) {
      this.registeredMetaNodes.delete(templateId);
      this.notify();
      return true;
    }
    return false;
  }

  instantiateMetaNode(
    templateId: string,
    position: { readonly x: number; readonly y: number } = DEFAULT_NODE_POSITION,
  ): FlintGraphNode | undefined {
    const def = this.registeredMetaNodes.get(templateId);
    if (!def) return undefined;

    const metaNodeId = generateSecureId('meta');
    const newNode: FlintGraphNode = {
      id: metaNodeId,
      title: def.title,
      category: 'custom',
      kind: 'operation',
      operation: 'meta',
      inputs: def.inputs,
      outputs: def.outputs,
      position,
      metaTemplateId: def.id,
      metaSubgraph: structuredClone(def.subgraph),
    };

    this.graph = {
      ...this.graph,
      nodes: [...this.graph.nodes, newNode],
    };
    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.selectNode(newNode.id);
    this.notify();
    return newNode;
  }

  copyNode(nodeId: string): boolean {
    const node = this.graph.nodes.find((n) => n.id === nodeId);
    if (!node) return false;
    this.clipboard = {
      type: node.metaSubgraph ? 'meta_node' : 'node',
      nodes: [structuredClone(node)],
      edges: [],
    };
    this.notify();
    return true;
  }

  copyGroup(groupId: string): boolean {
    const group = this.graph.groups?.find((g) => g.id === groupId);
    if (!group) return false;
    const memberNodes = this.graph.nodes.filter((n) => group.nodeIds.includes(n.id));
    const memberIds = new Set(memberNodes.map((n) => n.id));
    const memberEdges = this.graph.edges.filter((e) => memberIds.has(e.fromNodeId) && memberIds.has(e.toNodeId));
    this.clipboard = {
      type: 'group',
      nodes: structuredClone(memberNodes),
      edges: structuredClone(memberEdges),
      group: structuredClone(group),
    };
    this.notify();
    return true;
  }

  copyMetaNode(metaNodeId: string): boolean {
    return this.copyNode(metaNodeId);
  }

  duplicateMetaNode(metaNodeId: string): FlintGraphNode | undefined {
    const metaNode = this.graph.nodes.find((n) => n.id === metaNodeId);
    if (!metaNode || !metaNode.metaSubgraph) return undefined;

    const baseTitle = metaNode.title.replace(/\.\d+$/, '');
    const regex = new RegExp(String.raw`^${baseTitle}\.(\d+)$`);
    let maxCount = 0;
    for (const n of this.graph.nodes) {
      const match = n.title.match(regex);
      if (match?.[1]) {
        maxCount = Math.max(maxCount, Number.parseInt(match[1], 10));
      }
    }
    const newTitle = `${baseTitle}.${String(maxCount + 1).padStart(3, '0')}`;
    const newTemplateId = generateSecureId('template_meta');

    const duplicatedNode: FlintGraphNode = {
      ...structuredClone(metaNode),
      id: generateSecureId('meta'),
      title: newTitle,
      metaTemplateId: newTemplateId,
      position: {
        x: metaNode.position.x + 40,
        y: metaNode.position.y + 40,
      },
    };

    this.registerMetaNode({
      id: newTemplateId,
      name: newTitle,
      title: newTitle,
      subgraph: structuredClone(metaNode.metaSubgraph),
      inputs: metaNode.inputs,
      outputs: metaNode.outputs,
    });

    this.graph = {
      ...this.graph,
      nodes: [...this.graph.nodes, duplicatedNode],
    };
    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.selectNode(duplicatedNode.id);
    this.notify();
    return duplicatedNode;
  }

  copySelection(): boolean {
    if (this.selectedNodeIds.size === 0) return false;
    const selectedNodes = this.graph.nodes.filter((n) => this.selectedNodeIds.has(n.id));
    const selectedEdges = this.graph.edges.filter(
      (e) => this.selectedNodeIds.has(e.fromNodeId) && this.selectedNodeIds.has(e.toNodeId),
    );
    this.clipboard = {
      type: 'selection',
      nodes: structuredClone(selectedNodes),
      edges: structuredClone(selectedEdges),
    };
    this.notify();
    return true;
  }

  paste(targetPosition?: { readonly x: number; readonly y: number }): readonly string[] {
    if (!this.clipboard || this.clipboard.nodes.length === 0) return [];

    const idMap = new Map<string, string>();
    for (const n of this.clipboard.nodes) {
      idMap.set(n.id, generateSecureId(n.operation));
    }

    let minX = Infinity;
    let minY = Infinity;
    for (const n of this.clipboard.nodes) {
      if (n.position.x < minX) minX = n.position.x;
      if (n.position.y < minY) minY = n.position.y;
    }

    const offsetX = targetPosition ? targetPosition.x - minX : 30;
    const offsetY = targetPosition ? targetPosition.y - minY : 30;

    const newNodes: FlintGraphNode[] = this.clipboard.nodes.map((n) => {
      const newId = idMap.get(n.id) ?? generateSecureId(n.operation);
      let title = n.title;
      let metaTemplateId = n.metaTemplateId;

      if (n.metaSubgraph || n.operation === 'meta') {
        const baseTitle = n.title.replace(/\.\d+$/, '');
        const regex = new RegExp(String.raw`^${baseTitle}\.(\d+)$`);
        let maxCount = 0;
        for (const existing of this.graph.nodes) {
          const match = existing.title.match(regex);
          if (match?.[1]) {
            maxCount = Math.max(maxCount, Number.parseInt(match[1], 10));
          }
        }
        title = `${baseTitle}.${String(maxCount + 1).padStart(3, '0')}`;
        metaTemplateId = generateSecureId('template_meta');
        if (n.metaSubgraph) {
          this.registerMetaNode({
            id: metaTemplateId,
            name: title,
            title,
            subgraph: structuredClone(n.metaSubgraph),
            inputs: n.inputs,
            outputs: n.outputs,
          });
        }
      }

      return {
        ...structuredClone(n),
        id: newId,
        title,
        metaTemplateId,
        position: {
          x: Math.round(n.position.x + offsetX),
          y: Math.round(n.position.y + offsetY),
        },
      };
    });

    const newEdges: FlintGraphEdge[] = this.clipboard.edges.flatMap((edge) => {
      const fromNodeId = idMap.get(edge.fromNodeId);
      const toNodeId = idMap.get(edge.toNodeId);
      if (fromNodeId && toNodeId) {
        return [
          {
            ...edge,
            id: generateSecureId('edge'),
            fromNodeId,
            toNodeId,
          },
        ];
      }
      return [];
    });

    let updatedGroups = this.graph.groups ?? [];
    if (this.clipboard.group) {
      const newGroupId = generateSecureId('group');
      const newGroup: FlintGraphGroup = {
        ...structuredClone(this.clipboard.group),
        id: newGroupId,
        nodeIds: newNodes.map((n) => n.id),
      };
      updatedGroups = [...updatedGroups, newGroup];
      for (const n of newNodes) {
        (n as { groupId?: string }).groupId = newGroupId;
      }
    }

    this.graph = {
      ...this.graph,
      nodes: [...this.graph.nodes, ...newNodes],
      edges: [...this.graph.edges, ...newEdges],
      groups: updatedGroups,
    };

    this.selectedNodeIds.clear();
    for (const n of newNodes) {
      this.selectedNodeIds.add(n.id);
    }
    this.activeEdgeId = undefined;
    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.notify();
    return newNodes.map((n) => n.id);
  }

  toggleSplitOutputs(nodeId: string): void {
    const updatedNodes = this.graph.nodes.map((n) => {
      if (n.id === nodeId) {
        const current = n.splitOutputs ?? n.outputs.length > 1;
        return { ...n, splitOutputs: !current };
      }
      return n;
    });
    this.graph = { ...this.graph, nodes: updatedNodes };
    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.notify();
  }

  updateCodeNode(
    nodeId: string,
    code: string,
    inputs: readonly FlintGraphPort[],
    outputs: readonly FlintGraphPort[],
    functionName?: string,
  ): void {
    const updatedNodes = this.graph.nodes.map((n) => {
      if (n.id === nodeId) {
        return {
          ...n,
          inputs,
          outputs,
          properties: {
            ...n.properties,
            code,
            functionName: functionName ?? (n.properties?.functionName as string | undefined) ?? 'custom_fn',
          },
        };
      }
      return n;
    });
    this.graph = { ...this.graph, nodes: updatedNodes };
    this.validation = validateGraph(this.graph);
    this.pushHistoryState(this.graph);
    this.notify();
  }

  getTraceController(): TraceDebuggerController {
    return this.traceController;
  }

  getUpdateTimeMs(): number {
    return this.lastUpdateTimeMs;
  }
}
