import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('opens with an untitled note tab', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'Untitled', exact: true })).toBeVisible();
  await expect(page.getByRole('tabpanel', { name: 'Untitled', exact: true })).toBeVisible();
});

test('creates a new note tab', async ({ page }) => {
  await page.getByRole('button', { name: 'New tab', exact: true }).click();

  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.getByRole('tab', { name: 'Untitled', exact: true })).toHaveCount(2);
});

test('opens the snippets drawer from the navigation', async ({ page }) => {
  await page
    .getByRole('navigation', { name: 'Main navigation', exact: true })
    .getByRole('button', { name: 'Snippets', exact: true })
    .click();

  await expect(page).toHaveURL(/\?panel=snippets$/);
  await expect(page.getByRole('dialog', { name: 'Snippets', exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('/date');
});
