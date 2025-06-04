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

/**
 * Creates a successful response object
 * @param {*} data - The data to return
 * @returns {Object} Success response object
 */
const createSuccessResponse = (data) => {
  return data;
};

/**
 * Creates an error response object
 * @param {Array<Array<string>>} errors - Array of [key, message] arrays
 * @returns {Object} Error response object
 */
const createErrorResponse = (errors) => {
  return {
    success: false,
    errors: convertToHashes(errors)
  };
};

export { convertToArray, createSuccessResponse, createErrorResponse };
