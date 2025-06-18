import { convertToArray } from './helpers.js';

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
 * Send error response for missing parameters
 * @param {Object} res - Response object
 * @param {Array} errors - Array of error tuples
 */
const sendValidationError = (res, errors) => {
  res.statusCode = 400;
  res.end(JSON.stringify({
    success: false,
    errors: errors.map(([key, message]) => ({ [key]: message }))
  }));
};

// Cache for latest dates to avoid repeated queries
const latestDateCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

const queryResultCache = new Map();
const QUERY_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Cache size limit
const MAX_CACHE_SIZE = 5000; // Maximum number of cache entries

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
 * Validate array parameter against Firestore limit
 * @param {string} value - Comma-separated values or single value
 * @param {string} fieldName - Field name for error messages (optional)
 * @returns {Array} - Validated array
 * @throws {Error} - If array exceeds Firestore limit
 */
const validateArrayParameter = (value, fieldName = 'parameter') => {
  if (!value) return [];

  const valueArray = convertToArray(value);

  if (valueArray.length > FIRESTORE_IN_LIMIT) {
    throw new Error(`Too many values specified for ${fieldName}. Maximum ${FIRESTORE_IN_LIMIT} allowed.`);
  }

  return valueArray;
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
      maxQueryCacheSize: MAX_CACHE_SIZE,
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
  const statusCode = error.statusCode || 500;
  res.statusCode = statusCode;

  // Use custom error message for client errors (4xx), generic message for server errors (5xx)
  const errorMessage = statusCode >= 400 && statusCode < 500 ? error.message : `Failed to ${operation}`;

  res.end(JSON.stringify({
    errors: [{ error: errorMessage }]
  }));
};

/**
 * Generic cache-enabled query executor
 * Handles caching, query execution, and response for simple queries
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} collection - Firestore collection name
 * @param {Function} queryBuilder - Function to build the query
 * @param {Function} dataProcessor - Optional function to process results
 */
const executeQuery = async (req, res, collection, queryBuilder, dataProcessor = null, customCacheKeyData = null) => {
  try {
    const params = req.query;

    // Generate cache key with custom data if provided
    const cacheKeyData = customCacheKeyData ? { ...params, ...customCacheKeyData } : params;
    const cacheKey = generateQueryCacheKey(collection, cacheKeyData);

    // Check cache first
    const cachedResult = getCachedQueryResult(cacheKey);
    if (cachedResult) {
      res.statusCode = 200;
      res.end(JSON.stringify(cachedResult));
      return;
    }

    // Build and execute query
    const query = await queryBuilder(params);
    const snapshot = await query.get();

    let data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });

    // Process data if processor provided
    if (dataProcessor) {
      data = dataProcessor(data, params);
    }

    // Cache the result
    setCachedQueryResult(cacheKey, data);

    // Send response
    res.statusCode = 200;
    res.end(JSON.stringify(data));

  } catch (error) {
    // Handle validation errors specifically
    if (error.message.includes('Too many technologies')) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        success: false,
        errors: [{ technology: error.message }]
      }));
      return;
    }

    handleControllerError(res, error, `querying ${collection}`);
  }
};

// Firestore 'in' operator limit
const FIRESTORE_IN_LIMIT = 30;

/**
 * Technology array validation helper (backward compatibility wrapper)
 * @param {string} technologyParam - Comma-separated technology string
 * @returns {Array|null} - Array of technologies or null if too many
 */
const validateTechnologyArray = (technologyParam) => {
  try {
    return validateArrayParameter(technologyParam, 'technology');
  } catch (error) {
    return null; // Maintain backward compatibility - return null on validation failure
  }
};

/**
 * Reset all caches
 * @returns {Object} Reset operation result
 */
const resetCache = () => {
  const beforeStats = {
    queryCache: queryResultCache.size,
    dateCache: latestDateCache.size
  };

  // Clear both caches
  queryResultCache.clear();
  latestDateCache.clear();

  return {
    success: true,
    message: 'All caches have been reset',
    before: beforeStats,
    after: {
      queryCache: queryResultCache.size,
      dateCache: latestDateCache.size
    }
  };
};

export {
  REQUIRED_PARAMS,
  FIRESTORE_IN_LIMIT,
  validateRequiredParams,
  sendValidationError,
  getLatestDate,
  validateArrayParameter,
  handleControllerError,
  generateQueryCacheKey,
  getCachedQueryResult,
  setCachedQueryResult,
  getCacheStats,
  executeQuery,
  validateTechnologyArray,
  resetCache
};
