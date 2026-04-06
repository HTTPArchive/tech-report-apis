import { firestore, firestoreOld } from './db.js';
import {
  getLatestDate,
  validateArrayParameter,
  validateTechnologyArray,
  FIRESTORE_IN_LIMIT,
} from './controllerHelpers.js';

const REPORT_CONFIGS = {
  adoption: { table: 'adoption', dataField: 'adoption' },
  pageWeight: { table: 'page_weight', dataField: 'pageWeight' },
  lighthouse: { table: 'lighthouse', dataField: 'lighthouse' },
  cwv: { table: 'core_web_vitals', dataField: 'vitals' },
  audits: { table: 'audits', dataField: 'audits' },
};

export const queryTechnologies = async (params = {}) => {
  const isOnlyNames = 'onlyname' in params;
  const hasCustomFields = params.fields && !isOnlyNames;

  let query = firestore.collection('technologies');

  const technologyParam = params.technology || 'ALL';
  const technologies = technologyParam !== 'ALL' ? validateTechnologyArray(technologyParam) : [];

  if (technologies.length > 0) {
    if (technologyParam !== 'ALL' && validateTechnologyArray(technologyParam) === null) {
      const err = new Error(`Too many technologies specified. Maximum ${FIRESTORE_IN_LIMIT} allowed.`);
      err.statusCode = 400;
      throw err;
    }
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
  const config = REPORT_CONFIGS[reportType];
  if (!config) throw new Error(`Unknown report type: ${reportType}`);

  const db = firestoreOld;
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
