import { getGeosFromBQ } from '../utils/bigquery.js';
import { executeBigQuery } from '../utils/controllerHelpers.js';

/**
 * List all geographic locations from BigQuery
 */
const listGeos = async (req, res) => {
  const queryExecutor = async () => {
    return await getGeosFromBQ();
  };

  await executeBigQuery(req, res, 'geos', queryExecutor);
};

export {
  listGeos
};
