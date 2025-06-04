import { firestoreOld } from '../utils/db.js';
const firestore = firestoreOld;

import {
  getLatestDate
} from '../utils/controllerHelpers.js';

const TABLE = 'core_web_vitals';

/**
 * List Core Web Vitals data with filtering - Optimized version
 */
const listCWVTechData = async (req, res) => {
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
      // Parallel queries for >10 technologies (rare case)
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

    // Direct response without wrapper functions
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    console.error('Error fetching Core Web Vitals data:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({
      errors: [{ error: 'Failed to fetch Core Web Vitals data' }]
    }));
  }
};

export {
  listCWVTechData
};
