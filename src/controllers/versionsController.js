const firestore = require('../utils/db');
const { convertToArray, createSuccessResponse, createErrorResponse } = require('../utils/helpers');

/**
 * List versions with optional technology filtering
 */
const listVersions = async (req, res) => {
  try {
    const params = req.query;
    let ref = firestore.collection('versions');
    let query = ref;

    // Filter by technology if provided
    if (params.technology) {
      const technologyArray = convertToArray(params.technology);
      if (technologyArray.length > 0) {
        // Using 'in' operator for filtering by technology names
        query = query.where('technology', 'in', technologyArray);
      }
    }

    // Execute query
    const snapshot = await query.get();
    const data = [];

    // Extract all version documents
    snapshot.forEach(doc => {
      data.push(doc.data());
    });

    res.statusCode = 200;
    res.end(JSON.stringify(createSuccessResponse(data)));
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.statusCode = 400;
    res.end(JSON.stringify(createErrorResponse([['query', error.message]])));
  }
};

module.exports = {
  listVersions
};
