import { firestore } from '../utils/db.js';
import {
  applyArrayFilter,
  selectFields,
  generateQueryCacheKey,
  getCachedQueryResult,
  setCachedQueryResult
} from '../utils/controllerHelpers.js';

// Technology Presenter - optimized with destructuring
const presentTechnology = ({ technology, category, description, icon, origins }) => ({
  technology,
  category,
  description,
  icon,
  origins
});

/**
 * List technologies with optional filtering and field selection - Optimized version
 */
const listTechnologies = async (req, res) => {
  try {
    const params = req.query;
    const isOnlyNames = params.onlyname || typeof params.onlyname === 'string';
    const hasCustomFields = params.fields && !isOnlyNames;

    // Create cache key for this specific query
    const queryFilters = {
      technology: params.technology,
      category: params.category,
      onlyname: isOnlyNames,
      fields: params.fields
    };
    const cacheKey = generateQueryCacheKey('technologies', queryFilters);

    // Check cache first
    const cachedResult = getCachedQueryResult(cacheKey);
    if (cachedResult) {
      res.statusCode = 200;
      res.end(JSON.stringify(cachedResult));
      return;
    }

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

    // Cache the result
    setCachedQueryResult(cacheKey, data);

    // Direct response
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    console.error('Error fetching technologies:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({
      errors: [{ error: 'Failed to fetch technologies' }]
    }));
  }
};

export {
  listTechnologies
};
