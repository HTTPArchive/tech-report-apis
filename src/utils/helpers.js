/**
 * Converts a comma-separated string to an array
 * @param {string} dataString - The string to convert
 * @returns {string[]} The resulting array
 */
const convertToArray = (dataString) => {
  if (!dataString) return [];

  // URL decode and split by comma
  return decodeURIComponent(dataString).split(',');
};

export { convertToArray };
