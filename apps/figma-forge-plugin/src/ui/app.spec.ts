import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick, type App as VueApp } from 'vue';

import App from './App.vue';
import { FORGE_FIGMA_UI_ORIGIN, isValidRequestId, type ForgePluginMainMessage } from './messages';

import type { ForgeExportBundle } from '@mission-platform/forge-figma';

const sampleBundle: ForgeExportBundle = {
  componentName: 'SampleCard',
  files: [
    { path: 'sample-card.tsx', kind: 'tsx', content: 'export const SampleCard = () => null;' },
    { path: 'sample-card.module.scss', kind: 'scss', content: '.sample-card { display: flex; }' },
  ],
  diagnostics: [],
};

function postFigmaMessage(message: ForgePluginMainMessage): void {
  globalThis.dispatchEvent(
    new MessageEvent('message', {
      data: { pluginMessage: message },
      origin: FORGE_FIGMA_UI_ORIGIN,
      source: globalThis.parent,
    }),
  );
}

describe('Figma Forge Plugin UI (App.vue)', () => {
  let app: VueApp | undefined;
  let container: HTMLDivElement;
  let postMessageSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postMessageSpy = vi.fn();
    globalThis.parent = { postMessage: postMessageSpy } as unknown as WindowProxy;
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    app?.unmount();
    container.remove();
    vi.restoreAllMocks();
  });

  function mountApp() {
    app = createApp(App);
    const vm = app.mount(container);
    return { vm, container };
  }

  it('attaches a unique requestId to convert messages and ignores mismatched conversion results', async () => {
    mountApp();
    await nextTick();

    // Set selection to 1 layer
    postFigmaMessage({ type: 'selection-status', selectionCount: 1 });
    await nextTick();

    const convertButton = container.querySelector<HTMLButtonElement>('.conversion-panel button');
    expect(convertButton).toBeDefined();
    expect(convertButton?.disabled).toBe(false);

    // Click convert
    convertButton?.click();
    await nextTick();

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        pluginMessage: expect.objectContaining({
          type: 'convert',
          requestId: expect.any(String),
        }),
      },
      FORGE_FIGMA_UI_ORIGIN,
    );

    const convertCall = postMessageSpy.mock.calls.find(
      (call) => (call[0] as { pluginMessage: { type: string } }).pluginMessage.type === 'convert',
    );
    const sentRequestId = (convertCall?.[0] as { pluginMessage: { requestId: string } }).pluginMessage.requestId;
    expect(isValidRequestId(sentRequestId)).toBe(true);

    // Simulate an out-of-order / stale conversion-result with an old/mismatched requestId
    postFigmaMessage({
      type: 'conversion-result',
      requestId: 'stale-old-request-id',
      bundle: sampleBundle,
    });
    await nextTick();

    // The stale bundle should NOT be rendered
    expect(container.querySelector('.bundle-panel')).toBeNull();

    // Now send the response with the matching requestId
    postFigmaMessage({
      type: 'conversion-result',
      requestId: sentRequestId,
      bundle: sampleBundle,
    });
    await nextTick();

    // The bundle panel should now be displayed
    expect(container.querySelector('.bundle-panel')).not.toBeNull();
    expect(container.querySelector('.bundle-panel h2')?.textContent).toBe('SampleCard');
    expect(container.querySelector('.status')?.textContent).toContain('Generated 2 artifacts.');
  });

  it('invalidates and clears active bundle when selection changes or selection count !== 1', async () => {
    mountApp();
    await nextTick();

    // Selection = 1
    postFigmaMessage({ type: 'selection-status', selectionCount: 1 });
    await nextTick();

    // Convert
    const convertButton = container.querySelector<HTMLButtonElement>('.conversion-panel button');
    convertButton?.click();
    await nextTick();

    const convertCall = postMessageSpy.mock.calls.find(
      (call) => (call[0] as { pluginMessage: { type: string } }).pluginMessage.type === 'convert',
    );
    const sentRequestId = (convertCall?.[0] as { pluginMessage: { requestId: string } }).pluginMessage.requestId;

    // Conversion succeeds
    postFigmaMessage({
      type: 'conversion-result',
      requestId: sentRequestId,
      bundle: sampleBundle,
    });
    await nextTick();
    expect(container.querySelector('.bundle-panel')).not.toBeNull();

    // User changes selection to 2 layers
    postFigmaMessage({ type: 'selection-status', selectionCount: 2 });
    await nextTick();

    // Active bundle must be completely cleared and export disabled
    expect(container.querySelector('.bundle-panel')).toBeNull();
    expect(container.querySelector('.status')?.textContent).toBe('Select only one layer.');

    // User deselects all layers
    postFigmaMessage({ type: 'selection-status', selectionCount: 0 });
    await nextTick();
    expect(container.querySelector('.bundle-panel')).toBeNull();
    expect(container.querySelector('.status')?.textContent).toBe('Select one frame or component to begin.');

    // User selects another single layer (selectionCount = 1) -> bundle remains cleared
    postFigmaMessage({ type: 'selection-status', selectionCount: 1 });
    await nextTick();
    expect(container.querySelector('.bundle-panel')).toBeNull();
    expect(container.querySelector('.status')?.textContent).toBe('Ready to convert selection.');
  });

  it('cancels in-flight conversion when selection changes and rejects delayed result', async () => {
    mountApp();
    await nextTick();

    postFigmaMessage({ type: 'selection-status', selectionCount: 1 });
    await nextTick();

    const convertButton = container.querySelector<HTMLButtonElement>('.conversion-panel button');
    convertButton?.click();
    await nextTick();

    const convertCall = postMessageSpy.mock.calls.find(
      (call) => (call[0] as { pluginMessage: { type: string } }).pluginMessage.type === 'convert',
    );
    const sentRequestId = (convertCall?.[0] as { pluginMessage: { requestId: string } }).pluginMessage.requestId;

    // While conversion is in flight, selection changes
    postFigmaMessage({ type: 'selection-status', selectionCount: 1 });
    await nextTick();

    // Now the delayed response for the first conversion arrives
    postFigmaMessage({
      type: 'conversion-result',
      requestId: sentRequestId,
      bundle: sampleBundle,
    });
    await nextTick();

    // Should be rejected because currentRequestId was cleared on selection change
    expect(container.querySelector('.bundle-panel')).toBeNull();
  });

  it('handles bridge export failure and timeout cleanly without freezing UI', async () => {
    // Provide valid bridge config
    mountApp();
    await nextTick();

    postFigmaMessage({
      type: 'bridge-config',
      config: {
        bridgeUrl: 'http://127.0.0.1:8787/export',
        authToken: 'auth-token',
        repositoryRootId: 'repo-root',
        targetDirectory: 'src/components',
      },
    });
    postFigmaMessage({ type: 'selection-status', selectionCount: 1 });
    await nextTick();

    const convertButton = container.querySelector<HTMLButtonElement>('.conversion-panel button');
    convertButton?.click();
    await nextTick();

    const convertCall = postMessageSpy.mock.calls.find(
      (call) => (call[0] as { pluginMessage: { type: string } }).pluginMessage.type === 'convert',
    );
    const sentRequestId = (convertCall?.[0] as { pluginMessage: { requestId: string } }).pluginMessage.requestId;

    postFigmaMessage({
      type: 'conversion-result',
      requestId: sentRequestId,
      bundle: sampleBundle,
    });
    await nextTick();

    const exportButton = container.querySelector<HTMLButtonElement>('.bridge-actions button:not(.secondary)');
    expect(exportButton).toBeDefined();
    expect(exportButton?.disabled).toBe(false);

    // Mock confirm dialog
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

    // Mock fetch with timeout failure
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      const error = new DOMException('The operation was aborted.', 'TimeoutError');
      throw error;
    });

    exportButton?.click();
    await nextTick();

    // Wait for export failure handling
    await new Promise((resolve) => setTimeout(resolve, 50));
    await nextTick();

    // UI should reset isExporting and display error status
    expect(exportButton?.disabled).toBe(false);
    expect(container.querySelector('.status')?.textContent).toContain('timed out');
  });
});
