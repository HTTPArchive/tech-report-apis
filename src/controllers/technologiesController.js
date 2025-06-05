import { firestore } from '../utils/db.js';
import { executeQuery, validateTechnologyArray, validateArrayParameter, FIRESTORE_IN_LIMIT } from '../utils/controllerHelpers.js';

/**
 * List technologies with optional filtering and field selection
 */
const listTechnologies = async (req, res) => {
  const queryBuilder = async (params) => {
    const isOnlyNames = params.onlyname || typeof params.onlyname === 'string';
    const hasCustomFields = params.fields && !isOnlyNames;

    let query = firestore.collection('technologies').orderBy('technology', 'asc');

    // Apply technology filter with validation
    if (params.technology) {
      const technologies = validateTechnologyArray(params.technology);
      if (technologies === null) {
        throw new Error(`Too many technologies specified. Maximum ${FIRESTORE_IN_LIMIT} allowed.`);
      }
      if (technologies.length > 0) {
        query = query.where('technology', 'in', technologies);
      }
    }

    // Apply category filter with validation
    if (params.category) {
      const categories = validateArrayParameter(params.category, 'category');
      if (categories.length > 0) {
        query = query.where('category_obj', 'array-contains-any', categories);
      }
    }

    // Apply field selection
    if (isOnlyNames) {
      query = query.select('technology');
    } else if (hasCustomFields) {
      const requestedFields = params.fields.split(',').map(f => f.trim());
      query = query.select(...requestedFields);
    } else {
      query = query.select('technology', 'category', 'description', 'icon', 'origins');
    }

    return query;
  };

  const dataProcessor = (data, params) => {
    const isOnlyNames = params.onlyname || typeof params.onlyname === 'string';

    if (isOnlyNames) {
      return data.map(item => item.technology);
    }

    return data;
  };

  // Include onlyname and fields in cache key calculation
  const customCacheKeyData = {
    onlyname: req.query.onlyname || false,
    fields: req.query.fields
  };

  await executeQuery(req, res, 'technologies', queryBuilder, dataProcessor, customCacheKeyData);
};

export {
  listTechnologies
};
