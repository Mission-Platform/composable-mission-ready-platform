import { type MpChild, type MpElement, Slot, useState } from '@mission-platform/forge';

import styles from './forge-split-pane.module.scss';

export type SplitPaneDirection = 'horizontal' | 'vertical';
export interface SplitPaneProperties {
  first?: MpChild;
  second?: MpChild;
  divider?: MpChild;
  primary?: MpChild;
  secondary?: MpChild;
  direction?: SplitPaneDirection;
  initialSize?: number | string;
  minSize?: number;
  maxSize?: number;
  min?: number;
  max?: number;
  resizable?: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
  onResize?: (size: number) => void;
}

export function ForgeSplitPane(properties: Readonly<SplitPaneProperties>): MpElement {
  const direction = properties.direction ?? 'horizontal';
  const minSize = Math.max(0, Math.min(100, properties.minSize ?? properties.min ?? 20));
  const maxSize = Math.max(minSize, Math.min(100, properties.maxSize ?? properties.max ?? 80));
  const initialValue = properties.initialSize ?? '50%';
  const initialSize = typeof initialValue === 'string' ? Number.parseFloat(initialValue) : initialValue;
  const resizable = properties.resizable ?? true;
  const { primaryLabel = 'Primary pane', secondaryLabel = 'Secondary pane' } = properties;
  const [size, setSize] = useState(Math.min(maxSize, Math.max(minSize, initialSize)));
  const updateSize = (next: number): void => {
    if (!resizable) return;
    const value = Math.min(maxSize, Math.max(minSize, next));
    setSize(value);
    properties.onResize?.(value);
  };
  const onKeyDown = (event: unknown): void => {
    const key = (event as { key: string }).key;
    switch (key) {
      case 'ArrowLeft':
      case 'ArrowUp': {
        if ((direction === 'horizontal' && key === 'ArrowLeft') || (direction === 'vertical' && key === 'ArrowUp'))
          updateSize(size - 5);
        break;
      }
      case 'ArrowRight':
      case 'ArrowDown': {
        if ((direction === 'horizontal' && key === 'ArrowRight') || (direction === 'vertical' && key === 'ArrowDown'))
          updateSize(size + 5);
        break;
      }
      case 'Home': {
        updateSize(minSize);
        break;
      }
      case 'End': {
        updateSize(maxSize);
        break;
      }
    }
  };
  const firstContent = properties.first ?? properties.primary;
  const secondContent = properties.second ?? properties.secondary;
  return (
    <div className={[styles['forge-split-pane'], styles[`forge-split-pane--${direction}`]]}>
      <section
        className={styles['forge-split-pane__primary']}
        style={{ flexBasis: `${size}%` }}
        aria-label={primaryLabel}
      >
        <Slot name="first">{firstContent}</Slot>
      </section>
      <div
        className={styles['forge-split-pane__separator']}
        role="separator"
        tabIndex={resizable ? 0 : -1}
        aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        aria-valuenow={size}
        aria-label="Resize panes"
        aria-disabled={!resizable}
        onKeydown={onKeyDown}
      />
      <section
        className={styles['forge-split-pane__secondary']}
        style={{ flexBasis: `${100 - size}%` }}
        aria-label={secondaryLabel}
      >
        <Slot name="second">{secondContent}</Slot>
      </section>
    </div>
  );
}
