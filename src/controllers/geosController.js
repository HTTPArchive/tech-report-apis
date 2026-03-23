import { handleControllerError } from '../utils/controllerHelpers.js';
import { queryGeos } from '../utils/reportService.js';

const listGeos = async (req, res) => {
  try {
    const data = await queryGeos();
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    handleControllerError(res, error, 'fetching geos');
  }
};

export { listGeos };
