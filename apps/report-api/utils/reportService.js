import { firestore, firestoreOld, bigquery } from './db.js';
import { parseRankParam } from './helpers.js';
import {
  getLatestDate,
  validateArrayParameter,
  validateTechnologyArray,
  FIRESTORE_IN_LIMIT,
} from './controllerHelpers.js';

const CWV_DISTRIBUTION_TIMEOUT_MS = Number(process.env.BQ_CWV_TIMEOUT_MS) || 90000;
const CWV_DISTRIBUTION_MAX_BYTES_BILLED = String(
  Number(process.env.BQ_CWV_MAX_BYTES_BILLED) || 50 * 1024 ** 3
);

const REPORT_CONFIGS = new Map([
  ['adoption', { table: 'adoption', dataField: 'adoption' }],
  ['pageWeight', { table: 'page_weight', dataField: 'pageWeight' }],
  ['lighthouse', { table: 'lighthouse', dataField: 'lighthouse' }],
  ['cwv', { table: 'core_web_vitals', dataField: 'vitals' }],
  ['audits', { table: 'audits', dataField: 'audits' }]
]);

export const queryTechnologies = async (params = {}) => {
  const isOnlyNames = 'onlyname' in params;
  const hasCustomFields = params.fields && !isOnlyNames;

  let query = firestore.collection('technologies');

  const technologyParam = params.technology || 'ALL';
  const technologies = technologyParam !== 'ALL' ? validateTechnologyArray(technologyParam) : [];

  if (technologies === null) {
    const err = new Error(`Too many technologies specified. Maximum ${FIRESTORE_IN_LIMIT} allowed.`);
    err.statusCode = 400;
    throw err;
  }

  if (technologies.length > 0) {
    query = query.where('technology', 'in', technologies);
  }

  if (params.category) {
    const categories = validateArrayParameter(params.category, 'category');
    if (categories.length > 0) {
      query = query.where('category_obj', 'array-contains-any', categories);
    }
  }

  if (params.sort === 'name') {
    query = query.orderBy('technology', 'asc');
  } else {
    query = query.orderBy('origins.mobile', 'desc');
  }

  if (isOnlyNames) {
    query = query.select('technology');
  } else if (hasCustomFields) {
    const requestedFields = params.fields.split(',').map(f => f.trim());
    query = query.select(...requestedFields);
  } else {
    query = query.select('technology', 'category', 'description', 'icon', 'origins');
  }

  if (params.limit) {
    query = query.limit(parseInt(params.limit, 10));
  }

  const snapshot = await query.get();
  const data = [];
  snapshot.forEach(doc => data.push(doc.data()));

  if (isOnlyNames) {
    return data.map(item => item.technology);
  }
  return data;
};

export const queryCategories = async (params = {}) => {
  const isOnlyNames = 'onlyname' in params;
  const hasCustomFields = params.fields && !isOnlyNames;

  let query = firestore.collection('categories');

  const categoryParam = params.category || 'ALL';

  if (categoryParam !== 'ALL') {
    const categories = validateArrayParameter(categoryParam, 'category');
    if (categories.length > 0) {
      query = query.where('category', 'in', categories);
    }
  }

  if (params.sort === 'name') {
    query = query.orderBy('category', 'asc');
  } else {
    query = query.orderBy('origins.mobile', 'desc');
  }

  if (isOnlyNames) {
    query = query.select('category');
  } else if (hasCustomFields) {
    const requestedFields = params.fields.split(',').map(f => f.trim());
    query = query.select(...requestedFields);
  }

  if (params.limit) {
    query = query.limit(parseInt(params.limit, 10));
  }

  const snapshot = await query.get();
  const data = [];
  snapshot.forEach(doc => data.push(doc.data()));

  if (isOnlyNames) {
    return data.map(item => item.category);
  }
  return data;
};

