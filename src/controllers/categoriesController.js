const { firestore } = require('../utils/db');
const { createSuccessResponse } = require('../utils/helpers');
const { applyArrayFilter, selectFields, handleControllerError } = require('../utils/controllerHelpers');

/**
 * List categories with optional filtering and field selection
 */
const listCategories = async (req, res) => {
  try {
    const params = req.query;
    const isOnlyNames = params.onlyname || typeof params.onlyname === 'string';
    const hasCustomFields = params.fields && !isOnlyNames;

    let query = firestore.collection('categories').orderBy('category', 'asc');

    // Apply category filter using shared utility
    query = applyArrayFilter(query, 'category', params.category);

    // Execute query
    const snapshot = await query.get();
    const data = [];

    // Process results based on response type
    snapshot.forEach(doc => {
      if (isOnlyNames) {
        data.push(doc.get('category'));
      } else if (hasCustomFields) {
        // Use custom field selection
        const fullData = doc.data();
        data.push(selectFields(fullData, params.fields));
      } else {
        // Return full data
        data.push(doc.data());
      }
    });

    // Send response
    res.statusCode = 200;
    res.end(JSON.stringify(createSuccessResponse(data)));
  } catch (error) {
    handleControllerError(res, error, 'fetching categories');
  }
};

module.exports = {
  listCategories
};
