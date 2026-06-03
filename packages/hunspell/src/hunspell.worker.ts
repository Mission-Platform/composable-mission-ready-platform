import { createHunspell } from './create-hunspell'
import affContent from './dictionaries/en_AU.aff?raw'
import dicContent from './dictionaries/en_AU.dic?raw'

/**
 * A word + its byte offset in the original text, posted back to the main
 * thread so the composable can map it to Monaco line/column positions.
 */
export interface HunspellIssue {
  text: string
  offset: number
  length: number
  suggestions: string[]
}

// Simple word tokeniser: finds all runs of letters (including apostrophes and
// hyphens within words) and returns each token with its byte offset.
function tokenise(text: string): Array<{ word: string; offset: number }> {
  const tokens: Array<{ word: string; offset: number }> = []
  // Match words: sequences of Unicode letters / digits, allowing internal ' and -
  const re = /[^\s\d\W][\w'-]*/gu
  let m: RegExpExecArray | undefined
  while ((m = re.exec(text) ?? undefined) !== undefined) {
    tokens.push({ word: m[0], offset: m.index })
  }
  return tokens
}

// ── Worker lifecycle ──────────────────────────────────────────────────────────

let initPromise: Promise<Awaited<ReturnType<typeof createHunspell>>> | undefined

function getModule() {
  initPromise ??= (async () => {
    const module_ = await createHunspell()
    // Keep a single checker instance alive for the lifetime of this worker.
    const checker = new module_.HunspellChecker(affContent, dicContent)
    return { checker }
  })()
  return initPromise
}

// ── Message handler ───────────────────────────────────────────────────────────

self.addEventListener('message', async (event_: MessageEvent<{ text: string }>) => {
  const { text } = event_.data
  try {
    const { checker } = await getModule()
    const issues: HunspellIssue[] = []

    for (const { word, offset } of tokenise(text)) {
      if (!checker.spell(word)) {
        const suggestionsVector = checker.suggest(word)
        const suggestions: string[] = []
        for (let index = 0; index < suggestionsVector.size(); index++) {
          const s = suggestionsVector.get(index)
          if (s !== undefined) suggestions.push(s)
        }
        suggestionsVector.delete()
        issues.push({ text: word, offset, length: word.length, suggestions })
      }
    }

    self.postMessage(issues)
  } catch (error) {
    console.error('[hunspell.worker] error', error)
    self.postMessage([])
  }
})
