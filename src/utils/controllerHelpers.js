import { convertToHashes, convertToArray } from './helpers.js';

/**
 * Common parameter validation patterns
 */
const REQUIRED_PARAMS = {
  TECHNOLOGY: 'technology',
  GEO: 'geo',
  RANK: 'rank',
  VERSION: 'version'
};

/**
 * Validate required parameters for a request
 * @param {Object} params - Request query parameters
 * @param {Array} required - Array of required parameter names
 * @returns {Array|null} - Array of errors or null if valid
 */
const validateRequiredParams = (params, required) => {
  const errors = [];

  for (const param of required) {
    if (!params[param]) {
      errors.push([param, `missing ${param} parameter`]);
    }
  }

  return errors.length > 0 ? errors : null;
};


/**
 * Creates an error response object
 * @param {Array<Array<string>>} errors - Array of [key, message] arrays
 * @returns {Object} Error response object
 */
const createErrorResponse = (errors) => {
  return {
    success: false,
    errors: convertToHashes(errors)
  };
};

/**
 * Send error response for missing parameters
 * @param {Object} res - Response object
 * @param {Array} errors - Array of error tuples
 */
const sendValidationError = (res, errors) => {
  res.statusCode = 400;
  res.end(JSON.stringify(createErrorResponse(errors)));
};

// Cache for latest dates to avoid repeated queries
const latestDateCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Cache for query results to eliminate bimodal performance
const queryResultCache = new Map();
const QUERY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for query results

// Cache size limit
const MAX_CACHE_SIZE = 3000; // Maximum number of cache entries

/**
 * Clean up cache when it exceeds size limit (LRU-style cleanup)
 * Removes oldest entries first, including expired ones
 */
const cleanupCacheToSize = () => {
  const targetSize = Math.floor(MAX_CACHE_SIZE * 0.5); // Clean to 50% of max size
  if (queryResultCache.size <= targetSize) return 0;

  const now = Date.now();
  const entries = Array.from(queryResultCache.entries());

  // Sort by timestamp (oldest first), prioritizing expired entries
  entries.sort((a, b) => {
    const aExpired = (now - a[1].timestamp) > QUERY_CACHE_TTL;
    const bExpired = (now - b[1].timestamp) > QUERY_CACHE_TTL;

    // If one is expired and the other isn't, prioritize expired for deletion
    if (aExpired && !bExpired) return -1;
    if (!aExpired && bExpired) return 1;

    // If both have same expiry status, sort by timestamp (oldest first)
    return a[1].timestamp - b[1].timestamp;
  });

  const deleteCount = queryResultCache.size - targetSize;
  for (let i = 0; i < deleteCount && i < entries.length; i++) {
    queryResultCache.delete(entries[i][0]);
  }
};

/**
 * Generate a cache key for a query
 * @param {string} collection - Collection name
 * @param {Object} filters - Query filters
 * @returns {string} - Cache key
 */
const generateQueryCacheKey = (collection, filters) => {
  return `${collection}:${JSON.stringify(filters)}`;
};

/**
 * Get cached query result if available and not expired
 * @param {string} cacheKey - Cache key
 * @returns {Array|null} - Cached result or null
 */
const getCachedQueryResult = (cacheKey) => {
  const cached = queryResultCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < QUERY_CACHE_TTL) {
    return cached.data;
  }
  return null;
};

/**
 * Cache a query result
 * @param {string} cacheKey - Cache key
 * @param {Array} data - Query result data
 */
const setCachedQueryResult = (cacheKey, data) => {
  // Clean up if cache is getting too large before adding new entry
  if (queryResultCache.size >= MAX_CACHE_SIZE) {
    cleanupCacheToSize();
  }

  queryResultCache.set(cacheKey, {
    data: data,
    timestamp: Date.now()
  });
};

/**
 * Get the latest date from a collection with caching
 * @param {Object} firestore - Firestore instance
 * @param {string} collection - Collection name
 * @returns {string|null} - Latest date or null
 */
const getLatestDate = async (firestore, collection) => {
  const now = Date.now();
  const cacheKey = collection;
  const cached = latestDateCache.get(cacheKey);

  // Check if we have a valid cached result
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.date;
  }

  // Query for latest date
  const query = firestore.collection(collection).orderBy('date', 'desc').limit(1);
  const snapshot = await query.get();

  let latestDate = null;
  if (!snapshot.empty) {
    latestDate = snapshot.docs[0].data().date;
  }

  // Cache the result
  latestDateCache.set(cacheKey, {
    date: latestDate,
    timestamp: now
  });

  return latestDate;
};

/**
 * Apply date filters to a query
 * @param {Object} query - Firestore query
 * @param {Object} params - Request parameters
 * @returns {Object} - Modified query
 */
