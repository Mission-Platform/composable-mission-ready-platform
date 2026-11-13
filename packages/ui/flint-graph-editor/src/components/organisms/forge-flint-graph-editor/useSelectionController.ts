import {
  getNodeDefinition,
  type FlintGraphEdge,
  type FlintGraphGroup,
  type FlintGraphNode,
  type FlintNodeDefinition,
} from '@mission-platform/flint';
import { useState } from '@mission-platform/forge-jsx';

import type { FlintEditorStore, FlintEditorStoreState } from '../../../editor/editor-store';

export interface SelectionSquareState {
  readonly active: boolean;
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
}

export interface ActiveSelections {
  readonly selectedNode?: FlintGraphNode;
  readonly selectedDefinition?: FlintNodeDefinition;
  readonly selectedGroup?: FlintGraphGroup;
  readonly selectedEdge?: FlintGraphEdge;
}

/**
 * Checks whether a node is enclosed within the world-space bounding rectangle of a marquee selection.
 */
export function isNodeInSelectionBox(
  node: FlintGraphNode,
  minWorldX: number,
  minWorldY: number,
  maxWorldX: number,
  maxWorldY: number,
): boolean {
  const nodeMinX = node.position.x;
  const nodeMinY = node.position.y;
  const nodeMaxX = nodeMinX + 220;
  const nodeMaxY = nodeMinY + 120;

  return nodeMaxX >= minWorldX && nodeMinX <= maxWorldX && nodeMaxY >= minWorldY && nodeMinY <= maxWorldY;
}

/**
 * Resolves active selected objects and definitions from store state.
 */
export function resolveActiveSelections(editorState: FlintEditorStoreState): ActiveSelections {
  const selectedNode =
    editorState.selectedNodeIds.length === 1
      ? editorState.graph.nodes.find((node) => node.id === editorState.selectedNodeIds[0])
      : undefined;

  const selectedDefinition = selectedNode ? getNodeDefinition(selectedNode.operation) : undefined;

  const selectedGroup = editorState.selectedGroupId
    ? editorState.graph.groups?.find((group) => group.id === editorState.selectedGroupId)
    : undefined;

  const selectedEdge = editorState.activeEdgeId
    ? editorState.graph.edges.find((edge) => edge.id === editorState.activeEdgeId)
    : undefined;

  return {
    selectedNode,
    selectedDefinition,
    selectedGroup,
    selectedEdge,
  };
}

/**
 * Filters node catalog definitions matching a case-insensitive search query.
 */
export function filterNodeDefinitions(
  query: string,
  definitions: readonly FlintNodeDefinition[],
): readonly FlintNodeDefinition[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return definitions;
  return definitions.filter((def) => {
    return (
      def.operation.toLowerCase().includes(normalized) ||
      def.title.toLowerCase().includes(normalized) ||
      def.description?.toLowerCase().includes(normalized) ||
      def.category.toLowerCase().includes(normalized)
    );
  });
}

/**
 * Hook managing marquee box selection, hit test selection updates, and selected entity resolution.
 */
export function useSelectionController(store: FlintEditorStore) {
  const [selectionSquare, setSelectionSquare] = useState<SelectionSquareState>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const startMarquee = (screenX: number, screenY: number): void => {
    setSelectionSquare({
      active: true,
      startX: screenX,
      startY: screenY,
      currentX: screenX,
      currentY: screenY,
    });
  };

  const updateMarquee = (screenX: number, screenY: number): void => {
    setSelectionSquare((prev) => {
      if (!prev.active) return prev;
      return {
        ...prev,
        currentX: screenX,
        currentY: screenY,
      };
    });
  };

  const finishMarquee = (
    screenToWorld: (screenX: number, screenY: number) => { x: number; y: number },
    nodes: readonly FlintGraphNode[],
    append = false,
  ): readonly string[] => {
    if (!selectionSquare.active) return [];

    const minScreenX = Math.min(selectionSquare.startX, selectionSquare.currentX);
    const maxScreenX = Math.max(selectionSquare.startX, selectionSquare.currentX);
    const minScreenY = Math.min(selectionSquare.startY, selectionSquare.currentY);
    const maxScreenY = Math.max(selectionSquare.startY, selectionSquare.currentY);

    const topLeft = screenToWorld(minScreenX, minScreenY);
    const bottomRight = screenToWorld(maxScreenX, maxScreenY);

    const minWorldX = Math.min(topLeft.x, bottomRight.x);
    const maxWorldX = Math.max(topLeft.x, bottomRight.x);
    const minWorldY = Math.min(topLeft.y, bottomRight.y);
    const maxWorldY = Math.max(topLeft.y, bottomRight.y);

    const hitNodeIds: string[] = [];
    for (const node of nodes) {
      if (isNodeInSelectionBox(node, minWorldX, minWorldY, maxWorldX, maxWorldY)) {
        hitNodeIds.push(node.id);
      }
    }

    if (append) {
      const currentSelected = store.getState().selectedNodeIds;
      const combined = Array.from(new Set([...currentSelected, ...hitNodeIds]));
      store.selectNodes(combined);
    } else {
      store.selectNodes(hitNodeIds);
    }

    setSelectionSquare({
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });

    return hitNodeIds;
  };

  const cancelMarquee = (): void => {
    setSelectionSquare({
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  };

  return {
    selectionSquare,
    setSelectionSquare,
    startMarquee,
    updateMarquee,
    finishMarquee,
    cancelMarquee,
  };
}
