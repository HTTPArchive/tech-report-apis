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

    // Apply technology filter - optimize for multiple technologies
    if (params.technology) {
      const technologies = convertToArray(params.technology);
      if (technologies.length <= 30) {
        // Use single query with 'in' operator for up to 30 technologies (Firestore limit)
        query = query.where('technology', 'in', technologies);
      } else {
        // For more than 30 technologies, split into multiple queries and run in parallel
        const chunks = [];
        for (let i = 0; i < technologies.length; i += 30) {
          chunks.push(technologies.slice(i, i + 30));
        }

        const promises = chunks.map(chunk =>
          firestore.collection('versions').where('technology', 'in', chunk).get()
        );

        const snapshots = await Promise.all(promises);
        const data = [];

        snapshots.forEach(snapshot => {
          snapshot.forEach(doc => {
            data.push(doc.data());
          });
        });

        // Cache the result
        setCachedQueryResult(cacheKey, data);

        res.statusCode = 200;
        res.end(JSON.stringify(data));
        return;
      }
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
