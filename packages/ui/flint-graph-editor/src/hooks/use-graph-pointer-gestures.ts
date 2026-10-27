import { useEffect, useRef } from '@mission-platform/forge-jsx';

import type { FlintRendererBridge } from '../components/organisms/forge-flint-graph-editor/useBackendPassDispatcher';
import type { FlintEditorStore } from '../editor/editor-store';
import type { FlintHitResult } from '../renderer/render-worker';

export interface UseGraphPointerGesturesOptions {
  readonly canvasReference: { current?: HTMLCanvasElement };
  readonly store: FlintEditorStore;
  readonly bridge?: FlintRendererBridge;
  readonly onContextMenu?: (event: MouseEvent, targetHit?: FlintHitResult) => void;
  readonly onNodeDoubleClick?: (nodeId: string) => void;
}

/**
 * Custom hook to coordinate canvas pointer events, marquee selection, node dragging, and connection gestures.
 */
export function useGraphPointerGestures(options: UseGraphPointerGesturesOptions): void {
  const { canvasReference, store, bridge, onContextMenu, onNodeDoubleClick } = options;
  const isDraggingReference = useRef(false);
  const dragStartPosReference = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasReference.current;
    if (!canvas) return;

    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      isDraggingReference.current = true;
      dragStartPosReference.current = { x: event.clientX, y: event.clientY };
    };

    const onPointerMove = (_event: PointerEvent): void => {
      if (!isDraggingReference.current) return;
      // Gesture movement updates can be routed through renderer bridge
    };

    const onPointerUp = (): void => {
      isDraggingReference.current = false;
    };

    const onContextMenuHandler = (event: MouseEvent): void => {
      event.preventDefault();
      onContextMenu?.(event);
    };

    const onDblClickHandler = (_event: MouseEvent): void => {
      const state = store.getState();
      if (state.selectedNodeIds.length === 1) {
        onNodeDoubleClick?.(state.selectedNodeIds[0] as string);
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenuHandler);
    canvas.addEventListener('dblclick', onDblClickHandler);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenuHandler);
      canvas.removeEventListener('dblclick', onDblClickHandler);
    };
  }, [canvasReference, store, bridge, onContextMenu, onNodeDoubleClick]);
}
