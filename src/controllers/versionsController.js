const { firestore } = require('../utils/db');
const { createSuccessResponse } = require('../utils/helpers');
const { applyArrayFilter, handleControllerError } = require('../utils/controllerHelpers');

/**
 * List versions with optional technology filtering
 */
const listVersions = async (req, res) => {
  try {
    const params = req.query;
    let query = firestore.collection('versions');

    // Apply technology filter using shared utility
    query = applyArrayFilter(query, 'technology', params.technology);

    // Execute query
    const snapshot = await query.get();
    const data = [];

    // Extract all version documents
    snapshot.forEach(doc => {
      data.push(doc.data());
    });

    // Send response
    res.statusCode = 200;
    res.end(JSON.stringify(createSuccessResponse(data)));
  } catch (error) {
    handleControllerError(res, error, 'fetching versions');
  }
};

module.exports = {
  listVersions
};
