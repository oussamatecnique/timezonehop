import { describe, it, expect } from 'vitest';
import { getCatalog } from '../../../src/data/catalog';
import { pairView } from '../../../src/lib/content/pair';

const NOW = Date.UTC(2026, 9, 25, 12);
const cat = getCatalog();
const pair = (s: string) => cat.convert.get(s)!;

describe('pairView', () => {
  it('New York to London during the one-week EU/US gap', () => {
    const v = pairView(pair('new-york-to-london'), NOW);
    expect(v.h1).toBe('New York to London Time Converter');
    expect(v.diffMinutes).toBe(240);
    expect(v.summary).toBe('London is 4 hours ahead of New York. When it is 9:00 AM in New York, it is 1:00 PM in London.');
    expect(v.rows).toHaveLength(24);
    expect(v.rows[9]).toEqual({ hour: 9, fromLabel: '9:00 AM', toLabel: '1:00 PM', dayShift: 0 });
    expect(v.rows[22].dayShift).toBe(1);
    expect(v.dstChanges.map(c => [c.instant, c.newDiffMinutes])).toEqual([
      [Date.UTC(2026, 10, 1, 6), 300], [Date.UTC(2027, 2, 14, 7), 240], [Date.UTC(2027, 2, 28, 1), 300],
    ]);
    expect(v.reverse.slug).toBe('london-to-new-york');
  });

  it('says when the other place is already on the next day', () => {
    expect(pairView(pair('los-angeles-to-sydney'), NOW).summary).toBe(
      'Sydney is 18 hours ahead of Los Angeles. When it is 9:00 AM in Los Angeles, it is 3:00 AM the next day in Sydney.',
    );
    expect(pairView(pair('sydney-to-los-angeles'), NOW).summary).toContain('3:00 PM the previous day in Los Angeles');
  });

  it('EST to IST is fixed and points to the city equivalent', () => {
    const v = pairView(pair('est-to-ist'), NOW);
    expect(v.diffMinutes).toBe(630);
    expect(v.dstChanges).toEqual([]);
    expect(v.cityEquivalent?.slug).toBe('new-york-to-new-delhi');
    expect(v.inEffectNote).toContain('EDT');
  });
});

describe('pair facts, calling hours and questions', () => {
  it('city pairs get zones, distance and daylight saving facts', () => {
    const v = pairView(pair('new-york-to-london'), NOW);
    const fact = (term: string) => v.facts.find(f => f.term === term);
    expect(fact('New York time zone')).toEqual({
      term: 'New York time zone', value: 'Eastern Daylight Time (EDT, UTC−4)', href: '/time/new-york',
    });
    expect(fact('London time zone')?.value).toBe('Greenwich Mean Time (GMT, UTC)');
    expect(fact('Distance')?.value).toMatch(/^5,5\d\d km \(3,4\d\d miles\)$/);
    expect(fact('Daylight saving time')?.value).toBe('Both New York and London change their clocks.');
  });

  it('says which side changes its clocks', () => {
    const dst = (s: string) => pairView(pair(s), NOW).facts.find(f => f.term === 'Daylight saving time')?.value;
    expect(dst('toronto-to-tehran')).toBe('Toronto changes its clocks. Tehran does not.');
    expect(dst('tehran-to-toronto')).toBe('Toronto changes its clocks. Tehran does not.');
    expect(dst('tokyo-to-seoul')).toBe('Neither Tokyo nor Seoul changes its clocks.');
  });

  it('abbreviation pairs describe each abbreviation and skip distance', () => {
    const v = pairView(pair('est-to-ist'), NOW);
    expect(v.facts).toEqual([
      { term: 'EST', value: 'Eastern Standard Time (UTC−5)', href: '/timezone/est' },
      { term: 'IST', value: 'India Standard Time (UTC+5:30)', href: '/timezone/ist' },
    ]);
  });

  it('gives a calling window', () => {
    expect(pairView(pair('new-york-to-london'), NOW).callText).toBe(
      'For a personal call, both places are between 8 AM and 10 PM from 8:00 AM to 6:00 PM in New York (12:00 PM to 10:00 PM in London).',
    );
  });

  it('answers common questions', () => {
    const v = pairView(pair('new-york-to-london'), NOW);
    expect(v.faq.map(f => f.q)).toEqual([
      'What time is it in London when it is noon in New York?',
      'What time is it in New York when it is noon in London?',
      'Is London ahead of or behind New York?',
      'Does the time difference between New York and London change during the year?',
    ]);
    expect(v.faq[0].a).toBe('When it is 12:00 PM in New York, it is 4:00 PM in London.');
    expect(v.faq[1].a).toBe('When it is 12:00 PM in London, it is 8:00 AM in New York.');
    expect(v.faq[2].a).toBe('London is 4 hours ahead of New York. New York is on UTC−4 and London is on UTC.');
    expect(v.faq[3].a).toBe(
      'Yes. The difference is 4 hours today and becomes 5 hours on Sun, Nov 1, 2026. It changes when one place moves its clocks and the other does not, or when they move on different dates.',
    );
    const fixedPair = pairView(pair('tokyo-to-seoul'), NOW);
    expect(fixedPair.faq[2].a).toBe('Seoul has the same time as Tokyo. Tokyo is on UTC+9 and Seoul is on UTC+9.');
    expect(fixedPair.faq[3].a).toBe('No. Neither Tokyo nor Seoul changes its clocks in the next 12 months, so the difference stays the same.');
    expect(pairView(pair('los-angeles-to-sydney'), NOW).faq[0].a).toBe(
      'When it is 12:00 PM in Los Angeles, it is 6:00 AM the next day in Sydney.',
    );
  });
});
