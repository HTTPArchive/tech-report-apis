import { handleControllerError } from '../utils/controllerHelpers.js';
import { queryCategories } from '../utils/reportService.js';

const listCategories = async (req, res) => {
  try {
    const data = await queryCategories(req.query);
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    handleControllerError(res, error, 'fetching categories');
  }
};

export { listCategories };
