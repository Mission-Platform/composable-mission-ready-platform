import { createCanvas2dCapabilities } from './canvas2d-pass';
import { dispatchWorkerInputMessage, isWorkerMessageIgnored, postReply } from './message-handlers';
import { getFlintRenderWorkerWasm } from './wasm';
import { createWebGLCapabilities } from './webgl-pass';
import { createWebGpuCapabilities } from './webgpu-pass';
import { createRenderWorkerState } from './worker-state';

import type { RenderWorkerInputMessage, RenderWorkerOutputMessage } from './types';

export * from './types';
export * from './constants';
export * from './camera';
export * from './color';
export * from './wasm';
export * from './worker-state';
export * from './webgpu-pass';
export * from './webgl-pass';
export * from './canvas2d-pass';
export * from './message-handlers';

// Dedicated OffscreenCanvas Web Worker message listener
if (globalThis.self !== undefined) {
  const state = createRenderWorkerState();
  const capabilities: WebAssembly.Imports = {
    ...createWebGpuCapabilities(state),
    ...createWebGLCapabilities(state),
    ...createCanvas2dCapabilities(state),
  };

  globalThis.self.addEventListener('message', async (event: MessageEvent<RenderWorkerInputMessage>) => {
    const msg = event.data;
    if (isWorkerMessageIgnored(msg)) return;
    if (!state.wasm) state.wasm = getFlintRenderWorkerWasm(capabilities);

    try {
      await dispatchWorkerInputMessage(state, msg);
    } catch (error) {
      postReply({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      } as RenderWorkerOutputMessage);
    }
  });
}
