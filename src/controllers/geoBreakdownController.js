import { firestoreOld } from '../utils/db.js';
const firestore = firestoreOld;

import {
    getLatestDate,
    handleControllerError,
    validateArrayParameter
} from '../utils/controllerHelpers.js';

const TABLE = 'core_web_vitals';
const DATA_FIELD = 'vitals';

/**
 * List CWV data for all geographies for a given technology.
 * Unlike /cwv, this endpoint omits the geo filter so all geographies
 * are returned, allowing a geographic breakdown chart to be built.
 *
 * Query params:
 *   technology (required)
 *   rank       (default: ALL)
 *   start      (optional; 'latest' resolves to the most recent date)
 *   end        (optional)
 */
export const listGeoBreakdownData = async (req, res) => {
    try {
        const params = req.query;
        const technologyParam = params.technology || 'ALL';
        const rankParam = params.rank || 'ALL';

        const techArray = validateArrayParameter(technologyParam, 'technology');

        let startDate = params.start;
        if (startDate === 'latest') {
            startDate = await getLatestDate(firestore, TABLE);
        }

        let query = firestore.collection(TABLE);

        // Filter by rank and technology; intentionally no geo filter
        query = query.where('rank', '==', rankParam);
        query = query.where('technology', 'in', techArray);

        if (startDate) query = query.where('date', '>=', startDate);
        if (params.end)  query = query.where('date', '<=', params.end);

        // Include geo in the projection so callers can group by geography
        query = query.select('date', 'technology', 'geo', DATA_FIELD);

        const snapshot = await query.get();
        const data = [];
        snapshot.forEach(doc => data.push(doc.data()));

        res.statusCode = 200;
        res.end(JSON.stringify(data));

    } catch (error) {
        handleControllerError(res, error, 'fetching geo breakdown data');
    }
};
