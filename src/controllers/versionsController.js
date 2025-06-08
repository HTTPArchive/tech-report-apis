import { firestore } from '../utils/db.js';
import { executeQuery, validateTechnologyArray, FIRESTORE_IN_LIMIT } from '../utils/controllerHelpers.js';

/**
 * List versions with optional technology filtering
 */
const listVersions = async (req, res) => {
  const queryBuilder = async (params) => {
    // Validate parameters
    const supportedParams = ['version', 'technology', 'category', 'onlyname', 'fields'];
    const providedParams = Object.keys(params);
    const unsupportedParams = providedParams.filter(param => !supportedParams.includes(param));

    if (unsupportedParams.length > 0) {
      const error = new Error(`Unsupported parameters: ${unsupportedParams.join(', ')}.`);
      error.statusCode = 400;
      throw error;
    }

    let query = firestore.collection('versions');

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

    // Apply version filter
    if (params.version) {
      query = query.where('version', '==', params.version);
    }

    // Apply field selection
    if (params.fields) {
      const requestedFields = params.fields.split(',').map(f => f.trim());
      query = query.select(...requestedFields);
    }

    return query;
  };

  await executeQuery(req, res, 'versions', queryBuilder);
};

export {
  listVersions
};
