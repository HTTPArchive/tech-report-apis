const firestore = require('../utils/db');
const { createSuccessResponse, createErrorResponse } = require('../utils/helpers');

/**
 * List all rank options from database
 */
const listRanks = async (req, res) => {
  try {
    const snapshot = await firestore.collection('ranks').orderBy('mobile_origins', 'desc').get();
    const data = [];

    // Extract only the 'rank' property from each document
    snapshot.forEach(doc => {
      const docData = doc.data();
      data.push({ rank: docData.rank });
    });

    res.statusCode = 200;
    res.end(JSON.stringify(createSuccessResponse(data)));
  } catch (error) {
    console.error('Error fetching ranks:', error);
    res.statusCode = 400;
    res.end(JSON.stringify(createErrorResponse([['query', error.message]])));
  }
};

module.exports = {
  listRanks
};
