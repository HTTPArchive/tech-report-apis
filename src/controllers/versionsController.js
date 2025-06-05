import { firestore } from '../utils/db.js';
import { convertToArray } from '../utils/helpers.js';
import { handleControllerError, generateQueryCacheKey, getCachedQueryResult, setCachedQueryResult } from '../utils/controllerHelpers.js';

/**
 * List versions with optional technology filtering
 */
const listVersions = async (req, res) => {
  try {
    const params = req.query;

    // Generate cache key for this query
    const cacheKey = generateQueryCacheKey('versions', params);

    // Check cache first
    const cachedResult = getCachedQueryResult(cacheKey);
    if (cachedResult) {
      res.statusCode = 200;
      res.end(JSON.stringify(cachedResult));
      return;
    }

    let query = firestore.collection('versions');

    // Apply technology filter
    if (params.technology) {
      const technologies = convertToArray(params.technology);
      if (technologies.length <= 30) {
        // Use single query with 'in' operator for up to 30 technologies (Firestore limit)
        query = query.where('technology', 'in', technologies);
      } else {
        res.statusCode = 400;
        res.end(JSON.stringify({
          success: false,
          errors: [{ technology: 'Too many technologies specified. Maximum 30 allowed.' }]
        }));
        return;
      }
    }

    // Apply version filter
    if (params.version) {
      query = query.where('version', '==', params.version);
    }

    // Only select requested fields if specified
    if (params.fields) {
      const requestedFields = params.fields.split(',').map(f => f.trim());
      query = query.select(...requestedFields);
    }

    // Execute single query
    const snapshot = await query.get();
    const data = [];

    // Extract all version documents
    snapshot.forEach(doc => {
      data.push(doc.data());
    });

    // Cache the result
    setCachedQueryResult(cacheKey, data);

    // Send response
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    handleControllerError(res, error, 'fetching versions');
  }
};

export {
  listVersions
};
