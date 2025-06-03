const firestore = require('../utils/db');
const { createSuccessResponse } = require('../utils/helpers');
const { handleControllerError } = require('../utils/controllerHelpers');

/**
 * List all geographic locations from database
 */
const listGeos = async (req, res) => {
  try {
    const snapshot = await firestore.collection('geos').orderBy('mobile_origins', 'desc').get();
    const data = [];

    // Extract only the 'geo' property from each document
    snapshot.forEach(doc => {
      data.push({ geo: doc.data().geo });
    });

    res.statusCode = 200;
    res.end(JSON.stringify(createSuccessResponse(data)));
  } catch (error) {
    handleControllerError(res, error, 'fetching geographic locations');
  }
};

module.exports = {
  listGeos
};
