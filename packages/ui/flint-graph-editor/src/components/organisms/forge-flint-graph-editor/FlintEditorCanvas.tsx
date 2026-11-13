import type { MpElement } from '@mission-platform/forge-jsx';

import styles from './forge-flint-graph-editor.module.scss';

import type { SelectionSquareState } from './useSelectionController';

export interface FlintEditorCanvasProperties {
  readonly canvasReference: { current?: HTMLCanvasElement };
  readonly isFallback: boolean;
  readonly selectionSquare: SelectionSquareState;
  readonly onContextMenu?: (event: MouseEvent) => void;
  readonly children?: MpElement | readonly MpElement[];
}

export function FlintEditorCanvas(properties: FlintEditorCanvasProperties): MpElement {
  const { canvasReference, isFallback: _isFallback, selectionSquare, onContextMenu, children } = properties;

  return (
    <div className={styles.canvasContainer}>
      <canvas
        ref={canvasReference}
        className={styles.mainCanvas}
        onContextMenu={onContextMenu}
      />
      {selectionSquare.active && (
        <div
          className={styles.selectionMarquee}
          style={{
            left: `${Math.min(selectionSquare.startX, selectionSquare.currentX)}px`,
            top: `${Math.min(selectionSquare.startY, selectionSquare.currentY)}px`,
            width: `${Math.abs(selectionSquare.currentX - selectionSquare.startX)}px`,
            height: `${Math.abs(selectionSquare.currentY - selectionSquare.startY)}px`,
          }}
        />
      )}
      {children}
    </div>
  );
}
