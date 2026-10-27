import { test, expect, type Page } from '@playwright/test';

test.use({ timezoneId: 'America/New_York', locale: 'en-US' });

const hydrated = (page: Page) => page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));

test('typing a time sets the converter, in any of its zones', async ({ page }) => {
  await page.goto('/convert/london-to-new-york');
  await hydrated(page);
  const rows = page.locator('[data-zone-row]');
  const field = page.locator('input[type="time"]');
  await field.fill('15:00');
  await expect(rows.nth(0).locator('.zone-row__clock')).toHaveText('3:00 PM');
  await expect(page.getByRole('button', { name: 'Back to now' })).toBeVisible();

  await page.getByRole('combobox', { name: /typed time/ }).selectOption({ index: 1 });
  await field.fill('21:30');
  await expect(rows.nth(1).locator('.zone-row__clock')).toHaveText('9:30 PM');
});

test('only digits get in, typed segment by segment', async ({ page }) => {
  await page.goto('/convert/london-to-new-york');
  await hydrated(page);
  const field = page.locator('input[type="time"]');
  await field.fill('10:00');
  await field.blur();
  // Focus lands on the hour. The field's 12/24-hour layout follows the OS, so stay in the morning.
  await field.focus();
  await page.keyboard.type('aaaa');
  await expect(field).toHaveValue('10:00');

  await page.keyboard.type('0745');
  await expect(field).toHaveValue('07:45');
  await expect(page.locator('[data-zone-row]').nth(0).locator('.zone-row__clock')).toHaveText('7:45 AM');
});

test('a time skipped by a DST jump is explained', async ({ page }) => {
  await page.goto('/convert/london-to-new-york?t=2026-03-08T12:00Z');
  await hydrated(page);
  await page.getByRole('combobox', { name: /typed time/ }).selectOption({ label: 'New York' });
  const field = page.locator('input[type="time"]');
  await field.fill('02:30');
  await expect(page.getByRole('alert')).toHaveText(
    '2:30 AM is skipped in New York on Sun, Mar 8 (clocks spring forward), so it shows 3:30 AM.',
  );
  await expect(page.locator('[data-zone-row]').nth(1).locator('.zone-row__clock')).toHaveText('3:30 AM');
  await field.blur();
  await expect(field).toHaveValue('03:30');
});
