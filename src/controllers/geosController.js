const firestore = require('../utils/db');
const { createSuccessResponse, createErrorResponse } = require('../utils/helpers');

/**
 * List all geographic locations from database
 */
const listGeos = async (req, res) => {
  try {
    const snapshot = await firestore.collection('geos').orderBy('mobile_origins', 'desc').get();
    const data = [];

    // Extract only the 'geo' property from each document
    snapshot.forEach(doc => {
      const docData = doc.data();
      data.push({ geo: docData.geo });
    });

    res.statusCode = 200;
    res.end(JSON.stringify(createSuccessResponse(data)));
  } catch (error) {
    console.error('Error fetching geographic locations:', error);
    res.statusCode = 400;
    res.end(JSON.stringify(createErrorResponse([['query', error.message]])));
  }
};

module.exports = {
  listGeos
};
