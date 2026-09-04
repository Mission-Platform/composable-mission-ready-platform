import { type MpElement, useRef } from '@mission-platform/forge-jsx';

import { type ThreeContext, useThree } from '@/composables/use-three';

export interface ForgeThreeCanvasProperties {
  /** Callback invoked when the Three.js context is ready. */
  onReady?: (context: ThreeContext) => void | (() => void);
}

/**
 * ForgeThreeCanvas — a framework-neutral component that renders a <canvas>
 * and manages a Three.js WebGL context via `useThree`.
 */
export function ForgeThreeCanvas(properties: Readonly<ForgeThreeCanvasProperties>): MpElement {
  const canvasReference = useRef<HTMLCanvasElement | null>(null);

  useThree(canvasReference, properties.onReady);

  return (
    <canvas
      ref={canvasReference}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}
