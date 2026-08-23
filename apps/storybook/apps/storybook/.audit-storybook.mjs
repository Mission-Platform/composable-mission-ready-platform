import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const staticRoot = path.join(root, 'storybook-static');
const index = JSON.parse(fs.readFileSync(path.join(staticRoot, 'index.json'), 'utf8'));
const stories = Object.values(index.entries).filter((entry) => entry.type === 'story');
const axeSource = fs.readFileSync(
  path.resolve(root, '../../node_modules/.pnpm/axe-core@4.13.0/node_modules/axe-core/axe.min.js'),
  'utf8',
);
const port = Number(process.env.AUDIT_PORT ?? 6387);
const workers = Number(process.env.AUDIT_WORKERS ?? 6);
const pageShellRules = new Set(['landmark-one-main', 'page-has-heading-one', 'region']);
const targets = new Set([
  'atoms-forgetypography-forgetypography--link',
  'templates-email-emaildocument--complete-email',
  'templates-email-emaildocument--responsive-fallback',
]);

function serve() {
  const server = http.createServer((request, response) => {
    const requested = decodeURIComponent((request.url ?? '/').split('?')[0]);
    const relative = requested === '/' ? 'index.html' : requested.replace(/^\//, '');
    const file = path.resolve(staticRoot, relative);
    if (!file.startsWith(`${staticRoot}${path.sep}`) && file !== staticRoot) {
      response.writeHead(403).end();
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200).end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

async function auditStory(browser, entry) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  try {
    await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${encodeURIComponent(entry.id)}&viewMode=story`, {
      waitUntil: 'load',
      timeout: 30_000,
    });
    await page.waitForTimeout(250);
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(async () => {
      const axeResult = await window.axe.run(document, { resultTypes: ['violations'] });
      const bodyText = document.body.innerText;
      const root = document.querySelector('#storybook-root, #root');
      return {
        violations: axeResult.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          nodes: violation.nodes.map((node) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })),
        })),
        bodyText,
        rootText: root?.innerText ?? '',
      };
    });
    const renderErrorText = `${result.bodyText}\n${result.rootText}`;
    const renderErrors = errors.concat(
      /There was an error rendering your story|Couldn't find story|Error rendering story/i.test(renderErrorText)
        ? [renderErrorText.slice(0, 1000)]
        : [],
    );
    return { id: entry.id, title: entry.title, name: entry.name, violations: result.violations, renderErrors };
  } catch (error) {
    return { id: entry.id, title: entry.title, name: entry.name, violations: [], renderErrors: [String(error)] };
  } finally {
    await page.close();
  }
}

const server = await serve();
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  args: ['--disable-gpu'],
});
const results = [];
let next = 0;
async function worker() {
  while (next < stories.length) {
    const entry = stories[next++];
    results.push(await auditStory(browser, entry));
  }
}
await Promise.all(Array.from({ length: workers }, worker));
await browser.close();
await new Promise((resolve) => server.close(resolve));
results.sort((left, right) => left.id.localeCompare(right.id));
const allViolations = results.flatMap((result) => result.violations.map((violation) => ({ ...violation, storyId: result.id })));
const componentViolations = allViolations.filter((violation) => !pageShellRules.has(violation.id));
const pageShellViolations = allViolations.filter((violation) => pageShellRules.has(violation.id));
const renderErrors = results.filter((result) => result.renderErrors.length);
const output = {
  framework: process.env.STORYBOOK_FRAMEWORK ?? 'unknown',
  totalIndexEntries: Object.keys(index.entries).length,
  executableStories: stories.length,
  auditedStories: results.length,
  renderErrorStories: renderErrors.length,
  renderErrors,
  componentViolationStories: new Set(componentViolations.map((violation) => violation.storyId)).size,
  componentViolations,
  pageShellViolationStories: new Set(pageShellViolations.map((violation) => violation.storyId)).size,
  pageShellViolations,
  targetResults: results.filter((result) => targets.has(result.id)),
};
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exitCode = renderErrors.length || componentViolations.length ? 1 : 0;