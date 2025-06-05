import { firestore } from '../utils/db.js';
import { handleControllerError, generateQueryCacheKey, getCachedQueryResult, setCachedQueryResult } from '../utils/controllerHelpers.js';

/**
 * List all geographic locations from database
 */
const listGeos = async (req, res) => {
  try {
    // Generate cache key for this query
    const cacheKey = generateQueryCacheKey('geos', { orderBy: 'mobile_origins' });

    // Check cache first
    const cachedResult = getCachedQueryResult(cacheKey);
    if (cachedResult) {
      res.statusCode = 200;
      res.end(JSON.stringify(cachedResult));
      return;
    }

    const snapshot = await firestore.collection('geos').orderBy('mobile_origins', 'desc').select('geo').get();
    const data = [];

    // Extract only the 'geo' property from each document
    snapshot.forEach(doc => {
      data.push(doc.data());
    });

    // Cache the result
    setCachedQueryResult(cacheKey, data);

    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    handleControllerError(res, error, 'fetching geographic locations');
  }
};

export {
  listGeos
};
