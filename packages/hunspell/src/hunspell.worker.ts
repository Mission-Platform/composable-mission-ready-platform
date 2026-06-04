import { createHunspell } from './create-hunspell';
import affContent from './dictionaries/en_AU.aff?raw';
import dicContent from './dictionaries/en_AU.dic?raw';

/**
 * A word + its byte offset in the original text, posted back to the main
 * thread so the composable can map it to Monaco line/column positions.
 */
export interface HunspellIssue {
  text: string;
  offset: number;
  length: number;
  suggestions: string[];
}

// ── Worker lifecycle ──────────────────────────────────────────────────────────

let initPromise: Promise<Awaited<ReturnType<typeof createHunspell>>> | undefined;

function getModule() {
  initPromise ??= (async () => {
    const module_ = await createHunspell();
    // Keep a single checker instance alive for the lifetime of this worker.
    const checker = new module_.HunspellChecker(affContent, dicContent);
    return { checker };
  })();
  return initPromise;
}

// ── Message handler ───────────────────────────────────────────────────────────

self.addEventListener('message', async (event_: MessageEvent<{ text: string }>) => {
  const { text } = event_.data;
  try {
    const { checker } = await getModule();
    const issues: HunspellIssue[] = [];

    // Use the dictionary-aware TextParser exposed via checker.tokenize() rather
    // than a hand-rolled regex, so word-boundary detection is consistent with
    // Hunspell's own understanding of the loaded .aff file.
    const tokensVector = checker.tokenize(text);
    for (let index = 0; index < tokensVector.size(); index++) {
      const token = tokensVector.get(index);
      if (token === undefined) continue;

      const { word, offset, length } = token;
      if (!checker.spell(word)) {
        const suggestionsVector = checker.suggest(word);
        const suggestions: string[] = [];
        for (let si = 0; si < suggestionsVector.size(); si++) {
          const s = suggestionsVector.get(si);
          if (s !== undefined) suggestions.push(s);
        }
        suggestionsVector.delete();
        issues.push({ text: word, offset, length, suggestions });
      }
    }
    tokensVector.delete();

    self.postMessage(issues);
  } catch (error) {
    console.error('[hunspell.worker] error', error);
    self.postMessage([]);
  }
});
