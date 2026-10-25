import { test, expect, type Page } from '@playwright/test';

test.use({ timezoneId: 'America/New_York', locale: 'en-US' });

const hydrated = (page: Page) => page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));

test('End stays on the same day; ArrowRight at the end does not jump a day', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  const rows = page.locator('[data-zone-row]');
  await expect(rows.nth(0)).toContainText('New York (you)');
  const date = page.locator('.timeline__date');
  const before = await date.textContent();
  await page.getByRole('slider').focus();
  await page.keyboard.press('End');
  await expect(rows.nth(0)).toContainText('11:45 PM');
  await page.keyboard.press('ArrowRight');
  await expect(rows.nth(0)).toContainText('11:45 PM');
  await expect(date).toHaveText(before!);
});

test('dragging past the edge stays on the same day and announces the new time', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  const date = page.locator('.timeline__date');
  const before = await date.textContent();
  await page.locator('.timeline__track').scrollIntoViewIfNeeded();
  const track = (await page.locator('.timeline__track').boundingBox())!;
  const y = track.y + 15;
  await page.mouse.move(track.x + track.width * 0.5, y);
  await page.mouse.down();
  // Past the track's right end, but still inside the viewport.
  for (let i = 0; i < 6; i++) await page.mouse.move(track.x + track.width + 20 + i * 5, y);
  await page.mouse.up();
  await expect(date).toHaveText(before!);
  const rowTime = await page.locator('[data-zone-row]').nth(0).locator('.zone-row__clock').textContent();
  await expect(page.getByRole('status')).toHaveText(`${rowTime} in New York (you)`);
});

test('touch targets are at least 44px', async ({ page }) => {
  await page.goto('/time/tokyo');
  await hydrated(page);
  for (const selector of ['.tool', '.chip', '.btn']) {
    const box = (await page.locator(selector).first().boundingBox())!;
    expect(box.height, selector).toBeGreaterThanOrEqual(44);
    expect(box.width, selector).toBeGreaterThanOrEqual(44);
  }
});
