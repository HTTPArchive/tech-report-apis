import { handleControllerError } from '../utils/controllerHelpers.js';
import { queryReport, queryGeoBreakdown } from '../utils/reportService.js';

const createReportController = (reportType) => {
    return async (req, res) => {
        try {
            const data = await queryReport(reportType, req.query);
            res.statusCode = 200;
            res.end(JSON.stringify(data));
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

export const listGeoBreakdownData = async (req, res) => {
    try {
        const data = await queryGeoBreakdown(req.query);
        res.statusCode = 200;
        res.end(JSON.stringify(data));
    } catch (error) {
        handleControllerError(res, error, 'fetching geo breakdown data');
    }
};


