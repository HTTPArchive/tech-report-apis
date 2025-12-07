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

/**
 * Get the latest date from a collection
 * @param {Object} firestore - Firestore instance
 * @param {string} collection - Collection name
 * @returns {string|null} - Latest date or null
 */
const getLatestDate = async (firestore, collection) => {
  // Query for latest date
  const query = firestore.collection(collection).orderBy('date', 'desc').limit(1);
  const snapshot = await query.get();

  if (!snapshot.empty) {
    return snapshot.docs[0].data().date;
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
    throw new Error(`Too many values specified for ${fieldName}. Maximum ${FIRESTORE_IN_LIMIT} allowed.`);
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

export {
  REQUIRED_PARAMS,
  FIRESTORE_IN_LIMIT,
  validateRequiredParams,
  sendValidationError,
  getLatestDate,
  validateArrayParameter,
  handleControllerError,
  executeQuery,
  validateTechnologyArray
};
