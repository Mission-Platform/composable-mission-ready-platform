import { expect, test } from '@playwright/test';

test('homepage loads without browser errors', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Build boldly. Ship with purpose.', exact: true })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('reveals off-screen sections after scrolling them into view', async ({ page }) => {
  await page.goto('/');

  const packagesReveal = page.locator('#packages > .in-view');
  await expect(packagesReveal).toHaveCSS('opacity', '0');

  await page.mouse.wheel(0, 1600);

  await expect(packagesReveal).toBeInViewport();
  await expect(packagesReveal).toHaveCSS('opacity', '1');
  await expect(packagesReveal).toHaveCSS('transform', 'none');
});

test('expands a FAQ answer', async ({ page }) => {
  await page.goto('/');

  const faq = page.locator('#faq details').filter({ hasText: "What does 'composable' mean?" });
  const answer = faq.getByText(
    'We build the interface from small, reusable, framework-neutral building blocks you can mix and match.',
    { exact: true },
  );

  await expect(faq).not.toHaveAttribute('open', '');
  await expect(answer).toHaveCount(0);

  await faq.getByText("What does 'composable' mean?", { exact: true }).click();

  await expect(faq).toHaveAttribute('open', '');
  await expect(answer).toBeVisible();
});

test('switches the homepage language', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Language', { exact: true }).click();
  await page.getByRole('option', { name: 'Español', exact: true }).click();

  await expect(page).toHaveURL(/\/es$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-ES');
  await expect(page.getByText("¿Qué significa 'componible'?", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('mp-locale'))).toBe('es');
});

test('scrolls to the selected desktop navigation section', async ({ page }) => {
  await page.goto('/');

  const faq = page.locator('#faq');
  await page
    .getByRole('navigation', { name: 'Main navigation', exact: true })
    .getByRole('link', { name: 'FAQ', exact: true })
    .click();

  await expect(faq).toBeInViewport({ ratio: 0.5 });
});
