import { firestoreOld } from '../utils/db.js';
const firestore = firestoreOld; // TODO: Remove once all controllers are migrated to new Firestore DB

import {
    REQUIRED_PARAMS,
    validateRequiredParams,
    sendValidationError,
    getLatestDate,
    handleControllerError,
    validateArrayParameter
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
 * Creates controllers for adoption, pageWeight, lighthouse, and cwv data
 */
const createReportController = (reportType) => {
    const config = REPORT_CONFIGS[reportType];
    if (!config) {
        throw new Error(`Unknown report type: ${reportType}`);
    }

    return async (req, res) => {
        try {
            const params = req.query;

            /*
            // Validate supported parameters
            const supportedParams = ['technology', 'geo', 'rank', 'start', 'end', 'version'];
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

            // Validate and process technologies
            const technologiesArray = validateArrayParameter(technologyParam, 'technology');

            // Validate and process versions
            // Apply version filter with special handling for 'ALL' case
            let versionsArray = ['ALL'];
            if (technologiesArray.length === 1 && params.version) {
                versionsArray = validateArrayParameter(params.version, 'version');
            }

            // Handle 'latest' date substitution
            let startDate = params.start;
            if (startDate === 'latest') {
                startDate = await getLatestDate(firestore, config.table);
            }

            // Build Firestore query
            let query = firestore.collection(config.table);

            // Apply required filters
            query = query.where('geo', '==', geoParam);
            query = query.where('rank', '==', rankParam);

            // Apply technology filter with batch processing
            query = query.where('technology', 'in', technologiesArray);

            // Apply version filter with batch processing
            // TODO: Implement processing for versions, currently only supports single version = 'ALL'
            // query = query.where('version', 'in', versionsArray);

            // Apply date filters
            if (startDate) query = query.where('date', '>=', startDate);
            if (params.end) query = query.where('date', '<=', params.end);

            // Apply field projection to optimize query
            const selectFields = ['date', 'technology', config.dataField];
            if (!(versionsArray.length === 1 && versionsArray[0] === 'ALL')) {
                // TODO: Add 'version' to selectFields once version filtering is implemented
                // selectFields.push('version');
            }
            query = query.select(...selectFields);

            // Execute query
            const snapshot = await query.get();
            const data = [];
            snapshot.forEach(doc => {
                data.push(doc.data());
            });

            // Send response
            res.statusCode = 200;
            res.end(JSON.stringify(data));

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


