import { handleControllerError, sendJSONResponse } from '../utils/controllerHelpers.js';
import { queryCategories } from '../utils/reportService.js';

const listCategories = async (req, res) => {
  try {
    const data = await queryCategories(req.query);
    sendJSONResponse(req, res, data);
  } catch (error) {
    handleControllerError(res, error, 'fetching categories');
  }
};

export { listCategories };
