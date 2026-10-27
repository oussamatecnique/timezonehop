import { test, expect, type Page } from '@playwright/test';

test.use({ timezoneId: 'America/New_York', locale: 'en-US' });

const hydrated = (page: Page) => page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));

test('typing a time sets the converter, in any of its zones', async ({ page }) => {
  await page.goto('/convert/london-to-new-york');
  await hydrated(page);
  const rows = page.locator('[data-zone-row]');
  const field = page.getByRole('textbox', { name: /^Time in / });
  await field.fill('3pm');
  await field.press('Enter');
  await expect(rows.nth(0).locator('.zone-row__clock')).toHaveText('3:00 PM');
  await expect(page.getByRole('button', { name: 'Back to now' })).toBeVisible();
  await expect(field).toHaveValue('3:00 PM');

  // Pick the second zone after typing: that applies the typed time there.
  await field.fill('21h30');
  await page.getByRole('combobox', { name: /typed time/ }).selectOption({ index: 1 });
  await expect(rows.nth(1).locator('.zone-row__clock')).toHaveText('9:30 PM');
  await expect(field).toHaveValue('9:30 PM');
});

test('bad input is explained and nothing changes until it is fixed', async ({ page }) => {
  await page.goto('/convert/london-to-new-york');
  await hydrated(page);
  const clock = page.locator('[data-zone-row]').nth(0).locator('.zone-row__clock');
  const field = page.getByRole('textbox', { name: /^Time in / });
  await field.fill('9:30');
  await page.getByRole('button', { name: 'Set', exact: true }).click();
  await expect(clock).toHaveText('9:30 AM');

  await field.fill('25:00');
  await field.press('Enter');
  await expect(page.getByRole('alert')).toHaveText('Hours go from 0 to 23, or use AM/PM.');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(clock).toHaveText('9:30 AM');

  await field.press('Escape');
  await expect(field).toHaveValue('9:30 AM');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
