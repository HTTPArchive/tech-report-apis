import { firestore } from '../utils/db.js';
import { executeQuery, validateArrayParameter } from '../utils/controllerHelpers.js';

/**
 * List categories with optional filtering and field selection
 */
const listCategories = async (req, res) => {
  const queryBuilder = async (params) => {
    /*
    // Validate parameters
    const supportedParams = ['category', 'onlyname', 'fields', 'client'];
    const providedParams = Object.keys(params);
    const unsupportedParams = providedParams.filter(param => !supportedParams.includes(param));

    if (unsupportedParams.length > 0) {
      const error = new Error(`Unsupported parameters: ${unsupportedParams.join(', ')}.`);
      error.statusCode = 400;
      throw error;
    }
    */

    const isOnlyNames = params.onlyname || typeof params.onlyname === 'string';
    const client = params.client || 'mobile'; // Default client if not provided
    const hasCustomFields = params.fields && !isOnlyNames;

    let query = firestore.collection('categories').orderBy('category', 'asc');

    // Apply category filter with validation
    if (params.category) {
      const categories = validateArrayParameter(params.category, 'category');
      if (categories.length > 0) {
        query = query.where('category', 'in', categories);
      }
    }

    // Apply client filter
    if (client) {
      query = query.where('client', '==', client);
    }

    // Apply field selection
    if (isOnlyNames) {
      query = query.select('category');
    } else if (hasCustomFields) {
      const requestedFields = params.fields ? params.fields.split(',').map(f => f.trim()) : ['category', 'description', 'technologies', 'origins'];
      query = query.select(...requestedFields);
    }

    return query;
  };

  const dataProcessor = (data, params) => {
    const isOnlyNames = params.onlyname || typeof params.onlyname === 'string';

    if (isOnlyNames) {
      return data.map(item => item.category);
    }

    return data;
  };

  await executeQuery(req, res, 'categories', queryBuilder, dataProcessor);
};

export { listCategories };
