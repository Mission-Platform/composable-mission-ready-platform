import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMonacoMock, createWorkerMock } from '../test-support/monaco-mock';

import { attachMonacoWorkerIssueProvider, type MonacoWorkerIssue } from './worker-issue-bridge';

describe('attachMonacoWorkerIssueProvider', () => {
  let monacoMock: ReturnType<typeof createMonacoMock>;
  let workerMock: ReturnType<typeof createWorkerMock>;

  beforeEach(() => {
    vi.useFakeTimers();
    monacoMock = createMonacoMock('sample text with misspelling');
    workerMock = createWorkerMock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('instantiates worker and posts initial model text after debounce', () => {
    const handle = attachMonacoWorkerIssueProvider({
      editor: monacoMock.mockEditorInstance as never,
      monacoRuntime: monacoMock.monacoMockModule as never,
      markerOwner: 'test-linter',
      workerFactory: () => new workerMock.MockWorker() as never,
    });

    expect(workerMock.mockWorkerPostMessage).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(workerMock.mockWorkerPostMessage).toHaveBeenCalledWith({
      text: 'sample text with misspelling',
    });

    handle.dispose();
    expect(workerMock.mockWorkerTerminate).toHaveBeenCalled();
  });

  it('maps worker issues to markers and sets them on editor model', () => {
    const handle = attachMonacoWorkerIssueProvider<MonacoWorkerIssue>({
      editor: monacoMock.mockEditorInstance as never,
      monacoRuntime: monacoMock.monacoMockModule as never,
      markerOwner: 'spellcheck',
      workerFactory: () => new workerMock.MockWorker() as never,
    });

    const listeners = workerMock.getWorkerMessageListeners();
    expect(listeners.length).toBeGreaterThan(0);

    const issues: MonacoWorkerIssue[] = [
      {
        offset: 7,
        length: 4,
        text: 'text',
        suggestions: ['test', 'tent'],
      },
    ];

    listeners[0]?.({ data: issues } as MessageEvent);

    expect(monacoMock.mockSetModelMarkers).toHaveBeenCalledWith(
      monacoMock.mockModel,
      'spellcheck',
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Unknown word: text',
          source: 'spellcheck',
        }),
      ]),
    );

    handle.dispose();
  });

  it('registers code action provider and generates quick-fix actions', () => {
    let registeredProvider:
      | {
          provideCodeActions: (
            model: unknown,
            range: unknown,
          ) => {
            actions: Array<{ title: string; kind: string }>;
          };
        }
      | undefined;

    monacoMock.monacoMockModule.languages.registerCodeActionProvider.mockImplementation(
      (_lang: string, provider: typeof registeredProvider) => {
        registeredProvider = provider;
        return { dispose: vi.fn() };
      },
    );

    const handle = attachMonacoWorkerIssueProvider<MonacoWorkerIssue>({
      editor: monacoMock.mockEditorInstance as never,
      monacoRuntime: monacoMock.monacoMockModule as never,
      markerOwner: 'grammar',
      workerFactory: () => new workerMock.MockWorker() as never,
    });

    const listeners = workerMock.getWorkerMessageListeners();
    listeners[0]?.({
      data: [
        {
          offset: 0,
          length: 6,
          message: 'Possible typo',
          suggestions: ['Sample', 'Simple'],
        },
      ],
    } as MessageEvent);

    expect(registeredProvider).toBeDefined();
    const result = registeredProvider?.provideCodeActions(
      monacoMock.mockModel,
      new (monacoMock.monacoMockModule.Range as never)(1, 1, 1, 10),
    );

    expect(result?.actions).toHaveLength(2);
    expect(result?.actions[0]?.title).toBe('Change to "Sample"');
    expect(result?.actions[0]?.kind).toBe('quickfix');

    handle.dispose();
  });
});