export const queryReport = async (reportType, params = {}) => {
  if (typeof reportType !== 'string' || !REPORT_CONFIGS.has(reportType)) {
    throw new Error(`Unknown report type: ${reportType}`);
  }
  const config = REPORT_CONFIGS.get(reportType);

  const db = reportType === 'audits' ? firestore : firestoreOld;
  const crossGeo = params.crossGeo || false;
  const technologyParam = params.technology || 'ALL';
  const geoParam = params.geo || 'ALL';
  const rankParam = params.rank || 'ALL';

  const techArray = validateArrayParameter(technologyParam, 'technology');

  let query = db.collection(config.table);
  query = query.where('rank', '==', rankParam);
  query = query.where('technology', 'in', techArray);

  if (crossGeo) {
    // Cross-geo: single-month snapshot, all geographies included.
    // Use 'end' param if provided, otherwise default to latest available date.
    const snapshotDate = params.end || await getLatestDate(db, config.table);
    query = query.where('date', '==', snapshotDate);
    query = query.select('date', 'technology', 'geo', config.dataField);
  } else {
    // Normal time-series: filter by geo, apply date range, no geo in projection.
    query = query.where('geo', '==', geoParam);

    let startDate = params.start;
    if (startDate === 'latest') {
      startDate = await getLatestDate(db, config.table);
    }

    if (startDate) query = query.where('date', '>=', startDate);
    if (params.end) query = query.where('date', '<=', params.end);

    query = query.select('date', 'technology', config.dataField);
  }

  const snapshot = await query.get();
  const data = [];
  snapshot.forEach(doc => data.push(doc.data()));

  return data;
};

