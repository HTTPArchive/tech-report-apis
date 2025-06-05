import { firestore } from '../utils/db.js';
import { executeQuery, validateArrayParameter } from '../utils/controllerHelpers.js';

/**
 * List categories with optional filtering and field selection
 */
const listCategories = async (req, res) => {
  const queryBuilder = async (params) => {
    const isOnlyNames = params.onlyname || typeof params.onlyname === 'string';
    const hasCustomFields = params.fields && !isOnlyNames;

    let query = firestore.collection('categories').orderBy('category', 'asc');

    // Apply category filter with validation
    if (params.category) {
      const categories = validateArrayParameter(params.category, 'category');
      if (categories.length > 0) {
        query = query.where('category', 'in', categories);
      }
    }

    // Apply field selection
    if (isOnlyNames) {
      query = query.select('category');
    } else if (hasCustomFields) {
      const requestedFields = params.fields.split(',').map(f => f.trim());
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

  // Include onlyname and fields in cache key calculation
  const customCacheKeyData = {
    onlyname: req.query.onlyname || false,
    fields: req.query.fields
  };

  await executeQuery(req, res, 'categories', queryBuilder, dataProcessor, customCacheKeyData);
};

export { listCategories };
