import { firestoreOld } from '../utils/db.js';
const firestore = firestoreOld;

import {
  getLatestDate,
  generateQueryCacheKey,
  getCachedQueryResult,
  setCachedQueryResult
} from '../utils/controllerHelpers.js';

const TABLE = 'adoption';

/**
 * List adoption data with filtering - Optimized version
 */
const listAdoptionData = async (req, res) => {
  try {
    const params = req.query;

    // Validate required parameters inline for speed
    if (!params.geo || !params.rank || !params.technology) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        success: false,
        errors: [
          ...(!params.geo ? [{ geo: 'missing geo parameter' }] : []),
          ...(!params.rank ? [{ rank: 'missing rank parameter' }] : []),
          ...(!params.technology ? [{ technology: 'missing technology parameter' }] : [])
        ]
      }));
      return;
    }

    // Fast preprocessing - handle 'latest' date and technology array
    const techArray = params.technology ? decodeURIComponent(params.technology).split(',') : [];

    // Handle 'latest' date with caching
    let startDate = params.start;
    if (startDate === 'latest') {
      startDate = await getLatestDate(firestore, TABLE);
    }

    // Create cache key for this specific query
    const queryFilters = {
      geo: params.geo,
      rank: params.rank,
      technology: techArray,
      startDate: startDate,
      endDate: params.end
    };
    const cacheKey = generateQueryCacheKey(TABLE, queryFilters);

    // Check cache first
    const cachedResult = getCachedQueryResult(cacheKey);
    if (cachedResult) {
      res.statusCode = 200;
      res.end(JSON.stringify(cachedResult));
      return;
    }

    // Build optimized query
    let query = firestore.collection(TABLE);

    // Apply required filters
    query = query.where('geo', '==', params.geo);
    query = query.where('rank', '==', params.rank);

    // Apply technology filter efficiently
    if (techArray.length <= 30) {
      // Use 'in' operator for batch processing (Firestore limit: 30 values)
      query = query.where('technology', 'in', techArray);
    } else {
      // Parallel queries for >30 technologies (rare case)
      const queryPromises = techArray.map(async (technology) => {
        let individualQuery = firestore.collection(TABLE)
          .where('geo', '==', params.geo)
          .where('rank', '==', params.rank)
          .where('technology', '==', technology);

        if (startDate) individualQuery = individualQuery.where('date', '>=', startDate);
        if (params.end) individualQuery = individualQuery.where('date', '<=', params.end);

        const snapshot = await individualQuery.get();
        const results = [];
        snapshot.forEach(doc => results.push(doc.data()));
        return results;
      });

      const results = await Promise.all(queryPromises);
      const data = results.flat();

      // Cache the result
      setCachedQueryResult(cacheKey, data);

      res.statusCode = 200;
      res.end(JSON.stringify(data));
      return;
    }

    // Apply date filters
    if (startDate) query = query.where('date', '>=', startDate);
    if (params.end) query = query.where('date', '<=', params.end);

    // Execute single optimized query
    const snapshot = await query.get();
    const data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });

    // Cache the result
    setCachedQueryResult(cacheKey, data);

    // Direct response without wrapper functions
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    console.error('Error fetching adoption data:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({
      errors: [{ error: 'Failed to fetch adoption data' }]
    }));
  }
};

export {
  listAdoptionData
};
