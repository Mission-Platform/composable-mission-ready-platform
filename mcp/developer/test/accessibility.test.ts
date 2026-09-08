import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  type AccessibilityBrowser,
  type AccessibilityPage,
  runAccessibilityAudit,
} from '../src/accessibility/audit.ts';

function makePage(
  options: { evaluate?: (tags: string[] | undefined) => Promise<unknown>; goto?: () => Promise<void> } = {},
) {
  const events = new Map<string, (value: unknown) => void>();
  const calls: string[] = [];
  const state: { evaluationArgument: string[] | undefined } = { evaluationArgument: undefined };
  const page: AccessibilityPage = {
    on(event, listener) {
      events.set(event, listener as (value: unknown) => void);
    },
    async setViewportSize(size) {
      calls.push(`viewport:${size.width}x${size.height}`);
    },
    async goto() {
      calls.push('goto');
      await options.goto?.();
    },
    async waitForTimeout(timeout) {
      calls.push(`wait:${timeout}`);
    },
    async addScriptTag() {
      calls.push('axe');
    },
    async evaluate<T, Argument>(_pageFunction: (argument: Argument) => Promise<T>, argument: Argument) {
      state.evaluationArgument = argument as string[] | undefined;
      return (await options.evaluate?.(state.evaluationArgument)) as T;
    },
    async close() {
      calls.push('page-close');
    },
  };
  return {
    page,
    calls,
    events,
    state,
  };
}

function makeBrowser(page: AccessibilityPage) {
  const calls: string[] = [];
  const browser: AccessibilityBrowser = {
    async newPage() {
      calls.push('new-page');
      return page;
    },
    async close() {
      calls.push('browser-close');
    },
  };
  return { browser, calls };
}

describe('accessibility audit', () => {
  it('returns normalized violations and applies viewport, tags, and timeout inputs', async () => {
    const { page, calls, state } = makePage({
      evaluate: async () => ({
        violations: [
          {
            id: 'color-contrast',
            impact: 'serious',
            help: 'Elements must meet minimum color contrast ratio thresholds',
            nodes: [{ target: ['button', 0], html: '<button>Save</button>', failureSummary: 'Fix contrast.' }],
          },
        ],
        bodyText: 'Page content',
        rootText: 'Page content',
      }),
    });
    const { browser, calls: browserCalls } = makeBrowser(page);

    const result = await runAccessibilityAudit(
      { url: 'https://example.test', tags: ['wcag2aa'], width: 1024, height: 768, timeout: 2000 },
      { launchBrowser: async () => browser, axeSource: 'axe-source', settleTime: 0 },
    );

    assert.deepEqual(result.violations, [
      {
        id: 'color-contrast',
        impact: 'serious',
        help: 'Elements must meet minimum color contrast ratio thresholds',
        nodes: [{ target: ['button', '0'], html: '<button>Save</button>', failureSummary: 'Fix contrast.' }],
      },
    ]);
    assert.deepEqual(result.renderErrors, []);
    assert.deepEqual(state.evaluationArgument, ['wcag2aa']);
    assert.deepEqual(calls, ['viewport:1024x768', 'goto', 'wait:0', 'axe', 'page-close']);
    assert.deepEqual(browserCalls, ['new-page', 'browser-close']);
  });

  it('rejects unsupported URLs and invalid viewport or timeout values', async () => {
    await assert.rejects(() => runAccessibilityAudit({ url: 'file:///tmp/index.html' }), /http or https/);
    await assert.rejects(
      () => runAccessibilityAudit({ url: 'https://example.test', width: 0 }),
      /greater than or equal to 1/,
    );
    await assert.rejects(
      () => runAccessibilityAudit({ url: 'https://example.test', timeout: 50 }),
      /greater than or equal to 100/,
    );
  });

  it('returns navigation failures as structured render errors', async () => {
    const { page, calls } = makePage({
      goto: async () => {
        throw new Error('connection refused');
      },
    });
    const { browser, calls: browserCalls } = makeBrowser(page);

    const result = await runAccessibilityAudit(
      { url: 'http://127.0.0.1:9', timeout: 500 },
      { launchBrowser: async () => browser, axeSource: 'axe-source', settleTime: 0 },
    );

    assert.deepEqual(result.violations, []);
    assert.match(result.renderErrors[0] ?? '', /navigation: connection refused/);
    assert.deepEqual(calls, ['goto', 'page-close']);
    assert.deepEqual(browserCalls, ['new-page', 'browser-close']);
  });

  it('closes page and browser when axe evaluation fails', async () => {
    const { page, calls } = makePage({
      evaluate: async () => {
        throw new Error('axe failed');
      },
    });
    const { browser, calls: browserCalls } = makeBrowser(page);

    const result = await runAccessibilityAudit(
      { url: 'https://example.test' },
      { launchBrowser: async () => browser, axeSource: 'axe-source', settleTime: 0 },
    );

    assert.match(result.renderErrors[0] ?? '', /navigation: axe failed/);
    assert.deepEqual(calls, ['goto', 'wait:0', 'axe', 'page-close']);
    assert.deepEqual(browserCalls, ['new-page', 'browser-close']);
  });
});
