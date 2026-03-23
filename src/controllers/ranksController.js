import { handleControllerError } from '../utils/controllerHelpers.js';
import { queryRanks } from '../utils/reportService.js';

const listRanks = async (req, res) => {
  try {
    const data = await queryRanks();
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    handleControllerError(res, error, 'fetching ranks');
  }
};

export { listRanks };
