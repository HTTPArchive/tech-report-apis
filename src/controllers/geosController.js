import { firestore } from '../utils/db.js';
import { createSuccessResponse } from '../utils/helpers.js';
import { handleControllerError } from '../utils/controllerHelpers.js';

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

export {
  listGeos
};
