import { firestore } from '../utils/db.js';
import { handleControllerError, generateQueryCacheKey, getCachedQueryResult, setCachedQueryResult } from '../utils/controllerHelpers.js';

/**
 * List all rank options from database
 */
const listRanks = async (req, res) => {
  try {
    // Generate cache key for this query
    const cacheKey = generateQueryCacheKey('ranks', { orderBy: 'mobile_origins' });

    // Check cache first
    const cachedResult = getCachedQueryResult(cacheKey);
    if (cachedResult) {
      res.statusCode = 200;
      res.end(JSON.stringify(cachedResult));
      return;
    }

    const snapshot = await firestore.collection('ranks').orderBy('mobile_origins', 'desc').get();
    const data = [];

    // Extract only the 'rank' property from each document
    snapshot.forEach(doc => {
      const docData = doc.data();
      data.push({ rank: docData.rank });
    });

    // Cache the result
    setCachedQueryResult(cacheKey, data);

    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    handleControllerError(res, error, 'fetching ranks');
  }
};

export {
  listRanks
};
