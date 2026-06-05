import { onUnmounted } from 'vue';

/**
 * Semantic z-index layers for Mission Platform components.
 *
 * Layers are ordered lowest → highest. Each constant is the *base* value for
 * that layer; the global allocator adds a strictly-increasing global offset on
 * top so that every newly-mounted overlay is always above every previously-mounted
 * one — regardless of layer. Within the same layer, relative base ordering is
 * preserved as the floor value.
 *
 * Layer map
 * ─────────
 *  10  – scheduler-internal (draggable events, sticky headers)
 * 100  – navbar / sticky bar
 * 200  – dropdown / menu
 * 300  – popover / anchor overlay
 * 400  – modal / sidebar overlay
 * 500  – tooltip
 * 600  – notification / toast (reserved)
 * 700  – input-popover (date pickers, time pickers — always in front of modals)
 * 900  – dialog-input-popover (pickers opened *inside* a <dialog> top-layer)
 */
export const ZLayer = {
  schedulerInternal: 10,
  navbar: 100,
  dropdown: 200,
  popover: 300,
  modal: 400,
  tooltip: 500,
  notification: 600,
  /** Floating pickers — always rendered above modals and dialogs. */
  inputPopover: 700,
  /** Floating pickers teleported above native <dialog> top-layer elements. */
  dialogInputPopover: 900,
} as const;

export type ZLayerName = keyof typeof ZLayer;

/**
 * Single global counter shared across all layers.
 * Every call to `useZIndex` gets the next integer, guaranteeing that the most
 * recently mounted overlay is always above all previously mounted overlays.
 */
let globalCounter = 0;

/**
 * Per-layer set of allocated slots so we can decrement the global counter
 * correctly when overlays unmount.
 */
const allocated = new Map<ZLayerName, number[]>();

function allocate(layer: ZLayerName): number {
  globalCounter += 1;
  const slots = allocated.get(layer) ?? [];
  slots.push(globalCounter);
  allocated.set(layer, slots);
  return globalCounter;
}

function release(layer: ZLayerName, slot: number): void {
  const slots = allocated.get(layer);
  if (!slots) return;
  const index = slots.indexOf(slot);
  if (index !== -1) slots.splice(index, 1);
}

/**
 * `useZIndex` — composable that allocates a z-index for a floating / overlaid
 * element and automatically releases it when the component unmounts.
 *
 * The returned value is `ZLayer[layer] + globalSlot` so that:
 * - Each layer has a meaningful floor (e.g. modals never go below 400).
 * - Every newly-mounted overlay is strictly above every previously-mounted one,
 *   no matter which layer each belongs to.
 *
 * @param layer  The semantic layer this overlay belongs to.
 * @returns      `{ zIndex }` — a plain number to bind as `:style="{ zIndex }"`.
 *
 * @example
 * ```ts
 * const { zIndex } = useZIndex('inputPopover');
 * // bind: :style="{ zIndex }"
 * ```
 */
export function useZIndex(layer: ZLayerName): { zIndex: number } {
  const slot = allocate(layer);
  const zIndex = ZLayer[layer] + slot;

  onUnmounted(() => {
    release(layer, slot);
  });

  return { zIndex };
}
