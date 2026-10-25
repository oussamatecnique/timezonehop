import { test, expect, type Page } from '@playwright/test';

/** Keyboard shortcuts and buttons need JavaScript: wait until every island has hydrated. */
const hydrated = (page: Page) => page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));

test('header search navigates and converter add-city picks', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  await page.keyboard.press('/');
  await page.keyboard.type('tokio');
  await expect(page.getByRole('option').first()).toContainText('Tokyo');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/time\/tokyo$/);
  await page.goto('/');
  await hydrated(page);
  await page.getByRole('button', { name: /add city/i }).click();
  await page.keyboard.type('dubai');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-zone-row]')).toHaveCount(2);
});

test('share link restores state', async ({ page }) => {
  await page.goto('/?t=2026-10-25T14:00Z&z=tokyo,london');
  await expect(page.locator('[data-zone-row]').nth(0)).toContainText('11:00 PM');
  await expect(page.locator('[data-zone-row]').nth(1)).toContainText('2:00 PM');
});

test('share link resolves cities outside the quick picks', async ({ page }) => {
  await page.goto('/?t=2026-10-25T14:00Z&z=kathmandu,lima');
  await expect(page.locator('[data-zone-row]').nth(0)).toContainText('Kathmandu');
  await expect(page.locator('[data-zone-row]').nth(0)).toContainText('7:45 PM');
  await expect(page.locator('[data-zone-row]').nth(1)).toContainText('9:00 AM');
});

test('search failure degrades gracefully', async ({ page }) => {
  await page.route('**/search-index.json', r => r.abort());
  await page.goto('/');
  await hydrated(page);
  await page.keyboard.press('/');
  await page.keyboard.type('par');
  await expect(page.getByRole('link', { name: /browse all cities/i })).toBeVisible();
});
