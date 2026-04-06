import { handleControllerError, sendJSONResponse } from '../utils/controllerHelpers.js';
import { queryTechnologies } from '../utils/reportService.js';

const listTechnologies = async (req, res) => {
  try {
    const data = await queryTechnologies(req.query);
    sendJSONResponse(req, res, data);
  } catch (error) {
    handleControllerError(res, error, 'fetching technologies');
  }
};

export { listTechnologies };
