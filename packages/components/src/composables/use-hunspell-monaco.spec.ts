import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, ref } from 'vue';

import { useHunspellMonaco } from './use-hunspell-monaco';

import type * as monaco from 'monaco-editor';
import type { Ref } from 'vue';

// ── Monaco mock ───────────────────────────────────────────────────────────────

const {
  mockSetModelMarkers,
  mockOnDidChangeModelContent,
  mockModel,
  mockEditorInstance,
  onDidChangeModelContentListeners,
  MarkerSeverity,
  mockRegisterCodeActionProvider,
} = vi.hoisted(() => {
  const onDidChangeModelContentListeners: Array<() => void> = [];

  const mockGetPositionAt = vi.fn((offset: number) => ({
    lineNumber: 1,
    column: offset + 1,
  }));

  const mockGetValue = vi.fn(() => 'hello wrold');

  const mockModel = {
    getPositionAt: mockGetPositionAt,
    getValue: mockGetValue,
    uri: 'file:///test.txt',
    getVersionId: vi.fn(() => 1),
  };

  const mockSetModelMarkers = vi.fn();
  const mockRegisterCodeActionProvider = vi.fn(() => ({ dispose: vi.fn() }));

  const mockOnDidChangeModelContent = vi.fn((callback: () => void) => {
    onDidChangeModelContentListeners.push(callback);
    return { dispose: vi.fn() };
  });

  const mockEditorInstance = {
    getModel: vi.fn(() => mockModel),
    onDidChangeModelContent: mockOnDidChangeModelContent,
  };

  const MarkerSeverity = { Warning: 4 };

  return {
    mockSetModelMarkers,
    mockOnDidChangeModelContent,
    mockModel,
    mockEditorInstance,
    onDidChangeModelContentListeners,
    MarkerSeverity,
    mockRegisterCodeActionProvider,
  };
});

vi.mock('monaco-editor', () => ({
  editor: {
    setModelMarkers: mockSetModelMarkers,
  },
  languages: {
    registerCodeActionProvider: mockRegisterCodeActionProvider,
  },
  Range: function (startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number) {
    return {
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
      intersectRanges() {
        return true;
      },
    };
  },
  MarkerSeverity,
}));

// ── Worker mock ───────────────────────────────────────────────────────────────
//
// MockWorker must be defined inside vi.hoisted() so it is available at the
// point where vi.mock factories are executed (which are hoisted to the top of
// the module by Vitest's transform before any other declarations).

const {
  MockWorker,
  mockWorkerTerminate,
  mockWorkerPostMessage,
  getWorkerMessageListeners,
  resetWorkerMessageListeners,
} = vi.hoisted(() => {
  const mockWorkerTerminate = vi.fn();
  const mockWorkerPostMessage = vi.fn();
  let listeners: Array<(event_: MessageEvent) => void> = [];

  function MockWorker() {
    return {
      terminate: mockWorkerTerminate,
      postMessage: mockWorkerPostMessage,
      addEventListener(_event: string, listener: (event_: MessageEvent) => void): void {
        listeners.push(listener);
      },
    };
  }

  return {
    MockWorker,
    mockWorkerTerminate,
    mockWorkerPostMessage,
    getWorkerMessageListeners: () => listeners,
    resetWorkerMessageListeners: () => {
      listeners = [];
    },
  };
});

// Stub window.HunspellEnvironment so the composable's getWorker() call returns MockWorker.
// This mirrors how apps configure the Hunspell worker in their main.ts entry point,
// analogous to window.MonacoEnvironment for Monaco language workers.
vi.stubGlobal('HunspellEnvironment', { getWorker: () => MockWorker() });

// ── Helper: create a test component that calls useHunspellMonaco ──────────────

function makeComponent(
  editorValue: typeof mockEditorInstance | null,
  enabledValue: boolean,
  languageValue = 'plaintext',
) {
  return defineComponent({
    setup() {
      const editorReference = ref(editorValue) as unknown as Ref<monaco.editor.IStandaloneCodeEditor | undefined>;
      const enabled = computed(() => enabledValue);
      const language = computed(() => languageValue);
      useHunspellMonaco(editorReference, enabled, language);
      return {};
    },
    template: '<div />',
  });
}

