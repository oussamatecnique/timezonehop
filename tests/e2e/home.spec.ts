import { test, expect, type Page } from '@playwright/test';

test.use({ timezoneId: 'America/New_York', locale: 'en-US' });

const hydrated = (page: Page) => page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));

test('home starts with only your own time, clearly labelled', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.sky-card__caption')).toHaveText('Your local time in New York');
  await hydrated(page);
  const rows = page.locator('[data-zone-row]');
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText('New York (you)');
  await expect(page.locator('[data-zone-row]', { hasText: /^UTC/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add city or timezone' })).toBeVisible();
});

test('the converter sits clearly apart from the clock card', async ({ page }) => {
  await page.goto('/');
  const card = (await page.locator('.sky-card--hero').boundingBox())!;
  const converter = (await page.locator('.converter').boundingBox())!;
  expect(converter.y - (card.y + card.height)).toBeGreaterThanOrEqual(24);
});

test('your row is filled in even before the converter script loads', async ({ page }) => {
  await page.route('**/_astro/**/*.js', r => r.abort());
  await page.goto('/');
  const row = page.locator('[data-zone-row]').first();
  await expect(row).toContainText('New York (you)');
  await expect(row).not.toContainText('Your time');
});
