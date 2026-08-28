import { expect, test } from '@playwright/test';

test('shows the public service status summary', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /All systems operational|Degraded performance|Service disruption/ }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'System status', exact: true })).toBeVisible();
});

test('navigates to the dashboard', async ({ page }) => {
  await page.goto('/');

  await page
    .getByRole('navigation', { name: 'Main navigation', exact: true })
    .getByRole('link', { name: 'Dashboard', exact: true })
    .click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Service Monitor', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Monitored services', exact: true })).toBeVisible();
});

test('protects monitor management behind an API token', async ({ page }) => {
  await page.goto('/monitors');

  await expect(page.getByRole('heading', { name: 'Monitor access', exact: true })).toBeVisible();
  await expect(page.getByLabel('API token', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});

test('opens the incident history page', async ({ page }) => {
  await page.goto('/');

  await page
    .getByRole('navigation', { name: 'Main navigation', exact: true })
    .getByRole('link', { name: 'Incidents & maintenance', exact: true })
    .click();

  await expect(page).toHaveURL(/\/incidents$/);
  await expect(page.getByRole('heading', { name: 'Incidents', exact: true })).toBeVisible();
});
