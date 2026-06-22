import { describe, it, expect } from '@jest/globals';
import { convertToArray } from '../utils/helpers.js';

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
