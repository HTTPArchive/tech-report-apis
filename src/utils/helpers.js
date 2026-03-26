/**
 * Converts a comma-separated string to an array
 * @param {string|string[]} dataString - The string to convert
 * @returns {string[]} The resulting array
 */
const convertToArray = (dataString) => {
  if (!dataString) return [];

  if (Array.isArray(dataString)) return dataString;

  try {
    return decodeURIComponent(dataString)
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  } catch (e) {
    return dataString
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
};

export { convertToArray };
