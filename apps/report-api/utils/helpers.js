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

/**
 * Parses a rank parameter into a numeric ceiling integer.
 * Accepts numeric strings/numbers ("10000", 10000) or standard rank labels
 * ("Top 1k", "Top 10k", "Top 100k", "Top 1M", "Top 10M", "top 1000").
 * Returns null if rank is missing, 'ALL', or invalid.
 *
 * @param {string|number} rank - The rank parameter to parse
 * @returns {number|null} The numeric rank ceiling or null
 */
const parseRankParam = (rank) => {
  if (!rank || rank === 'ALL') return null;
  if (typeof rank === 'number') return isNaN(rank) ? null : rank;

  const match = String(rank).trim().match(/^top\s*(\d+)\s*([km]?)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multiplier = unit === 'm' ? 1_000_000 : unit === 'k' ? 1_000 : 1;
    return num * multiplier;
  }

  const parsed = parseInt(rank, 10);
  return isNaN(parsed) ? null : parsed;
};

export { convertToArray, parseRankParam };
