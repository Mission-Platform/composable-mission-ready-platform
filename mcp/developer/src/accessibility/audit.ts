import axe from 'axe-core';
import { chromium } from 'playwright';
import { z } from 'zod';

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_SETTLE_TIME = 250;

const httpUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  }, 'URL must use the http or https scheme.');

export const accessibilityAuditInputSchema = z.object({
  url: httpUrlSchema.describe('Reachable HTTP(S) URL to audit.'),
  tags: z
    .array(z.string().trim().min(1).max(100))
    .min(1)
    .max(20)
    .optional()
    .describe('Optional axe rule tags, such as wcag2a or wcag412.'),
  width: z.number().int().min(1).max(10_000).optional().describe('Viewport width in CSS pixels.'),
  height: z.number().int().min(1).max(10_000).optional().describe('Viewport height in CSS pixels.'),
  timeout: z
    .number()
    .int()
    .min(100)
    .max(120_000)
    .optional()
    .describe('Navigation timeout in milliseconds (100–120000).'),
});

export type AccessibilityAuditInput = z.input<typeof accessibilityAuditInputSchema>;

export type AccessibilityViolationNode = {
  target: string[];
  html: string;
  failureSummary?: string;
};

export type AccessibilityViolation = {
  id: string;
  impact: string | null;
  help: string;
  nodes: AccessibilityViolationNode[];
};

export type AccessibilityAuditResult = {
  url: string;
  violations: AccessibilityViolation[];
  renderErrors: string[];
};

type AxeViolation = {
  id: string;
  impact?: string | null;
  help: string;
  nodes: Array<{
    target: Array<string | number>;
    html: string;
    failureSummary?: string;
  }>;
};

type AxeRunOptions = {
  resultTypes: ['violations'];
  runOnly?: { type: 'tag'; values: string[] };
};

type AxeRunner = {
  run: (context: unknown, options: AxeRunOptions) => Promise<{ violations: AxeViolation[] }>;
};

type BrowserDocument = {
  body?: { textContent: string | null };
  querySelector: (selector: string) => { textContent: string | null } | null;
};

type AccessibilityBrowserGlobals = {
  axe: AxeRunner;
  document: BrowserDocument;
};

export interface AccessibilityConsoleMessage {
  type(): string;
  text(): string;
}

export interface AccessibilityPage {
  on(event: 'pageerror', listener: (error: Error) => void): unknown;
  on(event: 'console', listener: (message: AccessibilityConsoleMessage) => void): unknown;
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  goto(url: string, options: { waitUntil: 'load'; timeout: number }): Promise<unknown>;
  waitForTimeout(timeout: number): Promise<void>;
  addScriptTag(options: { content: string }): Promise<unknown>;
  evaluate<T, Argument>(pageFunction: (argument: Argument) => Promise<T>, argument: Argument): Promise<T>;
  close(): Promise<void>;
}

export interface AccessibilityBrowser {
  newPage(): Promise<AccessibilityPage>;
  close(): Promise<void>;
}

export type AccessibilityBrowserLauncher = () => Promise<AccessibilityBrowser>;

export type AccessibilityAuditDependencies = {
  launchBrowser?: AccessibilityBrowserLauncher;
  axeSource?: string;
  settleTime?: number;
};

export function normalizeAccessibilityViolations(violations: readonly AxeViolation[]): AccessibilityViolation[] {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? null,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target.map(String),
      html: node.html,
      ...(node.failureSummary === undefined ? {} : { failureSummary: node.failureSummary }),
    })),
  }));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function browserLauncher(): Promise<AccessibilityBrowser> {
  return chromium.launch({ headless: true }) as unknown as Promise<AccessibilityBrowser>;
}

async function auditPage(
  page: AccessibilityPage,
  input: z.output<typeof accessibilityAuditInputSchema>,
  axeSource: string,
  settleTime: number,
): Promise<AccessibilityAuditResult> {
  const renderErrors: string[] = [];
  page.on('pageerror', (error) => renderErrors.push(`pageerror: ${errorMessage(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') renderErrors.push(`console: ${message.text()}`);
  });

  try {
    if (input.width !== undefined || input.height !== undefined) {
      await page.setViewportSize({ width: input.width ?? 1280, height: input.height ?? 720 });
    }
    await page.goto(input.url, { waitUntil: 'load', timeout: input.timeout ?? DEFAULT_TIMEOUT });
    await page.waitForTimeout(settleTime);
    await page.addScriptTag({ content: axeSource });

    const audit = await page.evaluate(async (tags: string[] | undefined) => {
      const browserGlobal = globalThis as typeof globalThis & AccessibilityBrowserGlobals;
      const axeResult = await browserGlobal.axe.run(browserGlobal.document, {
        resultTypes: ['violations'],
        ...(tags === undefined ? {} : { runOnly: { type: 'tag' as const, values: tags } }),
      });
      const bodyText = browserGlobal.document.body?.textContent ?? '';
      const root = browserGlobal.document.querySelector('#storybook-root, #root');
      return {
        violations: axeResult.violations,
        bodyText,
        rootText: root?.textContent ?? '',
      };
    }, input.tags);

    if (
      /There was an error rendering your story|Couldn't find story|Error rendering story/i.test(
        `${audit.bodyText}\n${audit.rootText}`,
      )
    ) {
      renderErrors.push(`${audit.bodyText}\n${audit.rootText}`.slice(0, 1000));
    }
    return {
      url: input.url,
      violations: normalizeAccessibilityViolations(audit.violations),
      renderErrors,
    };
  } catch (error) {
    renderErrors.push(`navigation: ${errorMessage(error)}`);
    return { url: input.url, violations: [], renderErrors };
  } finally {
    try {
      await page.close();
    } catch (error) {
      renderErrors.push(`page cleanup: ${errorMessage(error)}`);
    }
  }
}

export async function runAccessibilityAudit(
  input: AccessibilityAuditInput,
  dependencies: AccessibilityAuditDependencies = {},
): Promise<AccessibilityAuditResult> {
  const parsed = accessibilityAuditInputSchema.parse(input);
  const launchBrowser = dependencies.launchBrowser ?? browserLauncher;
  const axeSource = dependencies.axeSource ?? axe.source;
  const settleTime = dependencies.settleTime ?? DEFAULT_SETTLE_TIME;
  let browser: AccessibilityBrowser | undefined;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    return await auditPage(page, parsed, axeSource, settleTime);
  } catch (error) {
    return {
      url: parsed.url,
      violations: [],
      renderErrors: [
        `browser: ${errorMessage(error)}. Ensure Playwright browser binaries are installed (pnpm exec playwright install chromium).`,
      ],
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Browser cleanup must not replace the structured audit result.
      }
    }
  }
}
