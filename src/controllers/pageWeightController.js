import { firestoreOld } from '../utils/db.js';
const firestore = firestoreOld;

import {
  getLatestDate,
  generateQueryCacheKey,
  getCachedQueryResult,
  setCachedQueryResult
} from '../utils/controllerHelpers.js';

const TABLE = 'page_weight';

/**
 * List Page Weight data with filtering
 */
const listPageWeightData = async (req, res) => {
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

    // Build query
    let query = firestore.collection(TABLE);

    // Apply required filters
    query = query.where('geo', '==', params.geo);
    query = query.where('rank', '==', params.rank);

    // Apply technology filter
    if (techArray.length <= 30) {
      // Use 'in' operator for batch processing (Firestore limit: 30 values)
      query = query.where('technology', 'in', techArray);
    } else {
      res.statusCode = 400;
      res.end(JSON.stringify({
        success: false,
        errors: [{ technology: 'Too many technologies specified. Maximum 30 allowed.' }]
      }));
      return;
    }

    // Apply date filters
    if (startDate) query = query.where('date', '>=', startDate);
    if (params.end) query = query.where('date', '<=', params.end);

    // Apply field projection to exclude geo/rank and select only needed fields
    query = query.select('date', 'technology', 'pageWeight');

    // Execute query
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
    console.error('Error fetching Page Weight data:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({
      errors: [{ error: 'Failed to fetch Page Weight data' }]
    }));
  }
};

export {
  listPageWeightData
};
