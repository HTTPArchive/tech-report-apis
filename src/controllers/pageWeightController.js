const { firestoreOld } = require('../utils/db');
const firestore = firestoreOld;

const { createSuccessResponse } = require('../utils/helpers');
const {
  REQUIRED_PARAMS,
  validateRequiredParams,
  sendValidationError,
  applyDateFilters,
  applyStandardFilters,
  preprocessParams,
  handleControllerError
} = require('../utils/controllerHelpers');

const TABLE = 'page_weight';

/**
 * List Page Weight data with filtering
 */
const listPageWeightData = async (req, res) => {
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

      // Apply date filters
      query = applyDateFilters(query, processedParams);

      // Apply optional standard filters (geo, rank are optional for page weight) and version filter
      query = applyStandardFilters(query, processedParams, technology, techArray);

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
    handleControllerError(res, error, 'fetching Page Weight data');
  }
};

module.exports = {
  listPageWeight: listPageWeightData
};
