import { test, expect, type Page } from '@playwright/test';

test.use({ timezoneId: 'America/New_York', locale: 'en-US' });

const hydrated = (page: Page) => page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));

test('converter: keyboard, add a city, swap, copy link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await hydrated(page);
  const rows = page.locator('[data-zone-row]');
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText('New York (you)');
  const slider = page.getByRole('slider');
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(rows.nth(0)).toContainText('12:00 AM');
  await page.keyboard.press('ArrowRight');
  await expect(rows.nth(0)).toContainText('12:15 AM');
  await page.getByRole('button', { name: 'Add city or timezone' }).click();
  await page.locator('.picker').getByRole('button', { name: 'London' }).click();
  await expect(rows).toHaveCount(2);
  await page.getByRole('button', { name: /swap/i }).click();
  await expect(rows.nth(1)).toContainText('New York');
  await page.getByRole('button', { name: /copy link/i }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\?t=\d{4}-\d\d-\d\dT\d\d:\d\dZ&z=/);
});

test.describe('a city sharing a listed time zone', () => {
  test.use({ timezoneId: 'Africa/Casablanca' });

  test('is explained instead of silently ignored', async ({ page }) => {
    await page.goto('/');
    await hydrated(page);
    const rows = page.locator('[data-zone-row]');
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0)).toContainText('Casablanca (you)');
    await page.getByRole('button', { name: 'Add city or timezone' }).click();
    await expect(page.locator('#add-city-search')).toBeFocused();
    await page.keyboard.type('rabat');
    await expect(page.getByRole('option').first()).toContainText('Rabat');
    await page.keyboard.press('Enter');
    await expect(rows).toHaveCount(1);
    await expect(page.getByRole('status')).toHaveText('Rabat is in the same time zone as Casablanca (you), which is already listed.');
    await expect(rows.nth(0)).toHaveClass(/zone-row--flash/);
  });
});
