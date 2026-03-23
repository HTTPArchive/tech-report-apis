import { handleControllerError } from '../utils/controllerHelpers.js';
import { queryTechnologies } from '../utils/reportService.js';

const listTechnologies = async (req, res) => {
  try {
    const data = await queryTechnologies(req.query);
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    handleControllerError(res, error, 'fetching technologies');
  }
};

export { listTechnologies };
