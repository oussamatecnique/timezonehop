import { describe, it, expect } from 'vitest';
import { normalize, parseOffsetQuery, search } from '../../../src/lib/search/match';
import { buildSearchIndex } from '../../../src/lib/search/build-index';

const idx = buildSearchIndex();
const top = (q: string) => search(idx, q)[0]?.u;

describe('search', () => {
  it('normalizes messy input', () => {
    expect(normalize('  São Paulo ')).toBe('sao paulo');
    expect(normalize("St. John's")).toBe('st johns');
  });

  it('parses offsets', () => {
    expect(parseOffsetQuery('UTC +5:30')).toBe(330);
    expect(parseOffsetQuery('gmt-3')).toBe(-180);
    expect(parseOffsetQuery('+0545')).toBe(345);
    expect(parseOffsetQuery('utc')).toBe(0);
    expect(parseOffsetQuery('tokyo')).toBeNull();
  });

  it('ranks sensibly', () => {
    expect(top('tokyo')).toBe('/time/tokyo');
    expect(top('TOKIO')).toBe('/time/tokyo');
    expect(top('  sao paulo')).toBe('/time/sao-paulo');
    expect(top('nyc')).toBe('/time/new-york');
    expect(top('bombay')).toBe('/time/mumbai');
    expect(top('est')).toBe('/timezone/est');
    expect(top('utc+5:30')).toBe('/timezone/utc-plus-5-30');
    expect(top('gmt-3')).toBe('/timezone/utc-minus-3');
    expect(top("st. john's")).toBe('/time/st-johns');
    expect(top('japan')).toBe('/time/japan');
    expect(search(idx, '')).toEqual([]);
    expect(search(idx, '   ')).toEqual([]);
  });
});
