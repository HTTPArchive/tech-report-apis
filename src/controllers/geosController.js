import { handleControllerError, sendJSONResponse } from '../utils/controllerHelpers.js';
import { queryGeos } from '../utils/reportService.js';

const listGeos = async (req, res) => {
  try {
    const data = await queryGeos();
    sendJSONResponse(req, res, data);
  } catch (error) {
    handleControllerError(res, error, 'fetching geos');
  }
};

export { listGeos };
