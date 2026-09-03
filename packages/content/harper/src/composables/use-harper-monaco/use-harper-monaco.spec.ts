import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, ref } from 'vue';

import { useHarperMonaco } from './use-harper-monaco';

import type * as monaco from 'monaco-editor';

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

  const MarkerSeverity = { Error: 8, Warning: 4, Info: 2, Hint: 1 };

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

vi.stubGlobal('HarperEnvironment', { getWorker: () => MockWorker() });

// ── Helper: create a test component that calls useHarperMonaco ────────────────

function makeComponent(
  editorValue: typeof mockEditorInstance | null,
  enabledValue: boolean,
  languageValue = 'plaintext',
) {
  return defineComponent({
    setup() {
      const editorReference = ref(editorValue) as unknown as ReturnType<
        typeof ref<monaco.editor.IStandaloneCodeEditor | undefined>
      >;
      const enabled = computed(() => enabledValue);
      const language = computed(() => languageValue);
      useHarperMonaco(editorReference, enabled, language);
      return {};
    },
    template: '<div />',
  });
}

describe('useHarperMonaco', () => {
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
    it('registers a content-change listener when enabled is true', async () => {
      mount(makeComponent(mockEditorInstance as never, true));
      // The Monaco runtime is now loaded via a lazy dynamic import, so the
      // attach happens on a microtask after mount — flush it before asserting.
      await flushPromises();
      expect(mockOnDidChangeModelContent).toHaveBeenCalledOnce();
    });

    it('registers a code action provider when enabled is true', async () => {
      mount(makeComponent(mockEditorInstance as never, true));
      await flushPromises();
      expect(mockRegisterCodeActionProvider).toHaveBeenCalledOnce();
    });

    it('posts a message to the worker on initial check', async () => {
      vi.useFakeTimers();
      mount(makeComponent(mockEditorInstance as never, true));
      // `runAllTimersAsync` flushes the lazy-import microtask (which performs
      // the attach) as well as the debounce timer.
      await vi.runAllTimersAsync();
      expect(mockWorkerPostMessage).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello wrold' }));
      vi.useRealTimers();
    });

    it('debounces content-change messages by 300 ms', async () => {
      vi.useFakeTimers();
      mount(makeComponent(mockEditorInstance as never, true));

      await vi.runAllTimersAsync();
      mockWorkerPostMessage.mockClear();

      for (const callback of onDidChangeModelContentListeners) callback();
      for (const callback of onDidChangeModelContentListeners) callback();
      for (const callback of onDidChangeModelContentListeners) callback();

      expect(mockWorkerPostMessage).not.toHaveBeenCalled();

      vi.runAllTimers();

      expect(mockWorkerPostMessage).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });

    it('maps LSP warning severity to Monaco Warning markers', async () => {
      mount(makeComponent(mockEditorInstance as never, true));
      await flushPromises();

      const issue = {
        text: 'wrold',
        offset: 6,
        length: 5,
        message: 'Possible spelling mistake',
        ruleId: 'harper/SpellCheck',
        severity: 2 as const,
        suggestions: ['world', 'word'],
      };
      for (const listener of getWorkerMessageListeners()) listener(new MessageEvent('message', { data: [issue] }));

      expect(mockSetModelMarkers).toHaveBeenCalledWith(
        mockModel,
        'harper',
        expect.arrayContaining([
          expect.objectContaining({
            severity: MarkerSeverity.Warning,
            message: 'Possible spelling mistake',
            source: 'harper(harper/SpellCheck)',
          }),
        ]),
      );
    });

    it('maps LSP error severity to Monaco Error markers', async () => {
      mount(makeComponent(mockEditorInstance as never, true));
      await flushPromises();

      const issue = {
        text: 'wrold',
        offset: 6,
        length: 5,
        message: 'Grammar error',
        ruleId: 'harper/GrammarCheck',
        severity: 1 as const,
        suggestions: [],
      };
      for (const listener of getWorkerMessageListeners()) listener(new MessageEvent('message', { data: [issue] }));

      expect(mockSetModelMarkers).toHaveBeenCalledWith(
        mockModel,
        'harper',
        expect.arrayContaining([
          expect.objectContaining({
            severity: MarkerSeverity.Error,
            message: 'Grammar error',
          }),
        ]),
      );
    });

    it('clears markers when worker returns no issues', async () => {
      mount(makeComponent(mockEditorInstance as never, true));
      await flushPromises();

      for (const listener of getWorkerMessageListeners()) listener(new MessageEvent('message', { data: [] }));

      expect(mockSetModelMarkers).toHaveBeenCalledWith(mockModel, 'harper', []);
    });
  });

  describe('cleanup on unmount', () => {
    it('terminates the worker on unmount', async () => {
      const wrapper = mount(makeComponent(mockEditorInstance as never, true));
      await flushPromises();
      wrapper.unmount();
      expect(mockWorkerTerminate).toHaveBeenCalledOnce();
    });

    it('clears harper markers on unmount', async () => {
      const wrapper = mount(makeComponent(mockEditorInstance as never, true));
      await flushPromises();
      mockSetModelMarkers.mockClear();
      wrapper.unmount();
      expect(mockSetModelMarkers).toHaveBeenCalledWith(mockModel, 'harper', []);
    });

    it('disposes the code action provider on unmount', async () => {
      const disposeSpy = vi.fn();
      mockRegisterCodeActionProvider.mockReturnValue({ dispose: disposeSpy });
      const wrapper = mount(makeComponent(mockEditorInstance as never, true));
      await flushPromises();
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
    it('does nothing when editorRef is undefined', () => {
      expect(() => mount(makeComponent(undefined as never, true))).not.toThrow();
      expect(mockOnDidChangeModelContent).not.toHaveBeenCalled();
    });
  });
});