export const queryCWVDistribution = async ({ technology, date, geo = 'ALL', rank = null }) => {
  if (!date || date === 'latest') {
    date = await getLatestDate(firestoreOld, 'core_web_vitals');
  }

  const allTechnologies = !technology || technology === 'ALL';
  const technologies = allTechnologies ? [] : validateArrayParameter(technology, 'technology');
  const techClause = allTechnologies ? '' : 'AND t.technology IN UNNEST(@technologies)';
  const rankParam = parseRankParam(rank);
  const rankClause = rankParam !== null ? 'AND rank <= @rank' : '';
  const normalizedGeo = geo || 'ALL';
  const isAllGeo = normalizedGeo === 'ALL';
  const techColumn = allTechnologies ? '' : 'technology,';

  const metricsQuery = isAllGeo
    ? `SELECT
    'ALL' AS geo,
    client,
    ${techColumn}
    root_page,
    ANY_VALUE(p75_lcp) AS lcp,
    ANY_VALUE(p75_inp) AS inp,
    ANY_VALUE(p75_cls) AS cls,
    ANY_VALUE(p75_fcp) AS fcp,
    ANY_VALUE(p75_ttfb) AS ttfb,
    ANY_VALUE(p75_lcp_sn) AS lcp_sn,
    ANY_VALUE(p75_inp_sn) AS inp_sn,
    ANY_VALUE(p75_cls_sn) AS cls_sn
  FROM pages AS p
  INNER JOIN \`chrome-ux-report.materialized.device_summary\` AS d
    ON d.date = DATE(@date)
    AND p.root_page = d.origin || '/'
    AND IF(d.device = 'desktop', 'desktop', 'mobile') = p.client
  GROUP BY
    client,
    ${techColumn}
    root_page`
    : `SELECT
    \`chrome-ux-report\`.experimental.GET_COUNTRY(country_code) AS geo,
    client,
    ${techColumn}
    root_page,
    ANY_VALUE(p75_lcp) AS lcp,
    ANY_VALUE(p75_inp) AS inp,
    ANY_VALUE(p75_cls) AS cls,
    ANY_VALUE(p75_fcp) AS fcp,
    ANY_VALUE(p75_ttfb) AS ttfb,
    ANY_VALUE(p75_lcp_sn) AS lcp_sn,
    ANY_VALUE(p75_inp_sn) AS inp_sn,
    ANY_VALUE(p75_cls_sn) AS cls_sn
  FROM pages AS p
  INNER JOIN \`chrome-ux-report.materialized.country_summary\` AS c
    ON c.yyyymm = CAST(FORMAT_DATE('%Y%m', DATE(@date)) AS INT64)
    AND p.root_page = c.origin || '/'
    AND IF(c.device = 'desktop', 'desktop', 'mobile') = p.client
    AND \`chrome-ux-report\`.experimental.GET_COUNTRY(c.country_code) = @geo
  GROUP BY
    geo,
    client,
    ${techColumn}
    root_page`;

  const query = `WITH pages AS (
  SELECT DISTINCT
    client,
    ${allTechnologies ? '' : 't.technology AS technology,'}
    root_page
  FROM
    httparchive.crawl.pages,
    UNNEST(technologies) AS t
  WHERE
    date = DATE(@date)
    ${techClause}
    ${rankClause}
), metrics AS (
  ${metricsQuery}
), bucketed AS (
  SELECT
    geo,
    client,
    ${allTechnologies ? "'ALL'" : 'technology'} AS technology,
    IF(lcp BETWEEN 0 AND 10000 AND MOD(lcp, 100) = 0, CAST(lcp AS FLOAT64), NULL) AS lcp_b,
    IF(inp BETWEEN 0 AND 2500 AND MOD(inp, 25) = 0, CAST(inp * 4 AS FLOAT64), NULL) AS inp_b,
    IF(cls BETWEEN 0 AND 5 AND MOD(cls * 2000, 100) = 0, CAST(cls * 2000 AS FLOAT64), NULL) AS cls_b,
    IF(fcp BETWEEN 0 AND 10000 AND MOD(fcp, 100) = 0, CAST(fcp AS FLOAT64), NULL) AS fcp_b,
    IF(ttfb BETWEEN 0 AND 10000 AND MOD(ttfb, 100) = 0, CAST(ttfb AS FLOAT64), NULL) AS ttfb_b,
    IF(lcp_sn BETWEEN 0 AND 10000 AND MOD(lcp_sn, 100) = 0, CAST(lcp_sn AS FLOAT64), NULL) AS lcp_sn_b,
    IF(inp_sn BETWEEN 0 AND 2500 AND MOD(inp_sn, 25) = 0, CAST(inp_sn * 4 AS FLOAT64), NULL) AS inp_sn_b,
    IF(cls_sn BETWEEN 0 AND 5 AND MOD(cls_sn * 2000, 100) = 0, CAST(cls_sn * 2000 AS FLOAT64), NULL) AS cls_sn_b
  FROM metrics
), metric_buckets AS (
  SELECT
    geo,
    client,
    technology,
    b.bucket,
    COUNTIF(b.metric = 'lcp') AS lcp_origins,
    COUNTIF(b.metric = 'inp') AS inp_origins,
    COUNTIF(b.metric = 'cls') AS cls_origins,
    COUNTIF(b.metric = 'fcp') AS fcp_origins,
    COUNTIF(b.metric = 'ttfb') AS ttfb_origins,
    COUNTIF(b.metric = 'lcp_sn') AS lcp_sn_origins,
    COUNTIF(b.metric = 'inp_sn') AS inp_sn_origins,
    COUNTIF(b.metric = 'cls_sn') AS cls_sn_origins
  FROM bucketed,
  UNNEST([
    STRUCT('lcp' AS metric, lcp_b AS bucket),
    STRUCT('inp', inp_b),
    STRUCT('cls', cls_b),
    STRUCT('fcp', fcp_b),
    STRUCT('ttfb', ttfb_b),
    STRUCT('lcp_sn', lcp_sn_b),
    STRUCT('inp_sn', inp_sn_b),
    STRUCT('cls_sn', cls_sn_b),
    STRUCT('__group', IF(COALESCE(lcp_b, inp_b, cls_b, fcp_b, ttfb_b, lcp_sn_b, inp_sn_b, cls_sn_b) IS NULL, -1.0, NULL))
  ]) AS b
  WHERE b.bucket IS NOT NULL
  GROUP BY
    geo,
    client,
    technology,
    b.bucket
), grouped AS (
  SELECT
    geo,
    client,
    technology,
    ARRAY_AGG(STRUCT(
      bucket,
      lcp_origins,
      inp_origins,
      cls_origins,
      fcp_origins,
      ttfb_origins,
      lcp_sn_origins,
      inp_sn_origins,
      cls_sn_origins
    )) AS buckets
  FROM metric_buckets
  GROUP BY
    geo,
    client,
    technology
)

SELECT
  g.geo,
  g.client,
  g.technology,
  bucket AS loading_bucket,
  bucket / 4 AS inp_bucket,
  bucket / 2000 AS cls_bucket,
  COALESCE(mb.lcp_origins, 0) AS lcp_origins,
  COALESCE(mb.inp_origins, 0) AS inp_origins,
  COALESCE(mb.cls_origins, 0) AS cls_origins,
  COALESCE(mb.fcp_origins, 0) AS fcp_origins,
  COALESCE(mb.ttfb_origins, 0) AS ttfb_origins,
  COALESCE(mb.lcp_sn_origins, 0) AS lcp_sn_origins,
  COALESCE(mb.inp_sn_origins, 0) AS inp_sn_origins,
  COALESCE(mb.cls_sn_origins, 0) AS cls_sn_origins
FROM
  grouped AS g
CROSS JOIN
  UNNEST(GENERATE_ARRAY(0.0, 10000.0, 100.0)) AS bucket
LEFT JOIN
  UNNEST(g.buckets) AS mb
  ON mb.bucket = bucket
ORDER BY
  g.geo,
  g.client,
  g.technology,
  bucket`;

  const [rows] = await bigquery.query({
    query,
    reservation: 'none',
    jobTimeoutMs: CWV_DISTRIBUTION_TIMEOUT_MS,
    timeoutMs: CWV_DISTRIBUTION_TIMEOUT_MS,
    maximumBytesBilled: CWV_DISTRIBUTION_MAX_BYTES_BILLED,
    params: {
      ...(!allTechnologies && { technologies }),
      date,
      ...(!isAllGeo && { geo: normalizedGeo }),
      ...(rankParam !== null && { rank: rankParam }),
    },
    types: {
      ...(!allTechnologies && { technologies: ['STRING'] }),
      date: 'STRING',
      ...(!isAllGeo && { geo: 'STRING' }),
      ...(rankParam !== null && { rank: 'INT64' }),
    },
    labels: { source: 'cwv-distribution' },
  });

  return rows;
};

