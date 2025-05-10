const { createSuccessResponse, createErrorResponse } = require('../utils/helpers');

// Ranks data from the existing Python implementation
const RANKS = [
    {"num_origins": "9731427", "rank": "ALL"},
    {"num_origins": "7232806", "rank": "Top 10M"},
    {"num_origins": "881817", "rank": "Top 1M"},
    {"num_origins": "91410", "rank": "Top 100k"},
    {"num_origins": "9524", "rank": "Top 10k"},
    {"num_origins": "965", "rank": "Top 1k"},
];

/**
 * List all rank options
 */
const listRanks = async (req, res) => {
  try {
    res.status(200).send(createSuccessResponse(RANKS));
  } catch (error) {
    console.error('Error fetching ranks:', error);
    res.status(400).send(createErrorResponse([['query', error.message]]));
  }
};

module.exports = {
  listRanks
};
