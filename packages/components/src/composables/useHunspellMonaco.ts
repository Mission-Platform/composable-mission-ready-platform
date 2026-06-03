import * as monaco from 'monaco-editor'
import { onBeforeUnmount, type Ref, watch } from 'vue'

/**
 * Applications must configure a Hunspell worker factory on
 * `window.HunspellEnvironment` before using spell-check, similar to the
 * `window.MonacoEnvironment` pattern used to configure Monaco language workers.
 *
 * @example
 * // In your app's main.ts:
 * import HunspellWorker from '@mission-platform/hunspell/worker?worker'
 *
 * window.HunspellEnvironment = {
 *   getWorker: () => new HunspellWorker(),
 * }
 */
declare global {
  interface Window {
    HunspellEnvironment?: {
      getWorker: () => Worker
    }
  }
}

type SpellIssue = {
  text: string
  offset: number
  length: number
  suggestions: string[]
}

function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: T) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function useHunspellMonaco(
  editorRef: Ref<monaco.editor.IStandaloneCodeEditor | null>,
  enabled: Ref<boolean>,
  languageRef: Ref<string>,
): void {
  let worker: Worker | null = null
  let contentListener: monaco.IDisposable | null = null
  let codeActionProvider: monaco.IDisposable | null = null

  // Stores the latest issues so the code action provider can look up suggestions
  let latestIssues: SpellIssue[] = []

  function clearMarkers(): void {
    const model = editorRef.value?.getModel()
    if (model) {
      monaco.editor.setModelMarkers(model, 'hunspell', [])
    }
  }

  function teardown(): void {
    contentListener?.dispose()
    contentListener = null
    codeActionProvider?.dispose()
    codeActionProvider = null
    latestIssues = []
    if (worker) {
      clearMarkers()
      worker.terminate()
      worker = null
    }
  }

  const sendToWorker = debounce(() => {
    if (!worker || !editorRef.value) return
    const model = editorRef.value.getModel()
    if (!model) return
    worker.postMessage({ text: model.getValue() })
  }, 300)

  function setup(): void {
    if (!editorRef.value) return

    if (!window.HunspellEnvironment?.getWorker) {
      console.warn(
        '[useHunspellMonaco] window.HunspellEnvironment.getWorker is not configured. ' +
          'Set window.HunspellEnvironment = { getWorker: () => new HunspellWorker() } in your app entry.',
      )
      return
    }

    worker = window.HunspellEnvironment.getWorker()

    worker.addEventListener('message', (e: MessageEvent<SpellIssue[]>) => {
      const model = editorRef.value?.getModel()
      if (!model) return

      latestIssues = e.data

      const markers: monaco.editor.IMarkerData[] = e.data.map((issue) => {
        const startPos = model.getPositionAt(issue.offset)
        const wordLength = issue.length
        const endPos = model.getPositionAt(issue.offset + wordLength)
        return {
          severity: monaco.MarkerSeverity.Warning,
          message: `Unknown word: ${issue.text}`,
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
          source: 'hunspell',
        }
      })

      monaco.editor.setModelMarkers(model, 'hunspell', markers)
    })

    contentListener = editorRef.value.onDidChangeModelContent(sendToWorker)

    // Register a code action provider to show spelling suggestions as quick fixes.
    // We register per language so Monaco shows the lightbulb on hunspell markers.
    const language = languageRef.value || 'plaintext'
    codeActionProvider = monaco.languages.registerCodeActionProvider(language, {
      provideCodeActions(model, range) {
        const actions: monaco.languages.CodeAction[] = []

        for (const issue of latestIssues) {
          const startPos = model.getPositionAt(issue.offset)
          const endPos = model.getPositionAt(issue.offset + issue.length)
          const issueRange = new monaco.Range(
            startPos.lineNumber,
            startPos.column,
            endPos.lineNumber,
            endPos.column,
          )

          if (!issueRange.intersectRanges(range)) continue

          for (const suggestion of issue.suggestions) {
            actions.push({
              title: `Change to "${suggestion}"`,
              kind: 'quickfix',
              diagnostics: [],
              edit: {
                edits: [
                  {
                    resource: model.uri,
                    textEdit: { range: issueRange, text: suggestion },
                    versionId: model.getVersionId(),
                  },
                ],
              },
              isPreferred: actions.length === 0,
            })
          }
        }

        return { actions, dispose: () => {} }
      },
    })

    // Run an initial check
    sendToWorker()
  }

  watch(
    [enabled, editorRef],
    ([isEnabled]) => {
      if (isEnabled) {
        teardown()
        setup()
      } else {
        teardown()
      }
    },
    { immediate: true },
  )

  watch(languageRef, () => {
    if (enabled.value && worker) {
      sendToWorker()
    }
  })

  onBeforeUnmount(() => {
    teardown()
  })
}
