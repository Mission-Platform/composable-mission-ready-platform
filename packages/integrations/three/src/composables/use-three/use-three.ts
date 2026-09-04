import { type MpRef, useEffect } from '@mission-platform/forge-jsx';
import * as THREE from 'three';

type ReferenceLike<T> = MpRef<T> | Readonly<{ value: T }>;

function referenceValue<T>(reference: ReferenceLike<T>): T {
  return 'current' in reference ? reference.current : reference.value;
}

export interface ThreeContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

/**
 * Framework-neutral Three.js hook.
 * Creates and owns a WebGLRenderer, Scene, and Camera bound to a canvas ref.
 *
 * SSR-safe: no-op when the browser API or canvas is unavailable.
 * Automatic cleanup: disposes the renderer and cancels the animation frame on unmount.
 */
export function useThree(
  canvasReference: ReferenceLike<HTMLCanvasElement | null>,
  onReady?: (context: ThreeContext) => void | (() => void),
): void {
  useEffect(() => {
    const canvas = referenceValue(canvasReference);
    if (globalThis.window === undefined || !canvas) {
      return;
    }
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const cleanup = onReady?.({ renderer, scene, camera });

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      cleanup?.();
      renderer.dispose();
      scene.clear();
    };
  }, [canvasReference, onReady]);
}
