import { handleControllerError, generateETag, isModified } from '../utils/controllerHelpers.js';
import { queryTechnologies } from '../utils/reportService.js';

const listTechnologies = async (req, res) => {
  try {
    const data = await queryTechnologies(req.query);
    const jsonData = JSON.stringify(data);
    const etag = generateETag(jsonData);
    res.setHeader('ETag', `"${etag}"`);
    if (!isModified(req, etag)) {
      res.statusCode = 304;
      res.end();
      return;
    }
    res.statusCode = 200;
    res.end(jsonData);
  } catch (error) {
    handleControllerError(res, error, 'fetching technologies');
  }
};

export { listTechnologies };
