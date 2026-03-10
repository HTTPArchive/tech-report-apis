import { describe, it, expect } from '@jest/globals';
import { validateTechnologyArray, FIRESTORE_IN_LIMIT } from '../utils/controllerHelpers.js';

describe('validateTechnologyArray', () => {
  it('should return an array for a valid comma-separated string', () => {
    const input = 'WordPress,Google Analytics,PHP';
    const result = validateTechnologyArray(input);
    expect(result).toEqual(['WordPress', 'Google Analytics', 'PHP']);
  });

  it('should return an array for a single technology string', () => {
    const input = 'WordPress';
    const result = validateTechnologyArray(input);
    expect(result).toEqual(['WordPress']);
  });

  it('should return an empty array for null input', () => {
    const result = validateTechnologyArray(null);
    expect(result).toEqual([]);
  });

  it('should return an empty array for undefined input', () => {
    const result = validateTechnologyArray(undefined);
    expect(result).toEqual([]);
  });

  it('should return an empty array for an empty string', () => {
    const result = validateTechnologyArray('');
    expect(result).toEqual([]);
  });

  it('should return null when the number of technologies exceeds FIRESTORE_IN_LIMIT', () => {
    // Create a string with FIRESTORE_IN_LIMIT + 1 technologies
    const technologies = Array(FIRESTORE_IN_LIMIT + 1).fill('tech').join(',');
    const result = validateTechnologyArray(technologies);
    expect(result).toBeNull();
  });

  it('should return an array when the number of technologies is exactly FIRESTORE_IN_LIMIT', () => {
    const technologiesArray = Array(FIRESTORE_IN_LIMIT).fill('tech');
    const technologiesString = technologiesArray.join(',');
    const result = validateTechnologyArray(technologiesString);
    expect(result).toHaveLength(FIRESTORE_IN_LIMIT);
    expect(result).toEqual(technologiesArray);
  });

  it('should handle URL encoded technologies', () => {
    const input = 'Google%20Analytics,WordPress';
    const result = validateTechnologyArray(input);
    expect(result).toEqual(['Google Analytics', 'WordPress']);
  });
});
