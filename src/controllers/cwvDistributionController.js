import { queryCWVDistribution } from '../utils/reportService.js';
import {
  handleControllerError,
  generateETag,
  isModified,
  sendValidationError
} from '../utils/controllerHelpers.js';

/**
 * GET /v1/cwv-distribution
 *
 * Query parameters:
 *   technology (required) - comma-separated list of technologies, e.g. "Wix,WordPress"
 *   date       (required) - crawl date in YYYY-MM-DD format, e.g. "2026-02-01"
 *   rank       (optional) - numeric rank ceiling, e.g. "10000". Omit or set to "ALL" to include all ranks.
 *   geo        (optional) - geographic filter, e.g. "United States of America". Defaults to "ALL".
 */
export const listCWVDistributionData = async (req, res) => {
  try {
    const params = req.query;

    const errors = [];
    if (!params.technology) errors.push(['technology', 'missing technology parameter']);
    if (!params.date) errors.push(['date', 'missing date parameter']);
    if (errors.length > 0) {
      sendValidationError(res, errors);
      return;
    }

    const rows = await queryCWVDistribution({
      technology: params.technology,
      date: params.date,
      geo: params.geo || 'ALL',
      rank: params.rank && params.rank !== 'ALL' ? params.rank : null,
    });

    const jsonData = JSON.stringify(rows);
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
    handleControllerError(res, error, 'fetching CWV distribution data');
  }
};
