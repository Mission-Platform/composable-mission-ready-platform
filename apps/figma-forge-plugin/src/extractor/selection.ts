import type { FigmaNode } from './types';

export interface SelectionValidationResult {
  readonly root?: FigmaNode;
  readonly error?: string;
}

const ROOT_TYPES = new Set(['FRAME', 'COMPONENT']);

export function validateFigmaSelection(selection: readonly FigmaNode[]): SelectionValidationResult {
  if (selection.length === 0) return { error: 'Select exactly one frame or component to start conversion.' };
  if (selection.length > 1)
    return { error: 'Select only one frame or component; multiple selections are not supported.' };
  const [root] = selection;
  if (!ROOT_TYPES.has(root.type)) {
    return { error: `The selected layer "${root.name}" is not a supported root. Select a frame or component.` };
  }
  return { root };
}
