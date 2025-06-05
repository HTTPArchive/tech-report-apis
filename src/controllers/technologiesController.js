import { firestore } from '../utils/db.js';
import {
  applyArrayFilter,
  generateQueryCacheKey,
  getCachedQueryResult,
  setCachedQueryResult
} from '../utils/controllerHelpers.js';

/**
 * List technologies with optional filtering and field selection
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

    if (isOnlyNames) {
      // Only select technology field for names-only queries
      query = query.select('technology');
    } else if (hasCustomFields) {
      // Select only requested fields
      const requestedFields = params.fields.split(',').map(f => f.trim());
      query = query.select(...requestedFields);
    } else {
      // Select default presentation fields
      query = query.select('technology', 'category', 'description', 'icon', 'origins');
    }

    // Execute query
    const snapshot = await query.get();
    let data = [];

    // Process results based on response type
    snapshot.forEach(doc => {
      const docData = doc.data();

      if (isOnlyNames) {
        data.push(docData.technology);
      } else {
        // Data already filtered by select(), just return it
        data.push(docData)
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
