const firestore = require('../utils/db');
const { createSuccessResponse } = require('../utils/helpers');
const { applyArrayFilter, selectFields, handleControllerError } = require('../utils/controllerHelpers');

// Technology Presenter - optimized with destructuring
const presentTechnology = ({ technology, category, description, icon, origins }) => ({
  technology,
  category,
  description,
  icon,
  origins
});

/**
 * List technologies with optional filtering and field selection
 */
const listTechnologies = async (req, res) => {
  try {
    const params = req.query;
    const isOnlyNames = params.onlyname || typeof params.onlyname === 'string';
    const hasCustomFields = params.fields && !isOnlyNames;

    let query = firestore.collection('technologies').orderBy('technology', 'asc');

    // Apply filters using shared utilities
    query = applyArrayFilter(query, 'technology', params.technology);
    query = applyArrayFilter(query, 'category_obj', params.category, 'array-contains-any');

    // Execute query
    const snapshot = await query.get();
    const data = [];

    // Process results based on response type
    snapshot.forEach(doc => {
      if (isOnlyNames) {
        data.push(doc.get('technology'));
      } else if (hasCustomFields) {
        // Use custom field selection
        const fullData = doc.data();
        data.push(selectFields(fullData, params.fields));
      } else {
        // Use default presenter
        data.push(presentTechnology(doc.data()));
      }
    });

    // Send response
    res.statusCode = 200;
    res.end(JSON.stringify(createSuccessResponse(data)));
  } catch (error) {
    handleControllerError(res, error, 'fetching technologies');
  }
};

module.exports = {
  listTechnologies
};
