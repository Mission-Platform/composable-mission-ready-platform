import { useEffect } from '@mission-platform/forge-jsx';

import type { FlintRendererBridge } from '../components/organisms/forge-flint-graph-editor/useBackendPassDispatcher';
import type { FlintEditorStore } from '../editor/editor-store';

/**
 * Checks whether an interactive text input element is currently focused.
 */
function isInputFocused(): boolean {
  const activeElement = typeof document === 'undefined' ? undefined : document.activeElement;
  return activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
}

/**
 * Handles Escape key navigation or selection dismissal.
 */
export function handleEscapeKey(store: FlintEditorStore, bridge?: FlintRendererBridge): void {
  if (store.canNavigateBack()) {
    store.navigateBack();
    bridge?.renderFrame();
  } else {
    store.deselectAll();
    bridge?.setSelection([], []);
    bridge?.renderFrame();
  }
}

/**
 * Handles Delete and Backspace shortcut actions.
 */
export function handleDeleteKey(store: FlintEditorStore, bridge?: FlintRendererBridge): void {
  if (isInputFocused()) return;
  if (store.getState().activeEdgeId) {
    store.removeActiveEdge();
    bridge?.renderFrame();
    return;
  }
  if (store.getState().selectedNodeIds.length > 0) {
    store.deleteSelected();
    bridge?.renderFrame();
  }
}

/**
 * Handles Undo, Redo, Select All, and Grouping keyboard shortcuts.
 */
export function handleCtrlShortcuts(event: KeyboardEvent, store: FlintEditorStore, bridge?: FlintRendererBridge): void {
  if (event.key === 'z') {
    if (event.shiftKey) {
      store.redo();
    } else {
      store.undo();
    }
    bridge?.renderFrame();
  }
}

/**
 * Tests whether key is a deletion shortcut.
 */
export function isDeleteKey(key: string): boolean {
  return key === 'Delete' || key === 'Backspace';
}

/**
 * Tests whether keyboard event has modifier keys pressed.
 */
export function hasModifierKey(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

/**
 * Processes global keyboard shortcuts for editor navigation, deletion, and undo/redo.
 */
export function handleEditorKeyboardAction(
  event: KeyboardEvent,
  store: FlintEditorStore,
  bridge: FlintRendererBridge | undefined,
): void {
  if (event.key === 'Escape') {
    handleEscapeKey(store, bridge);
  } else if (isDeleteKey(event.key)) {
    handleDeleteKey(store, bridge);
  } else if (hasModifierKey(event)) {
    handleCtrlShortcuts(event, store, bridge);
  }
}

/**
 * Custom hook to register keyboard shortcuts for graph navigation, deletion, undo/redo.
 */
export function useGraphKeyboardShortcuts(store: FlintEditorStore, bridge?: FlintRendererBridge): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent): void => {
      handleEditorKeyboardAction(event, store, bridge);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [store, bridge]);
}
