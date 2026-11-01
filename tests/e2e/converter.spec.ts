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

test('at the six-row limit, the add button explains why it is disabled', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  const rows = page.locator('[data-zone-row]');
  const addButton = page.getByRole('button', { name: 'Add city or timezone' });
  const message = 'You can compare up to 6 at once. Remove one to add another.';
  for (let n = 2; n <= 6; n++) {
    await addButton.click();
    await page.locator('.picker .chip').first().click();
    await expect(rows).toHaveCount(n);
  }
  await expect(addButton).toBeDisabled();
  await expect(addButton).toHaveAttribute('title', message);
  await expect(page.getByText(message)).toBeVisible();
  await page.getByRole('button', { name: /remove/i }).last().click();
  await expect(addButton).toBeEnabled();
  await expect(addButton).not.toHaveAttribute('title', /./); // Preact leaves title="", which shows nothing
  await expect(page.getByText(message)).toHaveCount(0);
});

test.describe('duplicates', () => {
  test.use({ timezoneId: 'Africa/Casablanca' });

  const searchAdd = async (page: Page, query: string, first: string) => {
    await page.getByRole('button', { name: 'Add city or timezone' }).click();
    await expect(page.locator('#add-city-search')).toBeFocused();
    await page.keyboard.type(query);
    // Scoped: the typed-time <select> has options too once there are two rows.
    await expect(page.locator('.picker').getByRole('option').first()).toContainText(first);
    await page.keyboard.press('Enter');
  };

  test('another city in the same zone is added; the same city or UTC twice is explained', async ({ page }) => {
    await page.goto('/');
    await hydrated(page);
    const rows = page.locator('[data-zone-row]');
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0)).toContainText('Casablanca (you)');

    // Rabat shares Casablanca's zone but is a different city.
    await searchAdd(page, 'rabat', 'Rabat');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1)).toContainText('Rabat');

    // The same city again is refused, with a reason and the listed row highlighted.
    await searchAdd(page, 'casablanca', 'Casablanca');
    await expect(rows).toHaveCount(2);
    await expect(page.getByRole('status')).toHaveText('Casablanca is already listed.');
    await expect(rows.nth(0)).toHaveClass(/zone-row--flash/);

    // UTC from the quick pick, then UTC from search (a different key for the same zone).
    await page.getByRole('button', { name: 'Add city or timezone' }).click();
    await page.locator('.picker').getByRole('button', { name: 'UTC', exact: true }).click();
    await expect(rows).toHaveCount(3);
    await searchAdd(page, 'utc', 'UTC');
    await expect(rows).toHaveCount(3);
    await expect(page.getByRole('status')).toHaveText('UTC is already listed.');
    await page.getByRole('button', { name: 'Add city or timezone' }).click();
    await expect(page.locator('.picker').getByRole('button', { name: 'UTC', exact: true })).toHaveCount(0);

    // Both cities come back after a reload.
    await page.reload();
    await hydrated(page);
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Casablanca (you)');
    await expect(rows.nth(1)).toContainText('Rabat');
    await expect(rows.nth(2)).toContainText('UTC');
  });
});
