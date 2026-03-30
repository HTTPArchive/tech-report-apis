import { bigquery } from '../utils/db.js';
import { convertToArray } from '../utils/helpers.js';
import {
  handleControllerError,
  generateETag,
  isModified,
  sendValidationError
} from '../utils/controllerHelpers.js';

/**
 * Build the BigQuery SQL for the CWV distribution histogram.
 * rank is applied to p.rank only (no rank column on device_summary).
 */
const buildQuery = (rankFilter) => {
  const rankClause = rankFilter ? 'AND p.rank <= @rank' : '';

  return `WITH metrics AS (
  SELECT
    client,
    t.technology,
    root_page,
    ANY_VALUE(p75_lcp) AS lcp,
    ANY_VALUE(p75_inp) AS inp,
    ANY_VALUE(p75_cls) AS cls,
    ANY_VALUE(p75_fcp) AS fcp,
    ANY_VALUE(p75_ttfb) AS ttfb
  FROM
    \`httparchive.crawl.pages\` p,
    UNNEST(technologies) t,
    \`chrome-ux-report.materialized.device_summary\` c
  WHERE
    p.date = @date AND
    c.date = @date AND
    t.technology IN UNNEST(@technologies) AND
    root_page = origin || '/' AND
    IF(client = 'mobile', 'phone', 'desktop') = device
    ${rankClause}
  GROUP BY
    client,
    t.technology,
    root_page
)

SELECT
  client,
  technology,
  bucket AS loading_bucket,
  bucket / 4 AS inp_bucket,
  bucket / 2000 AS cls_bucket,
  COUNT(DISTINCT root_page WHERE lcp = bucket) AS lcp_origins,
  COUNT(DISTINCT root_page WHERE inp = bucket / 4) AS inp_origins,
  COUNT(DISTINCT root_page WHERE cls = bucket / 2000) AS cls_origins,
  COUNT(DISTINCT root_page WHERE fcp = bucket) AS fcp_origins,
  COUNT(DISTINCT root_page WHERE ttfb = bucket) AS ttfb_origins
FROM
  metrics,
  UNNEST(GENERATE_ARRAY(0.0, 10000.0, 100.0)) AS bucket
GROUP BY
  client,
  technology,
  bucket
ORDER BY
  client,
  technology,
  bucket`;
};

/**
 * GET /v1/cwv-distribution
 *
 * Query parameters:
 *   technology (required) - comma-separated list of technologies, e.g. "Wix,WordPress"
 *   date       (required) - crawl date in YYYY-MM-DD format, e.g. "2026-02-01"
 *   rank       (optional) - numeric rank ceiling, e.g. "10000". Omit or set to "ALL" to include all ranks.
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

    const technologies = convertToArray(params.technology);
    const date = params.date;
    const rankParam = params.rank && params.rank !== 'ALL' ? params.rank : null;

    const queryStr = buildQuery(rankParam !== null);

    const queryOptions = {
      query: queryStr,
      params: {
        technologies,
        date,
        ...(rankParam !== null && { rank: parseInt(rankParam, 10) })
      },
      types: {
        technologies: ['STRING'],
        date: 'STRING',
        ...(rankParam !== null && { rank: 'INT64' })
      }
    };

    const [rows] = await bigquery.query(queryOptions);

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
