import { handleControllerError } from '../utils/controllerHelpers.js';
import { queryVersions } from '../utils/reportService.js';

const listVersions = async (req, res) => {
  try {
    const data = await queryVersions(req.query);
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    handleControllerError(res, error, 'fetching versions');
  }
};

export { listVersions };
