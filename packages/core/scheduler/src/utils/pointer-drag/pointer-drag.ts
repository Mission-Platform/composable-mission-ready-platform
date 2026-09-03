export interface PointerDragHandlers {
  onMove?: (event: PointerEvent) => void;
  onEnd?: (event: PointerEvent) => void;
}

export function beginPointerDrag(handlers: PointerDragHandlers): () => void {
  if (typeof globalThis.addEventListener !== 'function') return () => {};
  const target = globalThis;
  const onMove = (event: PointerEvent): void => handlers.onMove?.(event);
  const onEnd = (event: PointerEvent): void => {
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onEnd);
    handlers.onEnd?.(event);
  };
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onEnd);
  return () => {
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onEnd);
  };
}