export const queryRanks = async () => {
  const snapshot = await firestore
    .collection('ranks')
    .orderBy('mobile_origins', 'desc')
    .select('rank')
    .get();
  const data = [];
  snapshot.forEach(doc => data.push(doc.data()));
  return data;
};

export const queryGeos = async () => {
  const snapshot = await firestore
    .collection('geos')
    .orderBy('mobile_origins', 'desc')
    .select('geo')
    .get();
  const data = [];
  snapshot.forEach(doc => data.push(doc.data()));
  return data;
};

export const queryVersions = async (params = {}) => {
  let query = firestore.collection('versions');

  const technologyParam = params.technology || 'ALL';
  if (technologyParam !== 'ALL') {
    const technologies = validateTechnologyArray(technologyParam);
    if (technologies === null) {
      const err = new Error(`Too many technologies specified. Maximum ${FIRESTORE_IN_LIMIT} allowed.`);
      err.statusCode = 400;
      throw err;
    }
    if (technologies.length > 0) {
      query = query.where('technology', 'in', technologies);
    }
  }

  if (params.version) {
    query = query.where('version', '==', params.version);
  }

  if (params.fields) {
    const requestedFields = params.fields.split(',').map(f => f.trim());
    query = query.select(...requestedFields);
  }

  const snapshot = await query.get();
  const data = [];
  snapshot.forEach(doc => data.push(doc.data()));
  return data;
};
