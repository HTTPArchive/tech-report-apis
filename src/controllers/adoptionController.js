import { firestoreOld } from '../utils/db.js';
const firestore = firestoreOld;

import { createSuccessResponse } from '../utils/helpers.js';
import {
  REQUIRED_PARAMS,
  validateRequiredParams,
  sendValidationError,
  applyDateFilters,
  applyStandardFilters,
  preprocessParams,
  handleControllerError
} from '../utils/controllerHelpers.js';

const TABLE = 'adoption';

/**
 * List adoption data with filtering
 */
const listAdoptionData = async (req, res) => {
  try {
    const params = req.query;

    // Validate required parameters
    const requiredParams = [
      REQUIRED_PARAMS.GEO,
      REQUIRED_PARAMS.RANK,
      REQUIRED_PARAMS.TECHNOLOGY
    ];

    const validationErrors = validateRequiredParams(params, requiredParams);
    if (validationErrors) {
      sendValidationError(res, validationErrors);
      return;
    }

    // Preprocess parameters and get technology array
    const { params: processedParams, techArray } = await preprocessParams(firestore, params, TABLE);
    const data = [];

    // Query for each technology
    for (const technology of techArray) {
      let query = firestore.collection(TABLE);

      // Apply standard filters including version filter
      query = applyStandardFilters(query, processedParams, technology, techArray);

      // Apply date filters
      query = applyDateFilters(query, processedParams);

      // Execute query
      const snapshot = await query.get();
      snapshot.forEach(doc => {
        data.push(doc.data());
      });
    }

    // Send response
    res.statusCode = 200;
    res.end(JSON.stringify(createSuccessResponse(data)));
  } catch (error) {
    handleControllerError(res, error, 'fetching adoption data');
  }
};

export {
  listAdoptionData
};
