const { firestore } = require('../utils/db');
const { createSuccessResponse } = require('../utils/helpers');
const { handleControllerError } = require('../utils/controllerHelpers');

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
    handleControllerError(res, error, 'fetching ranks');
  }
};

module.exports = {
  listRanks
};
