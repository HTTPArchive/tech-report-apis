import { handleControllerError, generateETag, isModified } from '../utils/controllerHelpers.js';
import { queryReport } from '../utils/reportService.js';

const createReportController = (reportType, defaults = {}) => {
    return async (req, res) => {
        try {
            const data = await queryReport(reportType, { ...defaults, ...req.query });

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

export const listAuditsData = createReportController('audits');
export const listAdoptionData = createReportController('adoption');
export const listCWVTechData = createReportController('cwv');
export const listLighthouseData = createReportController('lighthouse');
export const listPageWeightData = createReportController('pageWeight');
export const listGeoBreakdownData = createReportController('cwv', { crossGeo: true });