const applyDateFilters = (query, params) => {
  if (params.start) {
    query = query.where('date', '>=', params.start);
  }
  if (params.end) {
    query = query.where('date', '<=', params.end);
  }
  return query;
};

/**
 * Apply standard filters (geo, rank, technology, version) to a query
 * @param {Object} query - Firestore query
 * @param {Object} params - Request parameters
 * @param {string} technology - Technology name
 * @param {Array} techArray - Array of technologies (used for version filtering)
 * @returns {Object} - Modified query
 */
const applyStandardFilters = (query, params, technology, techArray = []) => {
  if (params.geo) {
    query = query.where('geo', '==', params.geo);
  }
  if (params.rank) {
    query = query.where('rank', '==', params.rank);
  }
  if (technology) {
    query = query.where('technology', '==', technology);
  }

  // Apply version filter with special handling for 'ALL' case
  if (params.version && techArray.length === 1) {
    //query = query.where('version', '==', params.version); // TODO: Uncomment when migrating to a new data schema
  } else {
    //query = query.where('version', '==', 'ALL');
  }

  return query;
};

/**
 * Process technology array and handle 'latest' date substitution
 * @param {Object} firestore - Firestore instance
 * @param {Object} params - Request parameters
 * @param {string} collection - Collection name
 * @returns {Object} - Processed parameters and tech array
 */
const preprocessParams = async (firestore, params, collection) => {
  // Handle 'latest' special value for start parameter
  if (params.start && params.start === 'latest') {
    params.start = await getLatestDate(firestore, collection);
  }

  // Handle version 'ALL' special case for multiple technologies
  const techArray = convertToArray(params.technology);
  if (!params.version || techArray.length > 1) {
    params.version = 'ALL';
  }

  return { params, techArray };
};

/**
 * Apply array-based filters using 'in' or 'array-contains-any' operators
 * @param {Object} query - Firestore query
 * @param {string} field - Field name to filter on
 * @param {string} value - Comma-separated values or single value
 * @param {string} operator - Firestore operator ('in' or 'array-contains-any')
 * @returns {Object} - Modified query
 */
const applyArrayFilter = (query, field, value, operator = 'in') => {
  if (!value) return query;
  const valueArray = convertToArray(value);

  if (valueArray.length > 0) {
    query = query.where(field, operator, valueArray);
  }

  return query;
};

/**
 * Select specific fields from an object based on comma-separated field names
 * @param {Object} data - Source data object
 * @param {string} fieldsParam - Comma-separated field names (e.g., "technology,category")
 * @returns {Object} - Object containing only requested fields
 */
const selectFields = (data, fieldsParam) => {
  if (!fieldsParam) return data;

  const fields = convertToArray(fieldsParam);

  if (fields.length === 0) return data;

  const result = {};
  fields.forEach(field => {
    if (data.hasOwnProperty(field)) {
      result[field] = data[field];
    }
  });

  return result;
};

/**
 * Get cache statistics for monitoring
 * @returns {Object} Cache statistics
 */
const getCacheStats = () => {
  const now = Date.now();

  // Count valid vs expired entries
  let queryValidCount = 0;
  let queryExpiredCount = 0;
  for (const [key, value] of queryResultCache) {
    if (now - value.timestamp < QUERY_CACHE_TTL) {
      queryValidCount++;
    } else {
      queryExpiredCount++;
    }
  }

  let dateValidCount = 0;
  let dateExpiredCount = 0;
  for (const [key, value] of latestDateCache) {
    if (now - value.timestamp < CACHE_TTL) {
      dateValidCount++;
    } else {
      dateExpiredCount++;
    }
  }

  return {
    queryCache: {
      total: queryResultCache.size,
      valid: queryValidCount,
      expired: queryExpiredCount,
      ttl: QUERY_CACHE_TTL
    },
    dateCache: {
      total: latestDateCache.size,
      valid: dateValidCount,
      expired: dateExpiredCount,
      ttl: CACHE_TTL
    },
    config: {
      maxCacheSize: MAX_CACHE_SIZE,
      cleanupStrategy: 'size-based-lru'
    }
  };
};

/**
 * Handle controller errors with consistent error response format
 * @param {Object} res - Response object
 * @param {Error} error - Error object
 * @param {string} operation - Description of the operation that failed
 */
const handleControllerError = (res, error, operation) => {
  console.error(`Error ${operation}:`, error);
  res.statusCode = 500;
  res.end(JSON.stringify({
    errors: [{ error: `Failed to ${operation}` }]
  }));
};

export {
  REQUIRED_PARAMS,
  validateRequiredParams,
  sendValidationError,
  getLatestDate,
  applyDateFilters,
  applyStandardFilters,
  preprocessParams,
  applyArrayFilter,
  selectFields,
  handleControllerError,
  generateQueryCacheKey,
  getCachedQueryResult,
  setCachedQueryResult,
  getCacheStats
};
