import { LocalLinter, Dialect, type Lint } from 'harper.js';
import { binary } from 'harper.js/binary';

import type { HarperIssue, HarperWorkerRequest, HarperWorkerResponse } from './types';

/**
 * Harper Web Worker — fully in-browser, no API required.
 *
 * Runs the Harper grammar/style engine via WebAssembly directly inside this
 * worker thread.  Harper is a fast, offline, privacy-first English grammar
 * checker (https://writewithharper.com) with no network dependency.
 *
 * The host application must configure `window.HarperEnvironment` before
 * instantiating this worker:
 *
 * @example
 * // In your app's main.ts:
 * import HarperWorker from '@mission-platform/harper/worker?worker'
 *
 * window.HarperEnvironment = {
 *   getWorker: () => new HarperWorker(),
 * }
 */

/** Singleton linter — initialised on first use, reused for every request. */
let linter: LocalLinter | undefined;

async function getLinter(): Promise<LocalLinter> {
  if (!linter) {
    linter = new LocalLinter({ binary, dialect: Dialect.American });
    await linter.setup();
    // Materialise default rule state (works around a harper.js v2 quirk where
    // grammar rules are inactive until getDefaultLintConfig() is called once).
    await linter.getDefaultLintConfig();
  }
  return linter;
}

/** Converts a harper.js {@link Lint} to our {@link HarperIssue} shape. */
function lintToIssue(lint: Lint, source: string): HarperIssue {
  const span = lint.span();
  const suggestions = lint
    .suggestions()
    .map((s) => s.get_replacement_text())
    .filter((t) => t.length > 0);

  return {
    text: source.slice(span.start, span.end),
    offset: span.start,
    length: span.end - span.start,
    message: lint.message(),
    ruleId: `harper/${lint.lint_kind()}`,
    severity: 2,
    suggestions,
  };
}

/**
 * Runs Harper on the provided text and returns parsed issues.
 * Returns an empty array on errors so the editor degrades gracefully.
 */
async function check(text: string): Promise<HarperIssue[]> {
  try {
    const instance = await getLinter();
    const lints = await instance.lint(text, { language: 'plaintext' });
    return lints.map((l) => lintToIssue(l, text));
  } catch (error) {
    console.error('[harper.worker] harper.js error', error);
    return [];
  }
}

self.addEventListener('message', async (event_: MessageEvent<HarperWorkerRequest>) => {
  const { text } = event_.data;
  const issues: HarperWorkerResponse = await check(text);
  self.postMessage(issues);
});
