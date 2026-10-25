// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"handleDisabledFileLoadingAsSuccess":true}}
import { it, expect, vi } from 'vitest';
import { scheduleAds } from '../../src/scripts/ads';

it('injects the AdSense script once, lazily', () => {
  vi.useFakeTimers();
  scheduleAds('ca-pub-123');
  scheduleAds('ca-pub-123');
  expect(document.querySelectorAll('script[src*="adsbygoogle"]')).toHaveLength(0);
  window.dispatchEvent(new Event('load'));
  vi.advanceTimersByTime(3000);
  window.dispatchEvent(new Event('pointerdown'));
  expect(document.querySelectorAll('script[src*="adsbygoogle.js?client=ca-pub-123"]')).toHaveLength(1);
  vi.useRealTimers();
});
