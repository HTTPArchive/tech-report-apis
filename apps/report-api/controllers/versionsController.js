import { handleControllerError, sendJSONResponse } from '../utils/controllerHelpers.js';
import { queryVersions } from '../utils/reportService.js';

const listVersions = async (req, res) => {
  try {
    const data = await queryVersions(req.query);
    sendJSONResponse(req, res, data);
  } catch (error) {
    handleControllerError(res, error, 'fetching versions');
  }
};

export { listVersions };
