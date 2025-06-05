import { firestore } from '../utils/db.js';
import {
  applyArrayFilter,
  generateQueryCacheKey,
  getCachedQueryResult,
  setCachedQueryResult
} from '../utils/controllerHelpers.js';

/**
 * List categories with optional filtering and field selection - Optimized version
 */
const listCategories = async (req, res) => {
  try {
    const params = req.query;
    const isOnlyNames = params.onlyname || typeof params.onlyname === 'string';
    const hasCustomFields = params.fields && !isOnlyNames;

    // Create cache key for this specific query
    const queryFilters = {
      category: params.category,
      onlyname: isOnlyNames,
      fields: params.fields
    };
    const cacheKey = generateQueryCacheKey('categories', queryFilters);

    // Check cache first
    const cachedResult = getCachedQueryResult(cacheKey);
    if (cachedResult) {
      res.statusCode = 200;
      res.end(JSON.stringify(cachedResult));
      return;
    }

    let query = firestore.collection('categories').orderBy('category', 'asc');

    // Apply category filter using shared utility
    query = applyArrayFilter(query, 'category', params.category);

    if (isOnlyNames) {
      // Only select category field for names-only queries
      query = query.select('category');
    } else if (hasCustomFields) {
      // Select only requested fields
      const requestedFields = params.fields.split(',').map(f => f.trim());
      query = query.select(...requestedFields);
    }

    // Execute query
    const snapshot = await query.get();
    const data = [];

    // Process results based on response type
    snapshot.forEach(doc => {
      const docData = doc.data();

      if (isOnlyNames) {
        data.push(docData.category);
      } else {
        // Data already filtered by select(), just return it
        data.push(docData);
      }
    });

    // Cache the result
    setCachedQueryResult(cacheKey, data);

    // Direct response
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({
      errors: [{ error: 'Failed to fetch categories' }]
    }));
  }
};

export { listCategories };
