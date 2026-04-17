import crypto from 'crypto';
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

const LATEST_DATE_CACHE_TTL = 3600000; // 1 hour in milliseconds
const latestDateCache = new Map();

/**
 * Get the latest date from a collection
 * @param {Object} firestore - Firestore instance
 * @param {string} collection - Collection name
 * @returns {string|null} - Latest date or null
 */
const getLatestDate = async (firestore, collection) => {
  const now = Date.now();
  const cached = latestDateCache.get(collection);

  // Return cached date if it exists and hasn't expired
  if (cached && (now - cached.timestamp < LATEST_DATE_CACHE_TTL)) {
    return cached.date;
  }

  // Query for latest date
  const query = firestore.collection(collection).orderBy('date', 'desc').limit(1);
  const snapshot = await query.get();

  if (!snapshot.empty) {
    const date = snapshot.docs[0].data().date;
    // Update cache
    latestDateCache.set(collection, { date, timestamp: now });
    return date;
  }

  return null;
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
    const error = new Error(`Too many values specified for ${fieldName}. Maximum ${FIRESTORE_IN_LIMIT} allowed.`);
    error.statusCode = 400;
    throw error;
  }

  return valueArray;
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

const generateETag = (jsonData) => {
  return crypto.createHash('md5').update(jsonData).digest('hex');
};

const sendJSONResponse = (req, res, data, statusCode = 200) => {
  const jsonData = JSON.stringify(data);
  const etag = generateETag(jsonData);
  res.setHeader('ETag', `"${etag}"`);
  if (!isModified(req, etag)) {
    res.statusCode = 304;
    res.end();
    return;
  }
  res.statusCode = statusCode;
  res.end(jsonData);
};

const isModified = (req, etag) => {
  const ifNoneMatch = req.headers['if-none-match'] || (req.get && req.get('if-none-match'));
  return !ifNoneMatch || ifNoneMatch !== `"${etag}"`;
};

/**
 * Generic query executor
 * Handles query execution and response for simple queries
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} collection - Firestore collection name
 * @param {Function} queryBuilder - Function to build the query
 * @param {Function} dataProcessor - Optional function to process results
 */
const executeQuery = async (req, res, collection, queryBuilder, dataProcessor = null) => {
  try {
    const params = req.query;

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

    // Send response with ETag support
    sendJSONResponse(req, res, data);

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

export {
  REQUIRED_PARAMS,
  FIRESTORE_IN_LIMIT,
  validateRequiredParams,
  sendValidationError,
  getLatestDate,
  validateArrayParameter,
  handleControllerError,
  executeQuery,
  validateTechnologyArray,
  generateETag,
  sendJSONResponse,
  isModified
};
