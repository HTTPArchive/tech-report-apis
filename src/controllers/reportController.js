import { firestoreOld } from '../utils/db.js';
const firestore = firestoreOld;

import {
    REQUIRED_PARAMS,
    validateRequiredParams,
    sendValidationError,
    getLatestDate,
    handleControllerError,
    validateArrayParameter,
    generateETag,
    isModified
} from '../utils/controllerHelpers.js';

/**
 * Configuration for different report types
 */
const REPORT_CONFIGS = {
    adoption: {
        table: 'adoption',
        dataField: 'adoption'
    },
    pageWeight: {
        table: 'page_weight',
        dataField: 'pageWeight'  // TODO: change to page_weight once migrated to new Firestore DB
    },
    lighthouse: {
        table: 'lighthouse',
        dataField: 'lighthouse'
    },
    cwv: {
        table: 'core_web_vitals',
        dataField: 'vitals'
    },
    audits: {
        table: 'audits',
        dataField: 'audits'
    }
};

/**
 * Generic report data controller factory
 * Creates controllers for adoption, pageWeight, lighthouse, and cwv data.
 * Pass { crossGeo: true } to get a cross-geography snapshot (omits geo filter,
 * includes geo in projection, returns a single month of data).
 */
const createReportController = (reportType, { crossGeo = false } = {}) => {
    const config = REPORT_CONFIGS[reportType];
    if (!config) {
        throw new Error(`Unknown report type: ${reportType}`);
    }

    return async (req, res) => {
        try {
            const params = req.query;

            /*
            // Validate supported parameters
            const supportedParams = ['technology', 'geo', 'rank', 'start', 'end'];
            const providedParams = Object.keys(params);
            const unsupportedParams = providedParams.filter(param => !supportedParams.includes(param));

            if (unsupportedParams.length > 0) {
                const error = new Error(`Unsupported parameters: ${unsupportedParams.join(', ')}.`);
                error.statusCode = 400;
                throw error;
            }
            */

            // Validate required parameters using shared utility
            const errors = validateRequiredParams(params, []);

            if (errors) {
                sendValidationError(res, errors);
                return;
            }

            // Default technology, geo, and rank to 'ALL' if missing or empty
            const technologyParam = params.technology || 'ALL';
            const geoParam = params.geo || 'ALL';
            const rankParam = params.rank || 'ALL';

            // Validate and process technology array
            const techArray = validateArrayParameter(technologyParam, 'technology');

            // Build Firestore query
            let query = firestore.collection(config.table);

            query = query.where('rank', '==', rankParam);
            query = query.where('technology', 'in', techArray);

            // Apply version filter with special handling for 'ALL' case
            if (params.version && techArray.length === 1) {
                //query = query.where('version', '==', params.version); // TODO: Uncomment when migrating to a new data schema
            } else {
                //query = query.where('version', '==', 'ALL');
            }

            if (crossGeo) {
                // Cross-geo: single-month snapshot, all geographies included.
                // Use 'end' param if provided, otherwise default to latest available date.
                const snapshotDate = params.end || await getLatestDate(firestore, config.table);
                query = query.where('date', '==', snapshotDate);
                query = query.select('date', 'technology', 'geo', config.dataField);
            } else {
                // Normal time-series: filter by geo, apply date range, no geo in projection.
                query = query.where('geo', '==', geoParam);

                // Handle 'latest' date substitution
                let startDate = params.start;
                if (startDate === 'latest') {
                    startDate = await getLatestDate(firestore, config.table);
                }

                if (startDate) query = query.where('date', '>=', startDate);
                if (params.end) query = query.where('date', '<=', params.end);

                query = query.select('date', 'technology', config.dataField);
            }

            // Execute query
            const snapshot = await query.get();
            const data = [];
            snapshot.forEach(doc => {
                data.push(doc.data());
            });

            // Send response with ETag support
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
            handleControllerError(res, error, `fetching ${reportType} data`);
        }
    };
};

// Export individual controller functions
export const listAuditsData = createReportController('audits');
export const listAdoptionData = createReportController('adoption');
export const listCWVTechData = createReportController('cwv');
export const listLighthouseData = createReportController('lighthouse');
export const listPageWeightData = createReportController('pageWeight');
export const listGeoBreakdownData = createReportController('cwv', { crossGeo: true });


