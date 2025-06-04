/**
 * Utility functions for API requests and responses
 */

/**
 * Converts a comma-separated string to an array
 * @param {string} dataString - The string to convert
 * @returns {string[]} The resulting array
 */
const convertToArray = (dataString) => {
  if (!dataString) return [];

  // URL decode and split by comma
  const decoded = decodeURIComponent(dataString);
  return decoded.split(',');
};

/**
 * Converts error arrays to hash format
 * @param {Array<Array<string>>} arr - Array of [key, message] arrays
 * @returns {Array<Object>} Array of {key: message} objects
 */
const convertToHashes = (arr) => {
  return arr.map(([key, message]) => ({ [key]: message }));
};


export { convertToArray, convertToHashes };
