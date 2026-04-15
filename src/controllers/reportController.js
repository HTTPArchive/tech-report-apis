import { handleControllerError, sendJSONResponse } from '../utils/controllerHelpers.js';
import { queryReport } from '../utils/reportService.js';

const createReportController = (reportType, defaults = {}) => {
    return async (req, res) => {
        try {
            const data = await queryReport(reportType, { ...defaults, ...req.query });
            sendJSONResponse(req, res, data);
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


