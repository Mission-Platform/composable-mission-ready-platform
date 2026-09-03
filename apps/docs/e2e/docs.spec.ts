/* eslint-disable unicorn/prevent-abbreviations, sonarjs/no-skipped-tests -- Retain the conventional filename and WebKit-only checks. */
import { expect, test } from '@playwright/test';

test('opens the documentation overview', async ({ page }) => {
  await page.goto('/overview');

  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole('heading', { name: 'Mission Platform Overview', exact: true })).toBeVisible();
});

test('searches the documentation', async ({ page }) => {
  await page.goto('/overview');

  await page.getByPlaceholder('Search the docs…', { exact: true }).fill('composition');

  await expect(page).toHaveURL(/\/search\?q=composition$/);
  await expect(page.locator('.docs-main')).toContainText('Mission Platform Overview');
});

test('navigates to a document from the documentation sidebar', async ({ page }) => {
  await page.goto('/overview');

  const initialNavigationCount = await page.evaluate(() => performance.getEntriesByType('navigation').length);
  const initialHistoryLength = await page.evaluate(() => history.length);

  await page
    .locator('nav.docs-sidebar:not([data-mobile-only]) forge-router-link.docs-sidebar__link')
    .filter({ hasText: 'Development Setup' })
    .click();

  await expect(page).toHaveURL(/\/development-setup$/);
  await expect(page.getByRole('heading', { name: 'Development Setup', exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => performance.getEntriesByType('navigation').length))
    .toBe(initialNavigationCount);
  await expect.poll(() => page.evaluate(() => history.length)).toBe(initialHistoryLength + 1);
});

test.describe('WebKit customized built-in fallback', () => {
  test('keeps sidebar links localized after changing language', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'The native fallback is specific to WebKit.');
    await page.goto('/overview');

    await page.getByLabel('Change language', { exact: true }).selectOption('fr');

    await expect(page).toHaveURL(/\/fr\/overview$/);
    await page
      .locator('nav.docs-sidebar forge-router-link.docs-sidebar__link')
      .filter({ hasText: 'Configuration du développement' })
      .click();
    await expect(page).toHaveURL(/\/fr\/development-setup$/);
  });

  test('opens mobile navigation before following a sidebar link', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'The native fallback is specific to WebKit.');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/overview');

    const sidebar = page.locator('.docs-app__sidebar--native');
    await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    await page.getByRole('button', { name: 'Toggle navigation', exact: true }).click();
    await expect(sidebar).toHaveAttribute('aria-hidden', 'false');
    await page
      .locator('nav.docs-sidebar forge-router-link.docs-sidebar__link')
      .filter({ hasText: 'Development Setup' })
      .click();

    await expect(page).toHaveURL(/\/development-setup$/);
  });
});
