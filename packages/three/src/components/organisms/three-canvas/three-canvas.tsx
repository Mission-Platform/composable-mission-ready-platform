import { h, type MpElement, type MpProperties, useRef } from '@mission-platform/forge';

import { type ThreeContext, useThree } from '../../../composables/use-three/use-three';

export interface BaseThreeCanvasProperties extends MpProperties {
  /** Callback invoked when the Three.js context is ready. */
  onReady?: (context: ThreeContext) => void | (() => void);
}

/**
 * BaseThreeCanvas — a framework-neutral component that renders a <canvas>
 * and manages a Three.js WebGL context via `useThree`.
 */
export function BaseThreeCanvas(properties: Readonly<BaseThreeCanvasProperties>): MpElement {
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
