import { vi } from 'vitest';

export interface MonacoMockState {
  mockSetModelMarkers: ReturnType<typeof vi.fn>;
  mockOnDidChangeModelContent: ReturnType<typeof vi.fn>;
  mockModel: {
    getPositionAt: ReturnType<typeof vi.fn>;
    getValue: ReturnType<typeof vi.fn>;
    uri: string;
    getVersionId: ReturnType<typeof vi.fn>;
  };
  mockEditorInstance: {
    getModel: ReturnType<typeof vi.fn>;
    onDidChangeModelContent: ReturnType<typeof vi.fn>;
  };
  mockGetPositionAt: ReturnType<typeof vi.fn>;
  mockGetValue: ReturnType<typeof vi.fn>;
  onDidChangeModelContentListeners: Array<() => void>;
  MarkerSeverity: { Error: number; Warning: number; Info: number; Hint: number };
  mockRegisterCodeActionProvider: ReturnType<typeof vi.fn>;
  monacoMockModule: {
    editor: {
      setModelMarkers: ReturnType<typeof vi.fn>;
    };
    languages: {
      registerCodeActionProvider: ReturnType<typeof vi.fn>;
    };
    Range: new (
      startLineNumber: number,
      startColumn: number,
      endLineNumber: number,
      endColumn: number,
    ) => {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
      intersectRanges(): boolean;
    };
    MarkerSeverity: { Error: number; Warning: number; Info: number; Hint: number };
  };
}

export function createMonacoMock(initialValue = 'hello wrold'): MonacoMockState {
  const onDidChangeModelContentListeners: Array<() => void> = [];

  const mockGetPositionAt = vi.fn((offset: number) => ({
    lineNumber: 1,
    column: offset + 1,
  }));

  const mockGetValue = vi.fn(() => initialValue);

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

  class MockRange {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;

    constructor(startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number) {
      this.startLineNumber = startLineNumber;
      this.startColumn = startColumn;
      this.endLineNumber = endLineNumber;
      this.endColumn = endColumn;
    }

    intersectRanges(): boolean {
      return true;
    }
  }

  const monacoMockModule = {
    editor: {
      setModelMarkers: mockSetModelMarkers,
    },
    languages: {
      registerCodeActionProvider: mockRegisterCodeActionProvider,
    },
    Range: MockRange,
    MarkerSeverity,
  };

  return {
    mockSetModelMarkers,
    mockOnDidChangeModelContent,
    mockModel,
    mockEditorInstance,
    mockGetPositionAt,
    mockGetValue,
    onDidChangeModelContentListeners,
    MarkerSeverity,
    mockRegisterCodeActionProvider,
    monacoMockModule,
  };
}

export interface WorkerMockInstance {
  terminate: ReturnType<typeof vi.fn>;
  postMessage: ReturnType<typeof vi.fn>;
  addEventListener: (_event: string, listener: (event_: MessageEvent) => void) => void;
}

export interface WorkerMockState {
  MockWorker: (() => WorkerMockInstance) & (new () => WorkerMockInstance);
  mockWorkerTerminate: ReturnType<typeof vi.fn>;
  mockWorkerPostMessage: ReturnType<typeof vi.fn>;
  getWorkerMessageListeners: () => Array<(event_: MessageEvent) => void>;
  resetWorkerMessageListeners: () => void;
}

export function createWorkerMock(): WorkerMockState {
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
    MockWorker: MockWorker as unknown as WorkerMockState['MockWorker'],
    mockWorkerTerminate,
    mockWorkerPostMessage,
    getWorkerMessageListeners: () => listeners,
    resetWorkerMessageListeners: () => {
      listeners = [];
    },
  };
}
