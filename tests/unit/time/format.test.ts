import { describe, it, expect } from 'vitest';
import { iana, fixed } from '../../../src/lib/time/zone';
import {
  formatTime, formatDate, formatOffset, formatDifference, zoneAbbreviation, zoneLongName, labelFromIana,
} from '../../../src/lib/time/format';

const U = Date.UTC;
const tokyo = iana('Asia/Tokyo');
const at = U(2026, 9, 25, 14, 42, 7); // 23:42:07 in Tokyo, Sunday

describe('format', () => {
  it('formats time deterministically', () => {
    expect(formatTime(tokyo, at, { hour12: true, seconds: true })).toBe('11:42:07 PM');
    expect(formatTime(tokyo, at, { hour12: false, seconds: true })).toBe('23:42:07');
    expect(formatTime(tokyo, at, { hour12: true })).toBe('11:42 PM');
    expect(formatTime(tokyo, U(2026, 9, 24, 15), { hour12: true })).toBe('12:00 AM');
    expect(formatTime(tokyo, U(2026, 9, 25, 3), { hour12: true })).toBe('12:00 PM');
    expect(formatTime(tokyo, U(2026, 9, 25, 3), { hour12: false })).toBe('12:00');
  });

  it('formats dates', () => {
    expect(formatDate(tokyo, at, 'long')).toBe('Sunday, October 25, 2026');
    expect(formatDate(tokyo, at, 'short')).toBe('Sun, Oct 25');
  });

  it('formats offsets and differences', () => {
    expect(formatOffset(540)).toBe('UTC+9');
    expect(formatOffset(-300)).toBe('UTC−5');
    expect(formatOffset(330)).toBe('UTC+5:30');
    expect(formatOffset(-570)).toBe('UTC−9:30');
    expect(formatOffset(0)).toBe('UTC');
    expect(formatDifference(300)).toBe('5 hours');
    expect(formatDifference(-60)).toBe('1 hour');
    expect(formatDifference(30)).toBe('30 minutes');
    expect(formatDifference(330)).toBe('5 hours 30 minutes');
    expect(formatDifference(0)).toBe('0 hours');
  });

  it('labels zones', () => {
    expect(zoneAbbreviation(iana('America/New_York'), U(2026, 6, 1))).toBe('EDT');
    expect(zoneAbbreviation(iana('America/New_York'), U(2026, 0, 1))).toBe('EST');
    expect(zoneAbbreviation(iana('Europe/London'), U(2026, 6, 1))).toBe('BST');
    expect(zoneAbbreviation(iana('Europe/London'), U(2026, 0, 1))).toBe('GMT');
    expect(zoneAbbreviation(iana('Europe/Paris'), U(2026, 6, 1))).toBe('CEST');
    expect(zoneAbbreviation(tokyo, at)).toBe('JST');
    expect(zoneAbbreviation(iana('Asia/Kolkata'), at)).toBe('IST');
    expect(zoneAbbreviation(iana('Australia/Sydney'), U(2026, 0, 1))).toBe('AEDT');
    expect(zoneAbbreviation(iana('Asia/Tashkent'), at)).toBe('UTC+5'); // no label -> offset
    expect(zoneAbbreviation(fixed(-300, 'EST'), at)).toBe('EST');
    expect(zoneLongName(tokyo, at)).toBe('Japan Standard Time');
    expect(zoneLongName(iana('America/New_York'), U(2026, 6, 1))).toBe('Eastern Daylight Time');
    expect(labelFromIana('America/Sao_Paulo')).toBe('Sao Paulo');
    expect(labelFromIana('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
  });
});
