import { handleControllerError, sendJSONResponse } from '../utils/controllerHelpers.js';
import { queryRanks } from '../utils/reportService.js';

const listRanks = async (req, res) => {
  try {
    const data = await queryRanks();
    sendJSONResponse(req, res, data);
  } catch (error) {
    handleControllerError(res, error, 'fetching ranks');
  }
};

export { listRanks };
