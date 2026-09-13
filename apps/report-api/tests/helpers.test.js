import { describe, it, expect } from '@jest/globals';
import { convertToArray, parseRankParam } from '../utils/helpers.js';

describe('convertToArray', () => {
  it('should return an empty array for empty string', () => {
    expect(convertToArray('')).toEqual([]);
  });

  it('should return an empty array for undefined input', () => {
    expect(convertToArray(undefined)).toEqual([]);
  });

  it('should return an empty array for null input', () => {
    expect(convertToArray(null)).toEqual([]);
  });

  it('should return an array of strings split by comma for simple comma-separated string', () => {
    expect(convertToArray('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('should return an array with a single element for string with no commas', () => {
    expect(convertToArray('abc')).toEqual(['abc']);
  });

  it('should correctly URL decode the string before splitting', () => {
    expect(convertToArray('a%20b,c%20d')).toEqual(['a b', 'c d']);
    // 'a%2Cb,c' decodes to 'a,b,c' which then splits to ['a', 'b', 'c']
    expect(convertToArray('a%2Cb,c')).toEqual(['a', 'b', 'c']);
  });

  it('should preserve spaces around commas without trimming', () => {
    expect(convertToArray('a, b ,c ')).toEqual(['a', ' b ', 'c ']);
  });
});

describe('parseRankParam', () => {
  it('should return null for null, undefined, empty string, or ALL', () => {
    expect(parseRankParam(null)).toBeNull();
    expect(parseRankParam(undefined)).toBeNull();
    expect(parseRankParam('')).toBeNull();
    expect(parseRankParam('ALL')).toBeNull();
  });

  it('should parse standard rank labels with k and M units', () => {
    expect(parseRankParam('Top 1k')).toBe(1000);
    expect(parseRankParam('Top 10k')).toBe(10000);
    expect(parseRankParam('Top 100k')).toBe(100000);
    expect(parseRankParam('Top 1M')).toBe(1000000);
    expect(parseRankParam('Top 10M')).toBe(10000000);
  });

  it('should handle case insensitivity and extra whitespace in rank labels', () => {
    expect(parseRankParam('top 100K')).toBe(100000);
    expect(parseRankParam('  top 10k  ')).toBe(10000);
    expect(parseRankParam('top 1m')).toBe(1000000);
    expect(parseRankParam('Top 1000')).toBe(1000);
  });

  it('should parse numeric strings and numbers', () => {
    expect(parseRankParam('10000')).toBe(10000);
    expect(parseRankParam(10000)).toBe(10000);
    expect(parseRankParam('100000')).toBe(100000);
  });

  it('should return null for non-numeric, unrecognized strings or NaN', () => {
    expect(parseRankParam('invalid')).toBeNull();
    expect(parseRankParam(NaN)).toBeNull();
  });
});
