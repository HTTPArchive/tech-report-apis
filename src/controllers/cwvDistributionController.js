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
 * geo filters are applied in the final SELECT via WHERE geo = @geo.
 *   Pass geo='ALL' (default) to use the device_summary (all-origins) data.
 *   Pass a country name to use the country_summary data for that country.
 */
const buildQuery = (rankFilter) => {
  const rankClause = rankFilter ? 'AND rank <= @rank' : '';

  return `WITH pages AS (
  SELECT
    client,
    t.technology AS technology,
    root_page
  FROM
    httparchive.crawl.pages,
    UNNEST(technologies) AS t
  WHERE
    date = @date AND
    t.technology IN UNNEST(@technologies)
    ${rankClause}
  ), metrics AS (
  SELECT
    'ALL' AS geo,
    client,
    technology,
    root_page,
    ANY_VALUE(p75_lcp) AS lcp,
    ANY_VALUE(p75_inp) AS inp,
    ANY_VALUE(p75_cls) AS cls,
    ANY_VALUE(p75_fcp) AS fcp,
    ANY_VALUE(p75_ttfb) AS ttfb
  FROM pages AS p,
    \`chrome-ux-report.materialized.device_summary\` d
  WHERE
    d.date = @date AND
    root_page = origin || '/' AND
    IF(device = 'desktop', 'desktop', 'mobile') = client AND
    @geo = 'ALL'
    ${rankClause}
  GROUP BY
    client,
    technology,
    root_page

  UNION ALL

  SELECT
    \`chrome-ux-report\`.experimental.GET_COUNTRY(country_code) AS geo,
    client,
    technology,
    root_page,
    ANY_VALUE(p75_lcp) AS lcp,
    ANY_VALUE(p75_inp) AS inp,
    ANY_VALUE(p75_cls) AS cls,
    ANY_VALUE(p75_fcp) AS fcp,
    ANY_VALUE(p75_ttfb) AS ttfb
  FROM pages AS p,
    \`chrome-ux-report.materialized.country_summary\` c
  WHERE
    yyyymm = CAST(FORMAT_DATE('%Y%m', @date) AS INT64) AND
    root_page = origin || '/' AND
    IF(device = 'desktop', 'desktop', 'mobile') = client AND
    \`chrome-ux-report\`.experimental.GET_COUNTRY(country_code) = @geo
    ${rankClause}
  GROUP BY
    geo,
    client,
    technology,
    root_page
)

SELECT
  geo,
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
  geo,
  client,
  technology,
  bucket
ORDER BY
  geo,
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

    const technologies = convertToArray(params.technology);
    const date = params.date;
    const rankParam = params.rank && params.rank !== 'ALL' ? params.rank : null;
    const geo = params.geo || 'ALL';

    const queryStr = buildQuery(rankParam !== null);

    const queryOptions = {
      query: queryStr,
      params: {
        technologies,
        date,
        geo,
        ...(rankParam !== null && { rank: parseInt(rankParam, 10) })
      },
      types: {
        technologies: ['STRING'],
        date: 'STRING',
        geo: 'STRING',
        ...(rankParam !== null && { rank: 'INT64' })
      },
      labels: {
        source: 'cwv-distribution-controller'
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
