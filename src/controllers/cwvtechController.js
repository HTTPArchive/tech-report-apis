const firestore = require('../utils/db');
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

const TABLE = 'core_web_vitals';

/**
 * List Core Web Vitals data with filtering
 */
const listCWVTechData = async (req, res) => {
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
    handleControllerError(res, error, 'fetching Core Web Vitals data');
  }
};

module.exports = {
  listCwvtech: listCWVTechData
};
