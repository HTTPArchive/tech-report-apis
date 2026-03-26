import { describe, it, expect } from '@jest/globals';
import { convertToArray } from '../utils/helpers.js';

describe('convertToArray', () => {
  it('should return an empty array for falsy values', () => {
    expect(convertToArray(null)).toEqual([]);
    expect(convertToArray(undefined)).toEqual([]);
    expect(convertToArray('')).toEqual([]);
  });

  it('should return the original array if an array is passed', () => {
    const arr = ['a', 'b', 'c'];
    expect(convertToArray(arr)).toBe(arr);
  });

  it('should parse a comma-separated string into an array of trimmed strings', () => {
    expect(convertToArray('a,b,c')).toEqual(['a', 'b', 'c']);
    expect(convertToArray(' a , b , c ')).toEqual(['a', 'b', 'c']);
  });

  it('should filter out empty strings', () => {
    expect(convertToArray('a,,c, ')).toEqual(['a', 'c']);
  });

  it('should handle URL encoded strings', () => {
    expect(convertToArray('a%20b,c')).toEqual(['a b', 'c']);
    expect(convertToArray('a%2C%20b,c')).toEqual(['a', 'b', 'c']);
  });

  it('should handle invalid URL encoded strings gracefully', () => {
    expect(convertToArray('a%,b')).toEqual(['a%', 'b']);
  });
});