describe('useHunspellMonaco', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onDidChangeModelContentListeners.length = 0;
    resetWorkerMessageListeners();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when disabled', () => {
    it('does not create a Worker when enabled is false', () => {
      mount(makeComponent(mockEditorInstance as never, false));
      expect(mockWorkerPostMessage).not.toHaveBeenCalled();
      expect(mockOnDidChangeModelContent).not.toHaveBeenCalled();
    });

    it('does not set any markers when disabled', () => {
      mount(makeComponent(mockEditorInstance as never, false));
      expect(mockSetModelMarkers).not.toHaveBeenCalled();
    });
  });

  describe('when enabled', () => {
    it('registers a content-change listener when enabled is true', () => {
      mount(makeComponent(mockEditorInstance as never, true));
      expect(mockOnDidChangeModelContent).toHaveBeenCalledOnce();
    });

    it('registers a code action provider when enabled is true', () => {
      mount(makeComponent(mockEditorInstance as never, true));
      expect(mockRegisterCodeActionProvider).toHaveBeenCalledOnce();
    });

    it('posts a message to the worker on initial check', async () => {
      vi.useFakeTimers();
      mount(makeComponent(mockEditorInstance as never, true));
      vi.runAllTimers();
      expect(mockWorkerPostMessage).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello wrold' }));
      vi.useRealTimers();
    });

    it('debounces content-change messages by 300 ms', async () => {
      vi.useFakeTimers();
      mount(makeComponent(mockEditorInstance as never, true));

      // Flush initial debounced call
      vi.runAllTimers();
      mockWorkerPostMessage.mockClear();

      // Simulate rapid content changes
      for (const callback of onDidChangeModelContentListeners) callback();
      for (const callback of onDidChangeModelContentListeners) callback();
      for (const callback of onDidChangeModelContentListeners) callback();

      // Should NOT have posted yet
      expect(mockWorkerPostMessage).not.toHaveBeenCalled();

      vi.runAllTimers();

      // Should have posted exactly once after debounce
      expect(mockWorkerPostMessage).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });

    it('maps worker issues to Monaco warning markers', () => {
      mount(makeComponent(mockEditorInstance as never, true));

      const issue = { text: 'wrold', offset: 6, length: 5, suggestions: ['world', 'word'] };
      for (const listener of getWorkerMessageListeners()) listener(new MessageEvent('message', { data: [issue] }));

      expect(mockSetModelMarkers).toHaveBeenCalledWith(
        mockModel,
        'hunspell',
        expect.arrayContaining([
          expect.objectContaining({
            severity: MarkerSeverity.Warning,
            message: 'Unknown word: wrold',
            source: 'hunspell',
          }),
        ]),
      );
    });

    it('clears markers when worker returns no issues', () => {
      mount(makeComponent(mockEditorInstance as never, true));

      for (const listener of getWorkerMessageListeners()) listener(new MessageEvent('message', { data: [] }));

      expect(mockSetModelMarkers).toHaveBeenCalledWith(mockModel, 'hunspell', []);
    });
  });

  describe('cleanup on unmount', () => {
    it('terminates the worker on unmount', () => {
      const wrapper = mount(makeComponent(mockEditorInstance as never, true));
      wrapper.unmount();
      expect(mockWorkerTerminate).toHaveBeenCalledOnce();
    });

    it('clears hunspell markers on unmount', () => {
      const wrapper = mount(makeComponent(mockEditorInstance as never, true));
      mockSetModelMarkers.mockClear();
      wrapper.unmount();
      expect(mockSetModelMarkers).toHaveBeenCalledWith(mockModel, 'hunspell', []);
    });

    it('disposes the code action provider on unmount', () => {
      const disposeSpy = vi.fn();
      mockRegisterCodeActionProvider.mockReturnValue({ dispose: disposeSpy });
      const wrapper = mount(makeComponent(mockEditorInstance as never, true));
      wrapper.unmount();
      expect(disposeSpy).toHaveBeenCalledOnce();
    });

    it('does not terminate a worker when none was created', () => {
      const wrapper = mount(makeComponent(mockEditorInstance as never, false));
      wrapper.unmount();
      expect(mockWorkerTerminate).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('does nothing when editorRef is null', () => {
      expect(() => mount(makeComponent(undefined as never, true))).not.toThrow();
      expect(mockOnDidChangeModelContent).not.toHaveBeenCalled();
    });
  });
});
