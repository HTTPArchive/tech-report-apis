import { Storage } from '@google-cloud/storage';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendJSONResponse, handleControllerError } from '../utils/controllerHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GCS_BUCKET = process.env.GCS_BUCKET_NAME || 'httparchive';
const CACHE_LIFETIME = 1000 * 60 * 60 * 3; // 3 hours

let gcs;
let bucket;
let loadDatesFromGCS = true;

try {
  gcs = new Storage();
  bucket = gcs.bucket(GCS_BUCKET);
} catch (e) {
  console.warn('Unable to authenticate to Google Cloud Storage. Using mock dates.', e.message);
  loadDatesFromGCS = false;
}

function getMockDates() {
  const now = new Date();
  const startYear = 2010;
  const endYear = now.getUTCFullYear();
  const monthDelta = now.getUTCMonth() + 1; // 1-indexed

  let year = startYear;
  const months = [];
  const totalMonths = ((endYear - startYear) * 12) + monthDelta;

  for (let month = 1; month <= totalMonths; month++) {
    let currentMonthInYear = month % 12;
    if (currentMonthInYear === 0) {
      currentMonthInYear = 12;
    }
    const monthStr = currentMonthInYear < 10 ? `0${currentMonthInYear}` : `${currentMonthInYear}`;

    months.push(`${year}_${monthStr}_01`);
    if (year < 2019) {
      months.push(`${year}_${monthStr}_15`);
    }

    if (month % 12 === 0) {
      year = year + 1;
    }
  }

  months.sort().reverse();
  return months;
}

const mockDates = getMockDates();
let datesCache = [];
let lastDatesUpdate = 0;

async function getDates() {
  if (!loadDatesFromGCS) {
    return mockDates;
  }
  const now = Date.now();
  if (datesCache.length > 0 && (now - lastDatesUpdate) < CACHE_LIFETIME) {
    return datesCache;
  }

  try {
    const [, , apiResponse] = await bucket.getFiles({
      prefix: 'reports/20',
      delimiter: '/'
    });
    const prefixes = apiResponse.prefixes || [];
    const datePattern = /(\d{4}_\d{2}_\d{2})/;
    const dates = [];

    for (const prefix of prefixes) {
      const match = prefix.match(datePattern);
      if (match) {
        dates.push(match[1]);
      }
    }

    dates.sort().reverse();
    datesCache = dates;
    lastDatesUpdate = now;
    return dates;
  } catch (err) {
    console.error('Error fetching dates from GCS:', err.message);
    return mockDates;
  }
}

const latestMetricDates = new Map();
const latestMetricCheck = new Map();

async function getLatestDate(dates, metricId) {
  if (!loadDatesFromGCS) {
    return mockDates[0];
  }

  const cached = latestMetricDates.get(metricId);
  const now = Date.now();
  if (cached) {
    if (cached === dates[0] || (now - latestMetricCheck.get(metricId)) < CACHE_LIFETIME) {
      return cached;
    }
  }

  try {
    for (const date of dates) {
      const file = bucket.file(`reports/${date}/${metricId}.json`);
      const [exists] = await file.exists();
      if (exists) {
        latestMetricDates.set(metricId, date);
        latestMetricCheck.set(metricId, now);
        return date;
      }
    }
  } catch (err) {
    const safeMetricIdForLog = String(metricId).replace(/[\r\n]/g, '');
    console.error('Error finding latest date for %s:', safeMetricIdForLog, err.message);
  }

  return mockDates[0];
}

let reportsJson = {};
let lastReportsUpdate = 0;

async function loadReportsConfig() {
  const now = Date.now();
  if (Object.keys(reportsJson).length > 0 && (now - lastReportsUpdate) < CACHE_LIFETIME) {
    return reportsJson;
  }
  try {
    const configPath = path.resolve(__dirname, '../config/reports.json');
    const fileContent = await fs.readFile(configPath, 'utf8');
    reportsJson = JSON.parse(fileContent);
    lastReportsUpdate = now;
  } catch (err) {
    console.error('Error reading config/reports.json:', err.message);
  }
  return reportsJson;
}

async function getMetricDetails(metricId) {
  if (typeof metricId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(metricId)) {
    return null;
  }
  const config = await loadReportsConfig();
  const metrics = config._metrics || {};
  if (!Object.prototype.hasOwnProperty.call(metrics, metricId)) {
    return null;
  }
  const metric = metrics[metricId];
  if (!metric) {
    return null;
  }
  return { ...metric, id: metricId };
}

export const listDates = async (req, res) => {
  try {
    const dates = await getDates();
    sendJSONResponse(req, res, { status: 200, dates });
  } catch (error) {
    handleControllerError(res, error, 'fetching dates');
  }
};

export const getMetric = async (req, res) => {
  try {
    const metricId = req.query.id;
    if (!metricId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ status: 400, message: 'id parameter required' }));
      return;
    }

    const metric = await getMetricDetails(metricId);
    const hasHistogram = metric && (!metric.histogram || metric.histogram.enabled !== false);
    const dates = await getDates();
    const latest = (metric && hasHistogram) ? await getLatestDate(dates, metricId) : null;

    sendJSONResponse(req, res, { status: 200, metric, latest });
  } catch (error) {
    handleControllerError(res, error, 'fetching metric');
  }
};
